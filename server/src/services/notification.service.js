import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import Enrollment from '../models/enrollment.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';

const RECIPIENT_ROLES = ['student', 'teacher', 'admin', 'superAdmin'];
const NOTIFICATION_TYPES = [
  'class',
  'assignment',
  'payment',
  'enrollment',
  'announcement',
  'system',
];
const ADMIN_AUDIENCES = ['all', 'students', 'teachers'];
const ACTIVE_USER_STATUSES = ['active', 'accepted'];
const ACTIVE_ENROLLMENT_STATUSES = ['approved', 'completed'];

const sanitizeNotification = (notification) => ({
  id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  link: notification.link,
  isRead: notification.isRead,
  audience: notification.audience,
  courseId: notification.courseId?._id
    ? notification.courseId._id.toString()
    : notification.courseId?.toString?.() || null,
  course: notification.courseId?._id
    ? {
        id: notification.courseId._id.toString(),
        title: notification.courseId.title,
      }
    : undefined,
  createdAt: notification.createdAt,
});

const sanitizeAdminNotification = (notification) => ({
  id: notification.batchId?.toString?.() || notification._id.toString(),
  title: notification.title,
  message: notification.message,
  audience: notification.audience,
  type: notification.type,
  courseId: notification.courseId?._id
    ? notification.courseId._id.toString()
    : notification.courseId?.toString?.() || null,
  course: notification.courseId?._id
    ? {
        id: notification.courseId._id.toString(),
        title: notification.courseId.title,
      }
    : undefined,
  createdAt: notification.createdAt,
});

export const validateNotificationInput = ({
  recipientId,
  recipientRole,
  type,
  title,
  message,
  link,
}) => {
  if (!mongoose.isValidObjectId(recipientId)) {
    throw new ApiError(400, 'Invalid notification recipient');
  }
  if (!RECIPIENT_ROLES.includes(recipientRole)) {
    throw new ApiError(400, 'Invalid recipient role');
  }
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new ApiError(400, 'Invalid notification type');
  }

  const trimmedTitle = String(title ?? '').trim();
  const trimmedMessage = String(message ?? '').trim();

  if (!trimmedTitle || trimmedTitle.length > 150) {
    throw new ApiError(400, 'Notification title must be between 1 and 150 characters');
  }
  if (!trimmedMessage || trimmedMessage.length > 1000) {
    throw new ApiError(400, 'Notification message must be between 1 and 1000 characters');
  }

  let safeLink = '';
  if (link !== undefined && link !== null && link !== '') {
    safeLink = String(link).trim();
    if (/\s/.test(safeLink) || safeLink.length > 2048) {
      throw new ApiError(400, 'Notification link is invalid');
    }
  }

  return {
    recipientId,
    recipientRole,
    type,
    title: trimmedTitle,
    message: trimmedMessage,
    link: safeLink,
  };
};

const createNotification = async ({
  recipientId,
  recipientRole,
  type,
  title,
  message,
  link,
  audience,
  courseId,
  createdBy,
  batchId,
}) => {
  const recipientExists = await User.exists({ _id: recipientId });
  if (!recipientExists) {
    throw new ApiError(404, 'Recipient user does not exist');
  }

  const validated = validateNotificationInput({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    link,
  });

  // New notifications always start unread; isRead is never accepted from callers.
  const notification = await Notification.create(validated);
  if (audience !== undefined) notification.audience = audience;
  if (courseId !== undefined) notification.courseId = courseId || null;
  if (createdBy !== undefined) notification.createdBy = createdBy || null;
  if (batchId !== undefined) notification.batchId = batchId || null;
  if (audience !== undefined || courseId !== undefined || createdBy !== undefined || batchId !== undefined) {
    await notification.save();
  }
  return sanitizeNotification(notification);
};

