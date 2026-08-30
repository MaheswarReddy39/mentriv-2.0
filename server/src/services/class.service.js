import mongoose from 'mongoose';
import ClassModel from '../models/class.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import { isAdminRole, hasActiveCourseEnrollment } from '../utils/course-access.util.js';
import notificationService from './notification.service.js';
import emailNotifications from './email-notification.service.js';

const LESSON_STATUSES = ['draft', 'published', 'archived'];

const EDITABLE_FIELDS = [
  'title',
  'description',
  'videoUrl',
  'duration',
  'module',
  'order',
  'resources',
  'status',
];

const pickEditableFields = (data) => {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      picked[field] = data[field];
    }
  }
  return picked;
};

const sanitizeLessonSummary = (lesson, { includeStatus = false } = {}) => {
  const payload = {
    id: lesson._id.toString(),
    title: lesson.title,
    module: lesson.module,
    order: lesson.order,
    duration: lesson.duration,
    videoUrl: lesson.videoUrl,
    resources: lesson.resources,
  };
  if (includeStatus) {
    payload.status = lesson.status;
  }
  return payload;
};

const sanitizeLessonDetail = (lesson, { includeStatus = true } = {}) => ({
  id: lesson._id.toString(),
  courseId: lesson.courseId._id ? lesson.courseId._id.toString() : lesson.courseId.toString(),
  title: lesson.title,
  description: lesson.description,
  videoUrl: lesson.videoUrl,
  duration: lesson.duration,
  module: lesson.module,
  order: lesson.order,
  resources: lesson.resources,
  ...(includeStatus ? { status: lesson.status } : {}),
  createdAt: lesson.createdAt,
});

const assertCourseExists = async (courseId) => {
  const courseExists = await Course.exists({ _id: courseId });
  if (!courseExists) {
    throw new ApiError(404, 'Course not found');
  }
};

const assertCanAccessCourseLessons = async (requester, courseId) => {
  await assertCourseExists(courseId);

  if (isAdminRole(requester.role)) {
    return;
  }

  const hasAccess = await hasActiveCourseEnrollment(requester.id, courseId);
  if (!hasAccess) {
    throw new ApiError(403, 'You do not have active access to this course');
  }
};

const listLessonsForCourse = async (requester, courseIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const admin = isAdminRole(requester.role);

  if (admin) {
    await assertCourseExists(courseIdInput);
  } else {
    await assertCanAccessCourseLessons(requester, courseIdInput);
  }

  const filter = { courseId: courseIdInput };
  if (!admin) {
    filter.status = 'published';
  }

  const documents = await ClassModel.find(filter)
    .sort({ module: 1, order: 1, createdAt: 1 })
    .limit(500)
    .lean();

  return {
    lessons: documents.map((doc) => sanitizeLessonSummary(doc, { includeStatus: admin })),
    totalItems: documents.length,
  };
};

const getLessonById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Lesson not found');
  }

  const admin = isAdminRole(requester.role);

  const lesson = await ClassModel.findById(id).populate('courseId', 'title slug');
  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  if (admin) {
    return { lesson: sanitizeLessonDetail(lesson) };
  }

  if (lesson.status !== 'published') {
    throw new ApiError(404, 'Lesson not found');
  }

  const hasAccess = await hasActiveCourseEnrollment(requester.id, lesson.courseId._id);
  if (!hasAccess) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  return { lesson: sanitizeLessonDetail(lesson, { includeStatus: false }) };
};

const createLesson = async (courseIdInput, data) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  await assertCourseExists(courseIdInput);

  const payload = pickEditableFields(data);
  payload.status = payload.status || 'published';

  if (payload.status && !LESSON_STATUSES.includes(payload.status)) {
    throw new ApiError(400, 'Invalid lesson status');
  }

  const lesson = await ClassModel.create({ ...payload, courseId: courseIdInput });
  await lesson.populate('courseId', 'title slug');

  // Event integration: notify enrolled students when a lesson is published.
  if (lesson.status === 'published') {
    await notificationService.notifyCourseStudents({
      courseId: courseIdInput,
      type: 'class',
      title: 'New lesson available',
      message: `A new lesson "${lesson.title}" is now available.`,
      link: `/classes/${lesson._id.toString()}`,
    });
    await emailNotifications.sendClassPublishedEmails({
      courseId: courseIdInput,
      courseTitle: lesson.courseId?.title || 'the course',
      lessonTitle: lesson.title,
    });
  }

  return { lesson: sanitizeLessonDetail(lesson) };
};

const updateLesson = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Lesson not found');
  }

  const updates = pickEditableFields(data);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  const previousStatus = (await ClassModel.findById(id)?.select('status'))?.status;
  const lesson = await ClassModel.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).populate('courseId', 'title slug');

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  // Event integration: notify only on an actual transition into published.
  if (
    updates.status === 'published' &&
    previousStatus !== 'published'
  ) {
    await notificationService.notifyCourseStudents({
      courseId: lesson.courseId._id.toString(),
      type: 'class',
      title: 'New lesson available',
      message: `A new lesson "${lesson.title}" is now available.`,
      link: `/classes/${lesson._id.toString()}`,
    });
    await emailNotifications.sendClassPublishedEmails({
      courseId: lesson.courseId._id.toString(),
      courseTitle: lesson.courseId?.title || 'the course',
      lessonTitle: lesson.title,
    });
  }

  return { lesson: sanitizeLessonDetail(lesson) };
};

const archiveLesson = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Lesson not found');
  }

  const lesson = await ClassModel.findByIdAndUpdate(
    id,
    { status: 'archived' },
    { new: true, runValidators: true }
  ).populate('courseId', 'title slug');

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  return { lesson: sanitizeLessonDetail(lesson) };
};

export default {
  listLessonsForCourse,
  getLessonById,
  createLesson,
  updateLesson,
  archiveLesson,
};
