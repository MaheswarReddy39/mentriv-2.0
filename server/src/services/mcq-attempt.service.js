import mongoose from 'mongoose';
import McqAttempt from '../models/mcq-attempt.model.js';
import McqTest from '../models/mcq.model.js';
import ApiError from '../utils/api-error.js';
import { isAdminRole, hasActiveCourseEnrollment } from '../utils/course-access.util.js';
import { sanitizeTestForStudent } from './mcq.service.js';

const round2 = (value) => Math.round(value * 100) / 100;

const sanitizeAttemptSummary = (attempt, { includeStudent = false } = {}) => {
  const testDoc = attempt.mcqTestId ?? {};
  const studentDoc = attempt.studentId ?? {};

  const payload = {
    id: attempt._id.toString(),
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    passed: attempt.passed,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
  };

  if (testDoc._id) {
    payload.test = { id: testDoc._id.toString(), title: testDoc.title };
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

const sanitizeAttemptDetail = (attempt, { includeStudent = false, explanations = null } = {}) => {
  const base = sanitizeAttemptSummary(attempt, { includeStudent });
  const courseId = attempt.courseId._id
    ? attempt.courseId._id.toString()
    : attempt.courseId.toString();

  const answers = (attempt.answers || []).map((a) => {
    const row = {
      questionOrder: a.questionOrder,
      selectedOption: a.selectedOption,
      marksAwarded: a.marksAwarded,
      isCorrect: Boolean(a.isCorrect),
    };
    if (explanations) {
      const q = explanations.get(a.questionOrder);
      row.isCorrect = Boolean(q && a.selectedOption !== null && q.correctOption === a.selectedOption);
      row.correctOption = q ? q.correctOption : null;
      row.explanation = q ? q.explanation : '';
    }
    return row;
  });

  return {
    ...base,
    mcqTestId: base.test?.id ?? attempt.mcqTestId.toString(),
    answers,
  };
};

const startAttempt = async (requester, testIdInput) => {
  if (!mongoose.isValidObjectId(testIdInput)) {
    throw new ApiError(404, 'MCQ test not found');
  }

  const test = await McqTest.findOne({ _id: testIdInput, status: 'published' });
  if (!test) {
    throw new ApiError(404, 'MCQ test not found');
  }

  if (!(await hasActiveCourseEnrollment(requester.id, test.courseId))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  const evaluatedAttempt = await McqAttempt.findOne({
    studentId: requester.id,
    mcqTestId: test._id,
    status: 'evaluated',
  });

  if (evaluatedAttempt) {
    throw new ApiError(409, 'This MCQ assignment has already been submitted');
  }

  let attempt = await McqAttempt.findOne({
    studentId: requester.id,
    mcqTestId: test._id,
    status: 'in_progress',
  });

  if (!attempt) {
    const previous = await McqAttempt.findOne({
      studentId: requester.id,
      mcqTestId: test._id,
    }).sort('-attemptNumber');

    attempt = await McqAttempt.create({
      studentId: requester.id,
      mcqTestId: test._id,
      courseId: test.courseId,
      attemptNumber: (previous?.attemptNumber || 0) + 1,
      status: 'in_progress',
      startedAt: new Date(),
    });
  }

  return {
    attempt: sanitizeAttemptDetail(attempt),
    test: sanitizeTestForStudent(test),
  };
};

const submitAttempt = async (requester, attemptIdInput, rawAnswers) => {
  if (!mongoose.isValidObjectId(attemptIdInput)) {
    throw new ApiError(404, 'Attempt not found');
  }

  const attempt = await McqAttempt.findById(attemptIdInput);
  if (!attempt) {
    throw new ApiError(404, 'Attempt not found');
  }

  if (attempt.studentId.toString() !== requester.id) {
    throw new ApiError(404, 'Attempt not found');
  }

  if (attempt.status !== 'in_progress') {
    throw new ApiError(409, 'This attempt has already been submitted');
  }

  const test = await McqTest.findById(attempt.mcqTestId);
  if (!test) {
    throw new ApiError(404, 'MCQ test not found');
  }

  if (!(await hasActiveCourseEnrollment(requester.id, test.courseId))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }

  const questionByOrder = new Map();
  for (const question of test.questions) {
    questionByOrder.set(question.order, question);
  }

  const normalizedAnswers = (Array.isArray(rawAnswers) ? rawAnswers : []).map((answer) => ({
    questionOrder: Number(answer.questionOrder),
    selectedOption:
      answer.selectedOption === null || answer.selectedOption === undefined
        ? null
        : Number(answer.selectedOption),
  }));

  let score = 0;
  const gradedAnswers = normalizedAnswers.map((answer) => {
    const question = questionByOrder.get(answer.questionOrder);
    let marksAwarded = 0;

    if (
      question &&
      answer.selectedOption !== null &&
      answer.selectedOption === question.correctOption
    ) {
      marksAwarded = question.marks;
    }

    score += marksAwarded;
    return { ...answer, marksAwarded, isCorrect: marksAwarded > 0 };
  });

  const totalMarks = test.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const percentage = totalMarks > 0 ? round2((score / totalMarks) * 100) : 0;
  const passed = percentage >= (test.passingScore || 0);

  attempt.answers = gradedAnswers;
  attempt.score = score;
  attempt.totalMarks = totalMarks;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.status = 'evaluated';
  attempt.submittedAt = new Date();
  await attempt.save();

  await attempt.populate('mcqTestId', 'title');

  return buildEvaluatedResult(attempt, test);
};

const buildEvaluatedResult = (attempt, test) => {
  const answerByOrder = new Map(
    (attempt.answers || []).map((a) => [Number(a.questionOrder), a])
  );

  const perQuestionResults = test.questions.map((question) => {
    const given = answerByOrder.get(question.order);
    const selectedOption = given ? given.selectedOption : null;
    const marksAwarded = given ? given.marksAwarded : 0;
    const isCorrect =
      selectedOption !== null && selectedOption !== undefined && selectedOption === question.correctOption;

    return {
      questionOrder: question.order,
      question: question.question,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect,
      marksAwarded,
      maxMarks: question.marks,
      explanation: question.explanation || '',
    };
  });

  return {
    attemptId: attempt._id.toString(),
    testId: attempt.mcqTestId._id.toString(),
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    results: perQuestionResults,
  };
};

const getMyAttempts = async (userId, { page = 1, limit = 10, status, mcqTestId }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = { studentId: userId };
  if (status) {
    filter.status = status;
  }
  if (mcqTestId) {
    filter.mcqTestId = mcqTestId;
  }

  const [total, documents] = await Promise.all([
    McqAttempt.countDocuments(filter),
    McqAttempt.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('mcqTestId', 'title')
      .lean(),
  ]);

  return {
    attempts: documents.map((doc) =>
      sanitizeAttemptSummary(
        { ...doc, mcqTestId: doc.mcqTestId },
        { includeStudent: false }
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

const getAttemptById = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Attempt not found');
  }

  const admin = isAdminRole(requester.role);

  const query = McqAttempt.findById(id).populate('mcqTestId', 'title passingScore').populate(
    'studentId',
    'name email'
  );

  const attempt = await query;

  if (!attempt) {
    throw new ApiError(404, 'Attempt not found');
  }

  if (!admin && attempt.studentId._id.toString() !== requester.id) {
    throw new ApiError(404, 'Attempt not found');
  }

  const includeStudent = admin;
  const evaluated = attempt.status === 'evaluated';

  let explanations = null;
  if (evaluated) {
    const test = await McqTest.findById(attempt.mcqTestId).select('questions');
    explanations = new Map(
      (test?.questions || []).map((q) => [q.order, q])
    );
  }

  return {
    attempt: sanitizeAttemptDetail(attempt, { includeStudent, explanations }),
  };
};

const listAttempts = async ({ page = 1, limit = 10, status, mcqTestId, courseId, studentId }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (mcqTestId) {
    filter.mcqTestId = mcqTestId;
  }
  if (courseId) {
    filter.courseId = courseId;
  }
  if (studentId) {
    filter.studentId = studentId;
  }

  const [total, documents] = await Promise.all([
    McqAttempt.countDocuments(filter),
    McqAttempt.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate('mcqTestId', 'title')
      .populate('studentId', 'name email')
      .lean(),
  ]);

  return {
    attempts: documents.map((doc) =>
      sanitizeAttemptSummary(doc, { includeStudent: Boolean(doc.studentId?._id) })
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

export default { startAttempt, submitAttempt, getMyAttempts, getAttemptById, listAttempts };