const getRecipientsForAdminNotification = async ({ audience, courseId }) => {
  const roleFilter =
    audience === 'students'
      ? ['student']
      : audience === 'teachers'
        ? ['teacher']
        : ['student', 'teacher'];

  if (courseId) {
    const recipients = [];

    if (roleFilter.includes('student')) {
      const enrollments = await Enrollment.find({
        courseId,
        status: { $in: ACTIVE_ENROLLMENT_STATUSES },
      }).select('userId').lean();
      const studentIds = enrollments.map((enrollment) => enrollment.userId);
      const students = await User.find({
        _id: { $in: studentIds },
        role: 'student',
        status: { $in: ACTIVE_USER_STATUSES },
        accountActivated: true,
      }).select('_id role').lean();
      recipients.push(...students);
    }

    if (roleFilter.includes('teacher')) {
      const teachers = await User.find({
        role: 'teacher',
        selectedCourseId: courseId,
        status: { $in: ACTIVE_USER_STATUSES },
        accountActivated: true,
      }).select('_id role').lean();
      recipients.push(...teachers);
    }

    return recipients;
  }

  return User.find({
    role: { $in: roleFilter },
    status: { $in: ACTIVE_USER_STATUSES },
    accountActivated: true,
  }).select('_id role').lean();
};

const createAdminNotification = async (requester, { title, message, audience = 'all', courseId }) => {
  const safeAudience = String(audience || 'all').trim().toLowerCase();
  if (!ADMIN_AUDIENCES.includes(safeAudience)) {
    throw new ApiError(400, 'Invalid notification audience');
  }

  const trimmedTitle = String(title ?? '').trim();
  const trimmedMessage = String(message ?? '').trim();
  if (!trimmedTitle || trimmedTitle.length > 150) {
    throw new ApiError(400, 'Notification title must be between 1 and 150 characters');
  }
  if (!trimmedMessage || trimmedMessage.length > 1000) {
    throw new ApiError(400, 'Notification message must be between 1 and 1000 characters');
  }

  let safeCourseId = null;
  if (courseId) {
    if (!mongoose.isValidObjectId(courseId)) {
      throw new ApiError(400, 'Invalid course id');
    }
    const courseExists = await Course.exists({ _id: courseId, status: { $ne: 'archived' } });
    if (!courseExists) {
      throw new ApiError(404, 'Course not found');
    }
    safeCourseId = courseId;
  }

  const recipients = await getRecipientsForAdminNotification({
    audience: safeAudience,
    courseId: safeCourseId,
  });
  const uniqueRecipients = Array.from(
    new Map(recipients.map((recipient) => [recipient._id.toString(), recipient])).values()
  );
  const batchId = new mongoose.Types.ObjectId();

  if (uniqueRecipients.length > 0) {
    await Notification.insertMany(
      uniqueRecipients.map((recipient) => ({
        recipientId: recipient._id,
        recipientRole: recipient.role,
        type: 'system',
        title: trimmedTitle,
        message: trimmedMessage,
        link: '',
        audience: safeAudience,
        courseId: safeCourseId,
        createdBy: requester.id,
        batchId,
      }))
    );
  }

  return {
    notification: {
      id: batchId.toString(),
      title: trimmedTitle,
      message: trimmedMessage,
      audience: safeAudience,
      type: 'system',
      courseId: safeCourseId,
      createdAt: new Date(),
      recipientCount: uniqueRecipients.length,
    },
  };
};

const safelyNotify = async (fn) => {
  try {
    await fn();
  } catch (error) {
    console.warn(`[notifications] delivery skipped: ${error.message}`);
  }
};

const notifyEnrollmentStatusChange = async (enrollment, newStatus) => {
  if (newStatus !== 'approved' && newStatus !== 'rejected') {
    return;
  }

  await safelyNotify(async () => {
    await enrollment.populate('courseId', 'title');
    const courseTitle = enrollment.courseId?.title || 'a course';
    const approved = newStatus === 'approved';

    await createNotification({
      recipientId: enrollment.userId,
      recipientRole: 'student',
      type: 'enrollment',
      title: approved ? 'Enrollment approved' : 'Enrollment update',
      message: approved
        ? `Your enrollment for "${courseTitle}" has been approved. You can start learning now.`
        : `Your enrollment request for "${courseTitle}" was not approved.`,
      link: `/courses/${enrollment.courseId._id ?? enrollment.courseId}`,
    });
  });
};

