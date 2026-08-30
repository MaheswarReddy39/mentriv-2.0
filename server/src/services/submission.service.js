import mongoose from 'mongoose';
import Submission from '../models/submission.model.js';
import Assignment from '../models/assignment.model.js';
import Course from '../models/course.model.js';
import Enrollment from '../models/enrollment.model.js';
import ApiError from '../utils/api-error.js';
import { isAdminRole, hasActiveCourseEnrollment } from '../utils/course-access.util.js';

const COURSE_VISIBLE_FIELDS = 'title slug level status';
const RELEVANT_ENROLLMENT_STATUSES = ['pending', 'approved', 'completed'];

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const sanitizeSubmissionSummary = (submission, { includeStudent = false } = {}) => {
  const assignmentDoc = submission.assignmentId ?? {};
  const studentDoc = submission.studentId ?? {};

  const payload = {
    id: submission._id.toString(),
    attemptNumber: submission.attemptNumber,
    status: submission.status,
    isLate: submission.isLate,
    submittedAt: submission.submittedAt,
    marks: submission.marks,
    feedback: submission.feedback,
    githubRepositoryName: submission.githubRepositoryName,
    githubRepositoryUrl: submission.githubRepositoryUrl,
    reviewedBy: submission.reviewedBy ? submission.reviewedBy.toString() : null,
    reviewedAt: submission.reviewedAt,
  };

  if (assignmentDoc._id) {
    payload.assignment = { id: assignmentDoc._id.toString(), title: assignmentDoc.title };
  }
  if (includeStudent && studentDoc._id) {
    payload.student = {
      id: studentDoc._id.toString(),
      name: studentDoc.name,
      email: studentDoc.email,
    };
  }

  return payload;
};

const sanitizeSubmissionDetail = (submission, { includeStudent = false } = {}) => {
  const courseDoc = submission.courseId ?? {};

  const payload = {
    ...sanitizeSubmissionSummary(submission, { includeStudent }),
    courseId: courseDoc._id ? courseDoc._id.toString() : undefined,
    submissionText: submission.submissionText,
    attachments: submission.attachments,
    githubRepositoryName: submission.githubRepositoryName,
    githubRepositoryUrl: submission.githubRepositoryUrl,
    createdAt: submission.createdAt,
  };

  if (courseDoc._id) {
    payload.course = { id: courseDoc._id.toString(), title: courseDoc.title };
  }

  return payload;
};

const createSubmission = async (requester, assignmentIdInput, data) => {
  if (!mongoose.isValidObjectId(assignmentIdInput)) {
    throw new ApiError(404, 'Assignment not found');
  }

  const assignment = await Assignment.findOne({
    _id: assignmentIdInput,
    status: 'published',
  });

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (
    !(await hasActiveCourseEnrollment(
      requester.id,
      assignment.courseId._id ?? assignment.courseId
    ))
  ) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  if (assignment.assignmentType === 'normalTest') {
    if (!String(data.githubRepositoryName || '').trim()) {
      throw new ApiError(400, 'GitHub repository name is required');
    }
    if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(String(data.githubRepositoryUrl || '').trim())) {
      throw new ApiError(400, 'GitHub repository URL must be a valid GitHub repository URL');
    }
  }

  const duplicateActive = await Submission.findOne({
    studentId: requester.id,
    assignmentId: assignment._id,
    activeSubmission: true,
  });

  if (duplicateActive) {
    throw new ApiError(409, 'You already have an active submission for this assignment');
  }

  const previousAttempt = await Submission.findOne({
    studentId: requester.id,
    assignmentId: assignment._id,
  }).sort('-attemptNumber');

  const attemptNumber = (previousAttempt?.attemptNumber || 0) + 1;

  const isLate =
    Boolean(assignment.dueDate) && new Date().getTime() > assignment.dueDate.getTime();

  const submission = await Submission.create({
    studentId: requester.id,
    assignmentId: assignment._id,
    courseId: assignment.courseId._id ?? assignment.courseId,
    attemptNumber,
    submissionText: data.submissionText ?? '',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    githubRepositoryName: data.githubRepositoryName ?? '',
    githubRepositoryUrl: data.githubRepositoryUrl ?? '',
    isLate,
    status: isLate ? 'late' : 'submitted',
  });

  await submission.populate('assignmentId', 'title maxMarks');
  await submission.populate('courseId', 'title');

  return { submission: sanitizeSubmissionDetail(submission) };
};

const getMySubmissions = async (userId, { page = 1, limit = 10, status, assignmentId }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = { studentId: userId };
  if (status) {
    filter.status = status;
  }
  if (assignmentId) {
    filter.assignmentId = assignmentId;
  }

  const [total, documents] = await Promise.all([
    Submission.countDocuments(filter),
    Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('assignmentId', 'title')
      .lean(),
  ]);

  return {
    submissions: documents.map((doc) => sanitizeSubmissionSummary(doc)),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const getSubmissionById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Submission not found');
  }

  const admin = isAdminRole(requester.role);

  const query = Submission.findById(id).populate('assignmentId', 'title maxMarks').populate(
    'courseId',
    'title'
  );

  if (admin) {
    query.populate('studentId', 'name email');
  }

  const submission = await query;

  if (!submission) {
    throw new ApiError(404, 'Submission not found');
  }

  if (!admin && submission.studentId._id.toString() !== requester.id) {
    throw new ApiError(404, 'Submission not found');
  }

  return {
    submission: sanitizeSubmissionDetail(submission, { includeStudent: admin }),
  };
};

