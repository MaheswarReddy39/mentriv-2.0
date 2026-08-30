import mongoose from 'mongoose';
import Announcement from '../models/announcement.model.js';
import ApiError from '../utils/api-error.js';
import { isAdminRole } from '../utils/course-access.util.js';
import notificationService from './notification.service.js';
import emailNotifications from './email-notification.service.js';

const ANNOUNCEMENT_STATUSES = ['draft', 'published', 'archived'];
const AUDIENCES = ['all', 'students', 'admins'];
const TYPES = ['general', 'class', 'assignment', 'payment', 'system'];

const EDITABLE_FIELDS = ['title', 'content', 'type', 'audience', 'status'];

const pickEditableFields = (data) => {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      picked[field] = data[field];
    }
  }
  return picked;
};

const sanitizeAnnouncement = (announcement, { includeCreator = false } = {}) => {
  const payload = {
    id: announcement._id.toString(),
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    audience: announcement.audience,
    status: announcement.status,
    publishedAt: announcement.publishedAt,
    createdAt: announcement.createdAt,
  };

  if (includeCreator) {
    payload.createdBy = announcement.createdBy.toString();
  }

  return payload;
};

// Visibility rules:
//   anonymous        -> published + audience=all
//   student          -> published + audience in (all, students)
//   admin/superAdmin -> published + audience in (all, admins)
// Admins may additionally pass an explicit status for management queries.
const buildVisibilityFilter = (requester, requestedStatus) => {
  const admin = requester ? isAdminRole(requester.role) : false;

  if (requestedStatus && admin) {
    // Published remains scoped to admin-appropriate audiences; other statuses
    // are pure management queries.
    if (requestedStatus === 'published') {
      return { status: 'published', audience: { $in: ['all', 'admins'] } };
    }
    return { status: requestedStatus };
  }

  if (!requester) {
    return { status: 'published', audience: 'all' };
  }

  if (!admin) {
    return { status: 'published', audience: { $in: ['all', 'students'] } };
  }

  return { status: 'published', audience: { $in: ['all', 'admins'] } };
};

const listAnnouncements = async (requester, { page = 1, limit = 10, type, status }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const admin = requester ? isAdminRole(requester.role) : false;

  const filter = buildVisibilityFilter(requester, admin ? status : undefined);
  if (type) {
    filter.type = type;
  }

  const [total, documents] = await Promise.all([
    Announcement.countDocuments(filter),
    Announcement.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean(),
  ]);

  return {
    announcements: documents.map((doc) =>
      sanitizeAnnouncement(
        { ...doc, _id: doc._id },
        { includeCreator: Boolean(admin && doc.createdBy) }
      )
    ),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const getAnnouncementById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Announcement not found');
  }

  const admin = requester ? isAdminRole(requester.role) : false;

  const query = Announcement.findById(id);
  const announcement = await query;

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  if (admin) {
    return {
      announcement: sanitizeAnnouncement(announcement, { includeCreator: true }),
    };
  }

  if (announcement.status !== 'published') {
    throw new ApiError(404, 'Announcement not found');
  }

  const audienceAllowed =
    !requester || announcement.audience === 'all' || announcement.audience === 'students';

  if (!audienceAllowed) {
    throw new ApiError(404, 'Announcement not found');
  }

  return { announcement: sanitizeAnnouncement(announcement) };
};

const createAnnouncement = async (creator, data) => {
  const payload = pickEditableFields(data);

  if (payload.status && !ANNOUNCEMENT_STATUSES.includes(payload.status)) {
    throw new ApiError(400, 'Invalid announcement status');
  }
  if (
    payload.type &&
    !TYPES.includes(payload.type)
  ) {
    throw new ApiError(400, 'Invalid announcement type');
  }
  if (payload.audience && !AUDIENCES.includes(payload.audience)) {
    throw new ApiError(400, 'Invalid announcement audience');
  }
  if (!payload.title || !String(payload.title).trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (!payload.content || !String(payload.content).trim()) {
    throw new ApiError(400, 'Content is required');
  }

  // Publishing directly on creation is allowed; the timestamp is server-set.
  const publishingImmediately = payload.status === 'published';

  const announcement = await Announcement.create({
    ...payload,
    type: payload.type || 'general',
    audience: payload.audience || 'all',
    status: publishingImmediately ? 'published' : 'draft',
    publishedAt: publishingImmediately ? new Date() : null,
    createdBy: creator.id,
  });

  if (publishingImmediately) {
    await notificationService.notifyAnnouncementPublished(announcement);
  }

  return { announcement: sanitizeAnnouncement(announcement, { includeCreator: true }) };
};

const updateAnnouncement = async (updater, id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Announcement not found');
  }

  const updates = pickEditableFields(data);

  if ('status' in updates && updates.status !== 'published') {
    const current = await Announcement.findById(id).select('status');
    if (current?.status === 'published') {
      throw new ApiError(400, 'Published announcements cannot be reverted to draft');
    }
  }

  const existing = await Announcement.findById(id).select('status publishedAt');
  if (!existing) {
    throw new ApiError(404, 'Announcement not found');
  }

  // Draft -> published transition is performed server-side.
  const transitioningToPublished =
    updates.status === 'published' && existing.status !== 'published';

  if (transitioningToPublished && !('publishedAt' in updates)) {
    updates.publishedAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  const announcement = await Announcement.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  // Event integration: fan-out notifications ONLY on the actual
  // draft/archived -> published transition. Editing an already-published
  // announcement never re-triggers notifications.
  if (transitioningToPublished) {
    await notificationService.notifyAnnouncementPublished(announcement);
    await emailNotifications.sendAnnouncementPublishedEmails(announcement);
  }

  return { announcement: sanitizeAnnouncement(announcement, { includeCreator: true }) };
};

const archiveAnnouncement = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Announcement not found');
  }

  const announcement = await Announcement.findByIdAndUpdate(
    id,
    { status: 'archived' },
    { new: true, runValidators: true }
  );

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found');
  }

  return { announcement: sanitizeAnnouncement(announcement, { includeCreator: true }) };
};

export default {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
};
