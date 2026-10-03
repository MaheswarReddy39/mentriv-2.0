import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import McqTest from '../models/mcq.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import ApiError from '../utils/api-error.js';
import { isAdminRole, hasActiveCourseEnrollmentIn } from '../utils/course-access.util.js';
import { normalizeCourseIds } from '../utils/course-ids.util.js';

const MCQ_STATUSES = ['draft', 'published', 'archived'];

const EDITABLE_FIELDS = ['title', 'description', 'questions', 'duration', 'passingScore', 'status'];

const pickEditableFields = (data) => {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      picked[field] = data[field];
    }
  }
  return picked;
};

const sanitizeQuestionForStudent = (question) => ({
  question: question.question,
  options: [...question.options],
  marks: question.marks,
  order: question.order,
});

const toCourseIdStrings = (courseIds) =>
  (Array.isArray(courseIds) ? courseIds : [])
    .filter(Boolean)
    .map((id) => (id?._id ? id._id.toString() : id.toString()));

const sanitizeTestForStudent = (test) => ({
  id: test._id.toString(),
  courseIds: toCourseIdStrings(test.courseIds),
  title: test.title,
  description: test.description,
  duration: test.duration,
  passingScore: test.passingScore,
  questions: test.questions.map(sanitizeQuestionForStudent),
});

const sanitizeTestForAdmin = (test) => ({
  id: test._id.toString(),
  courseIds: toCourseIdStrings(test.courseIds),
  title: test.title,
  description: test.description,
  duration: test.duration,
  passingScore: test.passingScore,
  status: test.status,
  questions: test.questions.map((q) => ({ ...q.toObject ? q.toObject() : q })),
  createdAt: test.createdAt,
});

const isEducatorRole = (role) => isAdminRole(role) || role === 'teacher';

const listTestsForCourse = async (requester, courseIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const educator = isEducatorRole(requester.role);
  const courseExists = await Course.exists({ _id: courseIdInput });
  if (!courseExists) {
    throw new ApiError(404, 'Course not found');
  }

  if (!educator && !(await hasActiveCourseEnrollmentIn(requester.id, [courseIdInput]))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  // Membership query: returns every shared test whose courseIds include this course.
  const filter = { courseIds: courseIdInput };
  if (!educator) {
    filter.status = 'published';
  }

  const documents = await McqTest.find(filter).sort({ createdAt: 1 }).limit(500).lean();

  return {
    mcqTests: educator
      ? documents.map(sanitizeTestForAdmin)
      : documents.map(sanitizeTestForStudent),
    totalItems: documents.length,
  };
};

const getTestById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'MCQ test not found');
  }

  const educator = isEducatorRole(requester.role);

  const query = McqTest.findById(id);
  const test = await (educator ? query : query.select('+questions'));

  if (!test) {
    throw new ApiError(404, 'MCQ test not found');
  }

  if (educator) {
    const attemptsCount = await McqAttempt.countDocuments({ mcqTestId: test._id });
    return { mcqTest: { ...sanitizeTestForAdmin(test), attemptsCount } };
  }

  if (test.status !== 'published') {
    throw new ApiError(404, 'MCQ test not found');
  }

  if (!(await hasActiveCourseEnrollmentIn(requester.id, test.courseIds))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  return { mcqTest: sanitizeTestForStudent(test) };
};

// Single shared document: `courseIds` decides which courses can access it.
const createMcqTest = async (courseIdsInput, data) => {
  const courseIds = await normalizeCourseIds(
    Array.isArray(courseIdsInput) ? courseIdsInput : [courseIdsInput]
  );

  const payload = pickEditableFields(data);

  if (payload.status && !MCQ_STATUSES.includes(payload.status)) {
    throw new ApiError(400, 'Invalid MCQ test status');
  }

  const mcqTest = await McqTest.create({ ...payload, courseIds });

  return { mcqTest: sanitizeTestForAdmin(mcqTest), courseIds };
};

// Creates ONE practice set shared by every selected course.
const createMcqTestsForCourses = async (courseIdsInput, data) => {
  const { mcqTest, courseIds } = await createMcqTest(courseIdsInput, data);

  return { mcqTests: [mcqTest], courseIds };
};

const updateMcqTest = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'MCQ test not found');
  }

  const updates = pickEditableFields(data);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  // Data-integrity rule: never let a modified question set silently invalidate
  // existing attempt records. Question edits are blocked once attempts exist.
  if (updates.questions !== undefined) {
    const attemptsExist = await McqAttempt.exists({ mcqTestId: id });
    if (attemptsExist) {
      throw new ApiError(
        409,
        'Questions cannot be modified because attempt records exist for this test. Archive this test and create a new one.'
      );
    }
  }

  const mcqTest = await McqTest.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!mcqTest) {
    throw new ApiError(404, 'MCQ test not found');
  }

  return { mcqTest: sanitizeTestForAdmin(mcqTest) };
};

const archiveMcqTest = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'MCQ test not found');
  }

  const mcqTest = await McqTest.findByIdAndUpdate(
    id,
    { status: 'archived' },
    { new: true, runValidators: true }
  );

  if (!mcqTest) {
    throw new ApiError(404, 'MCQ test not found');
  }

  return { mcqTest: sanitizeTestForAdmin(mcqTest) };
};

export { sanitizeTestForStudent, sanitizeTestForAdmin };

export default {
  listTestsForCourse,
  getTestById,
  createMcqTest,
  createMcqTestsForCourses,
  updateMcqTest,
  archiveMcqTest,
};
