import mongoose from 'mongoose';
import Assignment from '../models/assignment.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import {
  isAdminRole,
  hasActiveCourseEnrollmentIn,
  findActiveCourseIn,
} from '../utils/course-access.util.js';
import { normalizeCourseIds } from '../utils/course-ids.util.js';
import notificationService from './notification.service.js';
import emailNotifications from './email-notification.service.js';

const ASSIGNMENT_STATUSES = ['draft', 'published', 'archived'];

const EDITABLE_FIELDS = [
  'title',
  'assignmentType',
  'description',
  'instructions',
  'dueDate',
  'duration',
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
  if (picked.duration !== undefined && picked.duration !== null && picked.duration !== '') {
    picked.duration = Number(picked.duration);
  } else if (picked.duration === '') {
    picked.duration = null;
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
    duration: assignment.duration ?? null,
  };
  if (includeStatus) {
    payload.status = assignment.status;
  }
  return payload;
};

// `courseIds` holds raw ids or populated Course docs depending on the query.
const toCourseList = (courseIds) =>
  (Array.isArray(courseIds) ? courseIds : [])
    .filter(Boolean)
    .map((course) =>
      course._id
        ? { id: course._id.toString(), title: course.title || '', slug: course.slug || '' }
        : { id: String(course), title: '', slug: '' }
    );

const sanitizeAssignmentDetail = (assignment, { primaryCourseId = null } = {}) => {
  const courses = toCourseList(assignment.courseIds);
  return {
    id: assignment._id.toString(),
    courseIds: courses.map((course) => course.id),
    courses,
    primaryCourseId: primaryCourseId || courses[0]?.id || null,
    title: assignment.title,
    assignmentType: assignment.assignmentType,
    description: assignment.description,
    instructions: assignment.instructions,
    dueDate: assignment.dueDate,
    duration: assignment.duration ?? null,
    maxMarks: assignment.maxMarks,
    attachments: assignment.attachments,
    status: assignment.status,
    createdAt: assignment.createdAt,
  };
};

const assertCourseExists = async (courseId) => {
  const courseExists = await Course.exists({ _id: courseId });
  if (!courseExists) {
    throw new ApiError(404, 'Course not found');
  }
};

// Shared documents: access is granted when the requester is an admin or is
// actively enrolled in ANY of the document's courses.
const assertCanAccessCourseContent = async (requester, courseIds) => {
  if (isAdminRole(requester.role)) {
    return;
  }

  if (!(await hasActiveCourseEnrollmentIn(requester.id, courseIds))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }
};

const notifyCourseStudents = (courseId, assignment, courseTitle) => {
  notificationService.notifyCourseStudents({
    courseId,
    type: 'assignment',
    title: 'New assignment available',
    message: `A new assignment "${assignment.title}" is now available.`,
    link: `/assignments/${assignment._id.toString()}`,
  }).catch(() => {});

  emailNotifications.sendAssignmentPublishedEmails({
    courseId,
    courseTitle: courseTitle || 'the course',
    assignmentTitle: assignment.title,
    assignmentId: assignment._id.toString(),
  }).catch(() => {});
};

const listAssignmentsForCourse = async (requester, courseIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const admin = isAdminRole(requester.role);

  await assertCourseExists(courseIdInput);
  await assertCanAccessCourseContent(requester, [courseIdInput]);

  // Membership query: returns every shared assignment covering this course.
  const filter = { courseIds: courseIdInput };
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

  const assignment = await Assignment.findById(id).populate('courseIds', 'title slug');
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  const courses = toCourseList(assignment.courseIds);

  if (admin) {
    return { assignment: sanitizeAssignmentDetail(assignment) };
  }

  if (assignment.status !== 'published') {
    throw new ApiError(404, 'Assignment not found');
  }

  await assertCanAccessCourseContent(requester, courses.map((course) => course.id));

  // Back-link / attempt context follows a course the student is enrolled in.
  const primaryCourseId =
    (await findActiveCourseIn(requester.id, courses.map((course) => course.id))) ||
    courses[0]?.id ||
    null;

  return { assignment: sanitizeAssignmentDetail(assignment, { primaryCourseId }) };
};

// Creates ONE assignment shared by every course in `courseIdsInput`.
const createAssignment = async (courseIdsInput, data, requester = null) => {
  const courseIds = await normalizeCourseIds(
    Array.isArray(courseIdsInput) ? courseIdsInput : [courseIdsInput]
  );

  for (const courseId of courseIds) {
    // eslint-disable-next-line no-await-in-loop
    await assertCourseExists(courseId);
  }

  const payload = pickEditableFields(data);
  payload.assignmentType = payload.assignmentType || 'normalTest';
  if (!payload.status && requester?.role === 'teacher') {
    payload.status = 'published';
  }

  if (payload.status && !ASSIGNMENT_STATUSES.includes(payload.status)) {
    throw new ApiError(400, 'Invalid assignment status');
  }

  const assignment = await Assignment.create({ ...payload, courseIds });
  await assignment.populate('courseIds', 'title slug');

  if (assignment.status === 'published') {
    toCourseList(assignment.courseIds).forEach((course) => {
      notifyCourseStudents(course.id, assignment, course.title);
    });
  }

  return { assignment: sanitizeAssignmentDetail(assignment) };
};

const createAssignmentsForCourses = async (courseIdsInput, data, requester = null) => {
  const courseIds = await normalizeCourseIds(courseIdsInput);

  const { assignment } = await createAssignment(courseIds, data, requester);

  return { assignments: [assignment], courseIds };
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
  }).populate('courseIds', 'title slug');

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  // Event integration: notify only on an actual transition into published.
  if (
    updates.status === 'published' &&
    previousStatus !== 'published'
  ) {
    toCourseList(assignment.courseIds).forEach((course) => {
      notificationService.notifyCourseStudents({
        courseId: course.id,
        type: 'assignment',
        title: 'New assignment available',
        message: `A new assignment "${assignment.title}" is now available.`,
        link: `/assignments/${assignment._id.toString()}`,
      }).catch(() => {});
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
  ).populate('courseIds', 'title slug');

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  return { assignment: sanitizeAssignmentDetail(assignment) };
};

export default {
  listAssignmentsForCourse,
  getAssignmentById,
  createAssignment,
  createAssignmentsForCourses,
  updateAssignment,
  archiveAssignment,
};