const listSubmissions = async ({ page = 1, limit = 10, status, courseId, assignmentId, studentId }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (courseId) {
    filter.courseId = courseId;
  }
  if (assignmentId) {
    filter.assignmentId = assignmentId;
  }
  if (studentId) {
    filter.studentId = studentId;
  }

  const [total, documents] = await Promise.all([
    Submission.countDocuments(filter),
    Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('assignmentId', 'title maxMarks')
      .populate('studentId', 'name email')
      .lean(),
  ]);

  return {
    submissions: documents.map((doc) =>
      sanitizeSubmissionSummary(doc, { includeStudent: Boolean(doc.studentId?._id) })
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

const listAdminSubmissionOverview = async ({ search = '', courseId = 'all', level = 'all' } = {}) => {
  const selectedCourseId = normalize(courseId);
  const selectedLevel = normalize(level);

  if (selectedCourseId && selectedCourseId !== 'all' && !mongoose.isValidObjectId(selectedCourseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  if (selectedLevel && selectedLevel !== 'all' && !['basic', 'intermediate', 'advanced'].includes(selectedLevel)) {
    throw new ApiError(400, 'Invalid course level');
  }

  const [totalSubmissions, courses, enrollments, assignmentCounts, submissions] =
    await Promise.all([
      Submission.countDocuments({}),
      Course.find({}).select(COURSE_VISIBLE_FIELDS).sort({ title: 1 }).lean(),
      Enrollment.find({ status: { $in: RELEVANT_ENROLLMENT_STATUSES } })
        .populate('userId', 'name email phone status')
        .populate('courseId', COURSE_VISIBLE_FIELDS)
        .lean(),
      Assignment.aggregate([
        { $group: { _id: '$courseId', totalAssignments: { $sum: 1 } } },
      ]),
      Submission.find({})
        .select('studentId courseId assignmentId status')
        .lean(),
    ]);

  const assignmentCountByCourse = new Map(
    assignmentCounts.map((item) => [item._id.toString(), item.totalAssignments])
  );

  const submittedAssignmentsByStudentCourse = new Map();
  submissions.forEach((submission) => {
    const key = `${submission.studentId.toString()}:${submission.courseId.toString()}`;
    const assignmentSet = submittedAssignmentsByStudentCourse.get(key) || new Set();
    assignmentSet.add(submission.assignmentId.toString());
    submittedAssignmentsByStudentCourse.set(key, assignmentSet);
  });

  const searchTerm = normalize(search);
  const relevantEnrollments = enrollments
    .filter((enrollment) => enrollment.userId?._id && enrollment.courseId?._id)
    .map((enrollment) => {
      const student = enrollment.userId;
      const course = enrollment.courseId;
      const studentId = student._id.toString();
      const courseIdValue = course._id.toString();
      const totalAssignments = assignmentCountByCourse.get(courseIdValue) || 0;
      const submittedCount =
        submittedAssignmentsByStudentCourse.get(`${studentId}:${courseIdValue}`)?.size || 0;
      const pendingCount = Math.max(totalAssignments - submittedCount, 0);
      const progress = totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0;

      return {
        id: `${studentId}-${courseIdValue}`,
        student: {
          id: studentId,
          name: student.name,
          email: student.email,
          phone: student.phone,
        },
        course: {
          id: courseIdValue,
          title: course.title,
          slug: course.slug,
          level: course.level,
        },
        progress,
        submittedCount,
        totalAssignments,
        pendingCount,
        status: submittedCount > 0 && pendingCount === 0 ? 'submitted' : 'pending',
      };
    });

  const totalStudents = new Set(relevantEnrollments.map((row) => row.student.id)).size;
  const pendingSubmissions = relevantEnrollments.reduce(
    (total, row) => total + row.pendingCount,
    0
  );

  const rows = relevantEnrollments.filter((row) => {
      const courseMatches =
        !selectedCourseId ||
        selectedCourseId === 'all' ||
        row.course.id === selectedCourseId;

      const levelMatches =
        !selectedLevel ||
        selectedLevel === 'all' ||
        row.course.level === selectedLevel;

      const searchable = [
        row.student.name,
        row.student.email,
        row.student.phone,
        row.course.title,
        row.course.level,
        row.status,
      ]
        .join(' ')
        .toLowerCase();

      return courseMatches && levelMatches && (!searchTerm || searchable.includes(searchTerm));
    });

  return {
    totalStudents,
    totalSubmissions,
    pendingSubmissions,
    rows,
    courses: courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      level: course.level,
      status: course.status,
    })),
  };
};

const reviewSubmission = async (reviewerId, id, { marks, feedback }) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Submission not found');
  }

  const submission = await Submission.findById(id).populate('assignmentId', 'title maxMarks');

  if (!submission) {
    throw new ApiError(404, 'Submission not found');
  }

  if (submission.status === 'reviewed') {
    throw new ApiError(409, 'This submission has already been reviewed');
  }

  const numericMarks = Number(marks);
  if (!Number.isFinite(numericMarks) || numericMarks < 0) {
    throw new ApiError(400, 'Marks must be a non-negative number');
  }

  const maxMarks = submission.assignmentId?.maxMarks;
  if (Number.isFinite(maxMarks) && maxMarks > 0 && numericMarks > maxMarks) {
    throw new ApiError(400, `Marks cannot exceed the assignment maximum of ${maxMarks}`);
  }

  submission.marks = numericMarks;
  submission.feedback = typeof feedback === 'string' ? feedback.trim() : '';
  submission.status = 'reviewed';
  submission.reviewedBy = reviewerId;
  submission.reviewedAt = new Date();
  await submission.save();

  await submission.populate([
    { path: 'assignmentId', select: 'title maxMarks' },
    { path: 'courseId', select: 'title' },
  ]);

  return { submission: sanitizeSubmissionDetail(submission) };
};

export default {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  listSubmissions,
  listAdminSubmissionOverview,
  reviewSubmission,
};