const notifyPaymentStatusChange = async (payment, newStatus) => {
  if (newStatus !== 'verified' && newStatus !== 'rejected') {
    return;
  }

  await safelyNotify(async () => {
    await payment.populate('courseId', 'title');
    const courseTitle = payment.courseId?.title || 'a course';
    const verified = newStatus === 'verified';

    let message = verified
      ? `Your payment of ${payment.currency} ${payment.amount} for "${courseTitle}" has been verified.`
      : `Your payment for "${courseTitle}" was rejected. Reason: ${payment.rejectionReason}`;

    await createNotification({
      recipientId: payment.userId,
      recipientRole: 'student',
      type: 'payment',
      title: verified ? 'Payment verified' : 'Payment rejected',
      message: message.slice(0, 1000),
      link: `/payments/${payment._id.toString()}`,
    });
  });
};

const notifyCourseStudents = async ({ courseId, type, title, message, link }) => {
  await safelyNotify(async () => {
    const students = await Enrollment.find({
      courseId,
      status: { $in: ['approved', 'completed'] },
    }).select('userId');

    if (students.length === 0) {
      return;
    }

    const docs = students.map((enrollment) => ({
      recipientId: enrollment.userId,
      recipientRole: 'student',
      type,
      title: String(title).slice(0, 150),
      message: String(message).slice(0, 1000),
      link: link || '',
    }));

    await Notification.insertMany(docs);
  });
};

const listNotifications = async (userId, { page = 1, limit = 10, isRead, type }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  // HTTP layers may deliver isRead as a string ('true'/'false'); normalize here.
  let normalizedIsRead;
  if (typeof isRead === 'boolean') {
    normalizedIsRead = isRead;
  } else if (isRead === 'true') {
    normalizedIsRead = true;
  } else if (isRead === 'false') {
    normalizedIsRead = false;
  }

  const filter = { recipientId: userId };
  if (typeof normalizedIsRead === 'boolean') {
    filter.isRead = normalizedIsRead;
  }
  if (type) {
    filter.type = type;
  }

  const [total, documents] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean(),
  ]);

  return {
    notifications: documents.map((doc) =>
      sanitizeNotification({ ...doc, _id: doc._id })
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

const listAdminNotifications = async ({ page = 1, limit = 20 } = {}) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const pipeline = [
    { $match: { createdBy: { $ne: null }, batchId: { $ne: null } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$batchId',
        doc: { $first: '$$ROOT' },
      },
    },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { createdAt: -1 } },
  ];

  const [totalGroups, documents] = await Promise.all([
    Notification.aggregate([...pipeline, { $count: 'total' }]),
    Notification.aggregate([
      ...pipeline,
      { $skip: (pageNumber - 1) * limitNumber },
      { $limit: limitNumber },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'courseDocs',
        },
      },
      {
        $addFields: {
          courseId: { $arrayElemAt: ['$courseDocs', 0] },
        },
      },
      { $project: { courseDocs: 0 } },
    ]),
  ]);

  const total = totalGroups[0]?.total || 0;
  return {
    notifications: documents.map((doc) => sanitizeAdminNotification({ ...doc, _id: doc._id })),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const getUnreadCount = async (userId) => {
  const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });
  return { unreadCount };
};

const markNotificationRead = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Notification not found');
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipientId: userId },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return { notification: sanitizeNotification(notification) };
};

const markAllNotificationsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return { modifiedCount: result.modifiedCount };
};

const notifyAnnouncementPublished = async (announcement) => {
  await safelyNotify(async () => {
    const audienceRoles =
      announcement.audience === 'students'
        ? ['student']
        : announcement.audience === 'admins'
          ? ['admin', 'superAdmin']
          : ['student', 'admin', 'superAdmin'];

    const recipients = await User.find({
      role: { $in: audienceRoles },
      status: 'active',
      accountActivated: true,
    }).select('_id role');

    if (recipients.length === 0) {
      return;
    }

    const docs = recipients.map((user) => ({
      recipientId: user._id,
      recipientRole: user.role,
      type: 'announcement',
      title: `Announcement: ${announcement.title}`.slice(0, 150),
      message: `New announcement published - ${announcement.content}`.slice(0, 1000),
      link: `/announcements/${announcement._id.toString()}`,
    }));

    await Notification.insertMany(docs);
  });
};

export default {
  createNotification,
  createAdminNotification,
  notifyEnrollmentStatusChange,
  notifyPaymentStatusChange,
  notifyCourseStudents,
  notifyAnnouncementPublished,
  listNotifications,
  listAdminNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
