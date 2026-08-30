import mongoose from 'mongoose';
import Assignment from '../models/assignment.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import { isAdminRole, hasActiveCourseEnrollment } from '../utils/course-access.util.js';
import notificationService from './notification.service.js';
import emailNotifications from './email-notification.service.js';

const ASSIGNMENT_STATUSES = ['draft', 'published', 'archived'];

const EDITABLE_FIELDS = [
  'title',
  'assignmentType',
  'description',
  'instructions',
  'dueDate',
  'maxMarks',
  'attachments',
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

const sanitizeAssignmentSummary = (assignment, { includeStatus = false } = {}) => {
  const payload = {
    id: assignment._id.toString(),
    title: assignment.title,
    assignmentType: assignment.assignmentType,
    maxMarks: assignment.maxMarks,
    dueDate: assignment.dueDate,
  };
  if (includeStatus) {
    payload.status = assignment.status;
  }
  return payload;
};

const sanitizeAssignmentDetail = (assignment) => ({
  id: assignment._id.toString(),
  courseId: assignment.courseId._id ? assignment.courseId._id.toString() : assignment.courseId.toString(),
  title: assignment.title,
  assignmentType: assignment.assignmentType,
  description: assignment.description,
  instructions: assignment.instructions,
  dueDate: assignment.dueDate,
  maxMarks: assignment.maxMarks,
  attachments: assignment.attachments,
  status: assignment.status,
  createdAt: assignment.createdAt,
});

const assertCanAccessCourseAssignments = async (requester, courseId) => {
  const courseExists = await Course.exists({ _id: courseId });
  if (!courseExists) {
    throw new ApiError(404, 'Course not found');
  }

  if (isAdminRole(requester.role)) {
    return;
  }

  if (!(await hasActiveCourseEnrollment(requester.id, courseId))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }
};

const listAssignmentsForCourse = async (requester, courseIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const admin = isAdminRole(requester.role);

  await assertCanAccessCourseAssignments(requester, courseIdInput);

  const filter = { courseId: courseIdInput };
  if (!admin) {
    filter.status = 'published';
  }

  const documents = await Assignment.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return {
    assignments: documents.map((doc) =>
      sanitizeAssignmentSummary(doc, { includeStatus: admin })
    ),
    totalItems: documents.length,
  };
};

const getAssignmentById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Assignment not found');
  }

  const admin = isAdminRole(requester.role);

  const assignment = await Assignment.findById(id).populate('courseId', 'title slug');
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (admin) {
    return { assignment: sanitizeAssignmentDetail(assignment) };
  }

  if (assignment.status !== 'published') {
    throw new ApiError(404, 'Assignment not found');
  }

  if (!(await hasActiveCourseEnrollment(requester.id, assignment.courseId._id))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  return { assignment: sanitizeAssignmentDetail(assignment) };
};

const createAssignment = async (courseIdInput, data, requester = null) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const courseExists = await Course.exists({ _id: courseIdInput });
  if (!courseExists) {
    throw new ApiError(404, 'Course not found');
  }

  const payload = pickEditableFields(data);
  payload.assignmentType = payload.assignmentType || 'normalTest';
  if (!payload.status && requester?.role === 'teacher') {
    payload.status = 'published';
  }

  if (payload.status && !ASSIGNMENT_STATUSES.includes(payload.status)) {
    throw new ApiError(400, 'Invalid assignment status');
  }

  const assignment = await Assignment.create({ ...payload, courseId: courseIdInput });
  await assignment.populate('courseId', 'title slug');

  if (assignment.status === 'published') {
    await notificationService.notifyCourseStudents({
      courseId: courseIdInput,
      type: 'assignment',
      title: 'New assignment available',
      message: `A new assignment "${assignment.title}" is now available.`,
      link: `/assignments/${assignment._id.toString()}`,
    });
    await emailNotifications.sendAssignmentPublishedEmails({
      courseId: courseIdInput,
      courseTitle: assignment.courseId?.title || 'the course',
      assignmentTitle: assignment.title,
      assignmentId: assignment._id.toString(),
    });
  }

  return { assignment: sanitizeAssignmentDetail(assignment) };
};

const updateAssignment = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Assignment not found');
  }

  const updates = pickEditableFields(data);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  const previousStatus = (await Assignment.findById(id)?.select('status'))?.status;
  const assignment = await Assignment.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).populate('courseId', 'title slug');

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  // Event integration: notify only on an actual transition into published.
  if (
    updates.status === 'published' &&
    previousStatus !== 'published'
  ) {
    await notificationService.notifyCourseStudents({
      courseId: assignment.courseId._id.toString(),
      type: 'assignment',
      title: 'New assignment available',
      message: `A new assignment "${assignment.title}" is now available.`,
      link: `/assignments/${assignment._id.toString()}`,
    });
  }

  return { assignment: sanitizeAssignmentDetail(assignment) };
};

const archiveAssignment = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Assignment not found');
  }

  const assignment = await Assignment.findByIdAndUpdate(
    id,
    { status: 'archived' },
    { new: true, runValidators: true }
  ).populate('courseId', 'title slug');

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  return { assignment: sanitizeAssignmentDetail(assignment) };
};

export default {
  listAssignmentsForCourse,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  archiveAssignment,
};
