import mongoose from 'mongoose';
import Enrollment from '../models/enrollment.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import notificationService from './notification.service.js';
import emailNotifications from './email-notification.service.js';

const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

const ALLOWED_TRANSITIONS = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [],
  completed: [],
  cancelled: [],
};

const sanitizeEnrollment = (enrollment, options = {}) => {
  const { includeUser = false } = options;
  const courseDoc = enrollment.courseId ?? {};
  const userDoc = enrollment.userId ?? {};

  const payload = {
    id: enrollment._id.toString(),
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    approvedAt: enrollment.approvedAt,
    completedAt: enrollment.completedAt,
    course: courseDoc._id
      ? {
          id: courseDoc._id.toString(),
          title: courseDoc.title,
          slug: courseDoc.slug,
          thumbnail: courseDoc.thumbnail,
          price: courseDoc.price,
        }
      : undefined,
  };

  if (includeUser && userDoc._id) {
    payload.user = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
    };
  }

  return payload;
};

const enrollInCourse = async (userId, courseIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const course = await Course.findOne({
    _id: courseIdInput,
    status: 'published',
  }).lean();

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  const existingActive = await Enrollment.exists({
    userId,
    courseId: courseIdInput,
    activeEnrollment: true,
  });

  if (existingActive) {
    throw new ApiError(409, 'You already have an active enrollment for this course');
  }

  let enrollment;
  try {
    enrollment = await Enrollment.create({ userId, courseId: courseIdInput });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'You already have an active enrollment for this course');
    }
    throw error;
  }

  await enrollment.populate('courseId', 'title slug thumbnail price');

  return { enrollment: sanitizeEnrollment(enrollment) };
};

const getMyEnrollments = async (userId, { page = 1, limit = 10, status }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  const [total, documents] = await Promise.all([
    Enrollment.countDocuments(filter),
    Enrollment.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('courseId', 'title slug thumbnail price')
      .lean(),
  ]);

  return {
    enrollments: documents.map((doc) => sanitizeEnrollment(doc)),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const getEnrollmentById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const enrollment = await Enrollment.findById(id)
    .populate('courseId', 'title slug thumbnail price');

  if (!enrollment) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const isAdmin = requester.role === 'admin' || requester.role === 'superAdmin';

  if (!isAdmin && enrollment.userId.toString() !== requester.id) {
    throw new ApiError(404, 'Enrollment not found');
  }

  return { enrollment: sanitizeEnrollment(enrollment, { includeUser: isAdmin }) };
};

const listEnrollments = async ({ page = 1, limit = 10, status, courseId }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (courseId) {
    filter.courseId = courseId;
  }

  const [total, documents] = await Promise.all([
    Enrollment.countDocuments(filter),
    Enrollment.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('courseId', 'title slug price')
      .populate('userId', 'name email')
      .lean(),
  ]);

  return {
    enrollments: documents.map((doc) =>
      sanitizeEnrollment(
        { ...doc, courseId: doc.courseId },
        { includeUser: Boolean(doc.userId) }
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

const updateEnrollmentStatus = async (id, nextStatus) => {
  if (!ENROLLMENT_STATUSES.includes(nextStatus)) {
    throw new ApiError(400, 'Invalid enrollment status');
  }

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const enrollment = await Enrollment.findById(id);
  if (!enrollment) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const currentStatus = enrollment.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      400,
      `Invalid status transition from ${currentStatus} to ${nextStatus}`
    );
  }

  enrollment.status = nextStatus;
  if (nextStatus === 'approved') {
    enrollment.approvedAt = new Date();
  }
  if (nextStatus === 'completed') {
    enrollment.completedAt = new Date();
  }
  await enrollment.save();

  await enrollment.populate('courseId', 'title slug thumbnail price');

  // Event integration: notify the student when an actual state transition occurs.
  if (nextStatus === 'approved' || nextStatus === 'rejected') {
    await notificationService.notifyEnrollmentStatusChange(enrollment, nextStatus);
    const courseTitle = enrollment.courseId?.title || 'your course';
    await emailNotifications.sendEnrollmentStatusEmails(
      { userId: enrollment.userId._id ?? enrollment.userId, courseId: enrollment.courseId?._id ?? enrollment.courseId },
      nextStatus,
      courseTitle
    );
  }

  return { enrollment: sanitizeEnrollment(enrollment) };
};

const isTransitionAllowed = (fromStatus, toStatus) =>
  (ALLOWED_TRANSITIONS[fromStatus] || []).includes(toStatus);

export { isTransitionAllowed };

export default {
  enrollInCourse,
  getMyEnrollments,
  getEnrollmentById,
  listEnrollments,
  updateEnrollmentStatus,
};
