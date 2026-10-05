import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import CodingTask from '../models/coding-task.model.js';
import CodingSubmission from '../models/coding-submission.model.js';
import Enrollment from '../models/enrollment.model.js';
import ApiError from '../utils/api-error.js';
import { ACTIVE_ACCESS_STATUSES, findActiveCourseIn, isAdminRole } from '../utils/course-access.util.js';
import { normalizeCourseIds } from '../utils/course-ids.util.js';
import { evaluateCodingSubmission, isPlaceholderOnlyCode } from './coding-evaluation.service.js';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TASK_TYPES = [
  'Coding Problem',
  'Frontend Task',
  'Backend / API Task',
  'React Task',
  'MERN Task',
];
const STATUSES = ['draft', 'published', 'archived'];

const SOLVED_SUBMISSION_STATUSES = ['accepted'];

const LEVEL_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };

const EDITABLE_FIELDS = [
  'title',
  'description',
  'level',
  'topic',
  'taskType',
  'difficulty',
  'status',
  'taskOrder',
  'language',
  'inputFormat',
  'outputFormat',
  'constraints',
  'starterCode',
  'sampleTestCases',
  'hiddenTestCases',
  'requirements',
  'starterFiles',
  'evaluationRequirements',
  'apiRequirements',
  'apiTestCases',
  'frontendRequirements',
  'backendRequirements',
  'databaseRequirements',
];

const isEducatorRole = (role) => isAdminRole(role) || role === 'teacher';

const isNonEmpty = (value) => Boolean(String(value ?? '').trim());

const normalizeTestCases = (value) =>
  (Array.isArray(value) ? value : [])
    .map((row) => ({
      input: String(row?.input ?? '').trim(),
      expected: String(row?.expected ?? '').trim(),
    }))
    .filter((row) => row.input || row.expected);

const normalizeApiTestCases = (value) =>
  (Array.isArray(value) ? value : [])
    .map((row) => ({
      method: String(row?.method ?? 'GET').toUpperCase(),
      endpoint: String(row?.endpoint ?? '').trim(),
      expected: String(row?.expected ?? '').trim(),
    }))
    .filter((row) => row.endpoint || row.expected);

const pickEditableFields = (data) => {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      picked[field] = data[field];
    }
  }
  if (picked.sampleTestCases !== undefined) {
    picked.sampleTestCases = normalizeTestCases(picked.sampleTestCases);
  }
  if (picked.hiddenTestCases !== undefined) {
    picked.hiddenTestCases = normalizeTestCases(picked.hiddenTestCases);
  }
  if (picked.apiTestCases !== undefined) {
    picked.apiTestCases = normalizeApiTestCases(picked.apiTestCases);
  }
  if (picked.title !== undefined) picked.title = String(picked.title).trim();
  if (picked.topic !== undefined) picked.topic = String(picked.topic).trim();
  return picked;
};

const validateCommonFields = (data) => {
  if (!isNonEmpty(data.title)) {
    throw new ApiError(400, 'Title is required');
  }
  if (!LEVELS.includes(data.level)) {
    throw new ApiError(400, 'Level must be one of: Beginner, Intermediate, Advanced');
  }
  if (!isNonEmpty(data.topic)) {
    throw new ApiError(400, 'Topic is required');
  }
  if (!TASK_TYPES.includes(data.taskType)) {
    throw new ApiError(
      400,
      'Task type must be one of: Coding Problem, Frontend Task, Backend / API Task, React Task, MERN Task'
    );
  }
  if (!DIFFICULTIES.includes(data.difficulty)) {
    throw new ApiError(400, 'Difficulty must be one of: Easy, Medium, Hard');
  }
};

const requireCompleteCases = (cases, message) => {
  const rows = Array.isArray(cases) ? cases : [];
  if (rows.length === 0 || rows.some((row) => !isNonEmpty(row.input) || !isNonEmpty(row.expected))) {
    throw new ApiError(400, message);
  }
};

const validateForPublish = (task) => {
  switch (task.taskType) {
    case 'Coding Problem': {
      if (!isNonEmpty(task.description)) {
        throw new ApiError(400, 'Problem statement is required to publish a coding problem');
      }
      if (!isNonEmpty(task.language)) {
        throw new ApiError(400, 'Language is required to publish a coding problem');
      }
      if (!isNonEmpty(task.inputFormat)) {
        throw new ApiError(400, 'Input format is required to publish a coding problem');
      }
      if (!isNonEmpty(task.outputFormat)) {
        throw new ApiError(400, 'Output format is required to publish a coding problem');
      }
      requireCompleteCases(task.sampleTestCases, 'Add at least one complete sample test case before publishing');
      requireCompleteCases(task.hiddenTestCases, 'Add at least one complete hidden test case before publishing');
      return;
    }
    case 'Frontend Task':
    case 'React Task': {
      if (!isNonEmpty(task.requirements)) {
        throw new ApiError(400, 'Requirements are required to publish this task');
      }
      if (!isNonEmpty(task.evaluationRequirements)) {
        throw new ApiError(400, 'Evaluation requirements are required to publish this task');
      }
      return;
    }
    case 'Backend / API Task': {
      if (!isNonEmpty(task.apiRequirements)) {
        throw new ApiError(400, 'API requirements are required to publish this task');
      }
      const rows = Array.isArray(task.apiTestCases) ? task.apiTestCases : [];
      if (rows.length === 0 || rows.some((row) => !isNonEmpty(row.endpoint) || !isNonEmpty(row.expected))) {
        throw new ApiError(400, 'Add at least one complete API test case before publishing');
      }
      return;
    }
    case 'MERN Task': {
      const requirements = [
        ['frontendRequirements', 'Frontend requirements'],
        ['backendRequirements', 'Backend requirements'],
        ['databaseRequirements', 'Database requirements'],
        ['evaluationRequirements', 'Evaluation requirements'],
      ];
      for (const [field, label] of requirements) {
        if (!isNonEmpty(task[field])) {
          throw new ApiError(400, `${label} are required to publish a MERN task`);
        }
      }
      return;
    }
    default:
      throw new ApiError(400, 'Invalid task type');
  }
};

const assertCanViewTask = (requester, task) => {
  if (isAdminRole(requester.role)) return;
  if (String(task.createdBy) !== String(requester.id)) {
    throw new ApiError(403, 'You do not have permission to access this coding task');
  }
};

const assertCanModifyTask = (requester, task) => {
  if (isAdminRole(requester.role)) return;
  if (String(task.createdBy) !== String(requester.id)) {
    throw new ApiError(403, 'You do not have permission to modify this coding task');
  }
};

const sanitizeTaskForTeacher = (task) => ({
  id: task._id.toString(),
  courseIds: (Array.isArray(task.courseIds) ? task.courseIds : [])
    .filter(Boolean)
    .map((id) => String(id)),
  createdBy: String(task.createdBy),
  title: task.title,
  description: task.description,
  level: task.level,
  topic: task.topic,
  taskType: task.taskType,
  difficulty: task.difficulty,
  status: task.status,
  taskOrder: Number.isInteger(task.taskOrder) ? task.taskOrder : 0,
  language: task.language,
  inputFormat: task.inputFormat,
  outputFormat: task.outputFormat,
  constraints: task.constraints,
  starterCode: task.starterCode,
  sampleTestCases: (task.sampleTestCases || []).map((row) => ({
    input: row.input,
    expected: row.expected,
  })),
  hiddenTestCases: (task.hiddenTestCases || []).map((row) => ({
    input: row.input,
    expected: row.expected,
  })),
  requirements: task.requirements,
  starterFiles: task.starterFiles,
  evaluationRequirements: task.evaluationRequirements,
  apiRequirements: task.apiRequirements,
  apiTestCases: (task.apiTestCases || []).map((row) => ({
    method: row.method,
    endpoint: row.endpoint,
    expected: row.expected,
  })),
  frontendRequirements: task.frontendRequirements,
  backendRequirements: task.backendRequirements,
  databaseRequirements: task.databaseRequirements,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

// Students must never receive hidden test cases, evaluation criteria, or unpublished tasks.
const sanitizeTaskForStudent = (task) => {
  const teacherView = sanitizeTaskForTeacher(task);
  delete teacherView.hiddenTestCases;
  delete teacherView.createdBy;
  delete teacherView.evaluationRequirements;
  return teacherView;
};

const sanitizeSubmission = (submission) => ({
  id: submission._id.toString(),
  taskId: String(submission.taskId),
  courseId: submission.courseId ? String(submission.courseId) : null,
  attemptNumber: submission.attemptNumber,
  status: submission.status,
  code: submission.code || '',
  language: submission.language || '',
  score: submission.score ?? null,
  passedTests: submission.passedTests ?? null,
  totalTests: submission.totalTests ?? null,
  executionDetails: submission.executionDetails ?? null,
  checks: (submission.checks || []).map((check) => ({
    label: check.label,
    passed: Boolean(check.passed),
    detail: check.detail || '',
  })),
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
});

const statusFromStats = (stats) => {
  if (!stats || stats.attempts === 0) return 'not_started';
  return stats.solved > 0 ? 'solved' : 'attempted';
};

const getStudentSubmissionStats = async (studentId, taskIds) => {
  if (taskIds.length === 0) return new Map();
  const rows = await CodingSubmission.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(String(studentId)),
        taskId: { $in: taskIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
      },
    },
    {
      $group: {
        _id: '$taskId',
        attempts: { $sum: 1 },
        solved: {
          $sum: { $cond: [{ $in: ['$status', SOLVED_SUBMISSION_STATUSES] }, 1, 0] },
        },
      },
    },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
};

const attachCourseTitles = async (tasks) => {
  const courseIds = [
    ...new Set(tasks.flatMap((task) => (task.courseIds || []).map(String))),
  ];
  if (courseIds.length === 0) return tasks;
  const courses = await Course.find({ _id: { $in: courseIds } }).select('title').lean();
  const titleById = new Map(courses.map((course) => [String(course._id), course.title]));
  return tasks.map((task) => ({
    ...task,
    courseTitle: titleById.get(String(task.courseIds?.[0])) || '',
  }));
};

const assertStudentTaskAccess = async (requester, task) => {
  if (task.status !== 'published') {
    throw new ApiError(404, 'Coding task not found');
  }
  const hasAccess = await Enrollment.exists({
    userId: requester.id,
    courseId: { $in: task.courseIds || [] },
    status: { $in: ACTIVE_ACCESS_STATUSES },
  });
  if (!hasAccess) {
    throw new ApiError(403, 'You do not have active access to this course');
  }
};

// Attempts and history are stored per (task, student, course). The course is
// always determined server-side: an explicit courseId must belong to the task
// AND to an active enrollment; otherwise the first of the task's courses the
// student can access is used.
const resolveSubmissionCourseContext = async (requester, task, requestedCourseId) => {
  const taskCourseIds = (Array.isArray(task.courseIds) ? task.courseIds : [])
    .filter(Boolean)
    .map(String);

  if (requestedCourseId) {
    if (!mongoose.isValidObjectId(requestedCourseId)) {
      throw new ApiError(400, 'Invalid course id');
    }
    const courseId = String(requestedCourseId);
    if (!taskCourseIds.includes(courseId)) {
      throw new ApiError(403, 'This course does not have access to this coding task');
    }
    const hasAccess = await Enrollment.exists({
      userId: requester.id,
      courseId,
      status: { $in: ACTIVE_ACCESS_STATUSES },
    });
    if (!hasAccess) {
      throw new ApiError(403, 'You do not have active access to this course');
    }
    return courseId;
  }

  const resolved = await findActiveCourseIn(requester.id, taskCourseIds);
  if (!resolved) {
    throw new ApiError(403, 'You do not have active access to this course');
  }
  return resolved;
};

const validateListFilters = (filters) => {
  if (filters.courseId && !mongoose.isValidObjectId(filters.courseId)) {
    throw new ApiError(400, 'Invalid course id');
  }
  if (filters.level && !LEVELS.includes(filters.level)) {
    throw new ApiError(400, 'Level must be one of: Beginner, Intermediate, Advanced');
  }
};

const buildScopedQuery = async (requester, filters) => {
  const query = {};

  if (!isEducatorRole(requester.role)) {
    const enrolledCourseIds = await Enrollment.distinct('courseId', {
      userId: requester.id,
      status: { $in: ACTIVE_ACCESS_STATUSES },
    });
    const enrolledSet = new Set(enrolledCourseIds.map((id) => id.toString()));
    if (filters.courseId && !enrolledSet.has(filters.courseId)) {
      return null;
    }
    query.status = 'published';
    query.courseIds = filters.courseId || { $in: enrolledCourseIds };
  } else {
    if (!isAdminRole(requester.role)) {
      query.createdBy = requester.id;
    }
    if (filters.courseId) {
      query.courseIds = filters.courseId;
    }
  }

  if (filters.level) query.level = filters.level;
  if (filters.topic) query.topic = filters.topic;

  return query;
};

const listCodingTasks = async (requester, filters = {}) => {
  validateListFilters(filters);
  const query = await buildScopedQuery(requester, filters);
  if (query === null) {
    return { tasks: [], totalItems: 0 };
  }

  const documents = await CodingTask.find(query)
    .sort({ taskOrder: 1, createdAt: 1 })
    .limit(500)
    .lean();

  const educator = isEducatorRole(requester.role);
  let tasks = documents.map(educator ? sanitizeTaskForTeacher : sanitizeTaskForStudent);

  if (!educator) {
    const stats = await getStudentSubmissionStats(
      requester.id,
      documents.map((doc) => doc._id)
    );
    tasks = tasks.map((task) => ({
      ...task,
      studentStatus: statusFromStats(stats.get(task.id)),
    }));
  }

  tasks = await attachCourseTitles(tasks);
  return {
    tasks,
    totalItems: tasks.length,
  };
};

const listCodingTaskGroups = async (requester) => {
  const query = await buildScopedQuery(requester, {});
  const documents = await CodingTask.find(query)
    .sort({ taskOrder: 1, createdAt: 1 })
    .lean();
  const student = !isEducatorRole(requester.role);

  const courseIds = [
    ...new Set(documents.flatMap((doc) => (doc.courseIds || []).map(String))),
  ];
  const courseDocs = courseIds.length
    ? await Course.find({ _id: { $in: courseIds } }).select('title').lean()
    : [];
  const titleById = new Map(courseDocs.map((course) => [String(course._id), course.title]));

  const enrolledSet = student
    ? new Set(
        (await Enrollment.distinct('courseId', {
          userId: requester.id,
          status: { $in: ACTIVE_ACCESS_STATUSES },
        })).map((id) => String(id))
      )
    : null;

  const studentStats = student
    ? await getStudentSubmissionStats(
        requester.id,
        documents.map((doc) => doc._id)
      )
    : null;

  // Groups are level+topic only: one shared task must appear exactly once,
  // carrying every course it belongs to.
  const byKey = new Map();
  documents.forEach((doc) => {
    const docCourses = (doc.courseIds || []).map(String);
    const key = JSON.stringify([doc.level, doc.topic]);
    let group = byKey.get(key);
    if (!group) {
      group = {
        id: key,
        level: doc.level,
        topic: doc.topic,
        courseIds: [],
        courseTitles: [],
        taskCount: 0,
        publishedCount: 0,
        _courseLists: [],
      };
      if (student) {
        group.solvedCount = 0;
        group.attemptedCount = 0;
      }
      byKey.set(key, group);
    }
    group.taskCount += 1;
    if (doc.status === 'published') group.publishedCount += 1;
    if (student) {
      const taskStatus = statusFromStats(studentStats.get(String(doc._id)));
      if (taskStatus === 'solved') group.solvedCount += 1;
      if (taskStatus !== 'not_started') group.attemptedCount += 1;
    }
    docCourses.forEach((courseId) => {
      if (!group.courseIds.includes(courseId)) group.courseIds.push(courseId);
    });
    group._courseLists.push(docCourses);
  });

  // Legacy single-course fields keep existing UI navigation working: prefer a
  // course that spans the whole group and that the student is enrolled in.
  byKey.forEach((group) => {
    const intersection = group._courseLists.reduce(
      (common, list) => common.filter((id) => list.includes(id)),
      [...(group._courseLists[0] || [])]
    );
    const eligible = enrolledSet ? group.courseIds.filter((id) => enrolledSet.has(id)) : group.courseIds;
    const preferred =
      eligible.find((id) => intersection.includes(id)) ?? eligible[0] ?? '';
    group.courseId = preferred;
    group.courseTitle = preferred ? titleById.get(preferred) || '' : '';
    group.courseTitles = group.courseIds.map((id) => titleById.get(id) || '');
    delete group._courseLists;
  });

  const groups = [...byKey.values()].sort(
    (a, b) =>
      (LEVEL_RANK[a.level] ?? 99) - (LEVEL_RANK[b.level] ?? 99) ||
      a.topic.localeCompare(b.topic) ||
      a.courseTitle.localeCompare(b.courseTitle)
  );

  if (student) {
    groups.forEach((group) => {
      group.progress =
        group.taskCount > 0
          ? Math.round((group.solvedCount / group.taskCount) * 1000) / 10
          : 0;
    });
  }

  return { groups, totalGroups: groups.length };
};

const getCodingTask = async (requester, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Coding task not found');
  }

  const task = await CodingTask.findById(id).lean();
  if (!task) {
    throw new ApiError(404, 'Coding task not found');
  }

  if (!isEducatorRole(requester.role)) {
    await assertStudentTaskAccess(requester, task);
    const stats = await getStudentSubmissionStats(requester.id, [task._id]);
    const [enriched] = await attachCourseTitles([
      {
        ...sanitizeTaskForStudent(task),
        studentStatus: statusFromStats(stats.get(String(task._id))),
      },
    ]);
    return { codingTask: enriched };
  }

  assertCanViewTask(requester, task);
  return { codingTask: sanitizeTaskForTeacher(task) };
};

const listCodingSubmissions = async (requester, taskId, courseId) => {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(404, 'Coding task not found');
  }
  const task = await CodingTask.findById(taskId).lean();
  if (!task) {
    throw new ApiError(404, 'Coding task not found');
  }
  await assertStudentTaskAccess(requester, task);
  const contextCourseId = await resolveSubmissionCourseContext(requester, task, courseId);

  const documents = await CodingSubmission.find({
    taskId: task._id,
    studentId: requester.id,
    courseId: contextCourseId,
  })
    .sort({ attemptNumber: -1 })
    .lean();

  return {
    courseId: contextCourseId,
    submissions: documents.map(sanitizeSubmission),
    totalItems: documents.length,
  };
};

const createCodingSubmission = async (requester, taskId, data = {}) => {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(404, 'Coding task not found');
  }
  const task = await CodingTask.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'Coding task not found');
  }
  await assertStudentTaskAccess(requester, task);
  const contextCourseId = await resolveSubmissionCourseContext(requester, task, data.courseId);

  const trimmedCode = String(data.code ?? '').trim();
  if (isPlaceholderOnlyCode(task, trimmedCode)) {
    throw new ApiError(400, 'Please write your code before submitting.');
  }

  const evaluation = await evaluateCodingSubmission(task, trimmedCode);

  const existing = await CodingSubmission.countDocuments({
    taskId: task._id,
    studentId: requester.id,
    courseId: contextCourseId,
  });

  const submission = await CodingSubmission.create({
    taskId: task._id,
    studentId: requester.id,
    courseId: contextCourseId,
    attemptNumber: existing + 1,
    status: evaluation?.status ?? 'submitted',
    code: trimmedCode,
    language: data.language ?? task.language ?? '',
    score: evaluation?.score ?? null,
    passedTests: evaluation?.passedTests ?? null,
    totalTests: evaluation?.totalTests ?? null,
    executionDetails: evaluation?.executionDetails ?? null,
    checks: evaluation?.checks ?? [],
  });

  return { submission: sanitizeSubmission(submission) };
};

// Creates ONE coding task shared by every course in `courseIdsInput`.
const createCodingTask = async (requester, courseIdsInput, data) => {
  const courseIds = await normalizeCourseIds(
    Array.isArray(courseIdsInput) ? courseIdsInput : [courseIdsInput]
  );

  for (const courseId of courseIds) {
    // eslint-disable-next-line no-await-in-loop
    const courseExists = await Course.exists({ _id: courseId });
    if (!courseExists) {
      throw new ApiError(404, 'Course not found');
    }
  }

  validateCommonFields(data);

  const payload = pickEditableFields(data);
  const status = payload.status !== undefined ? payload.status : 'draft';
  if (!STATUSES.includes(status)) {
    throw new ApiError(400, 'Status must be one of: draft, published, archived');
  }
  payload.status = status;

  if (status === 'published') {
    validateForPublish(payload);
  }

  const task = await CodingTask.create({
    ...payload,
    courseIds,
    createdBy: requester.id,
  });

  return { codingTask: sanitizeTaskForTeacher(task) };
};

const createCodingTasksForCourses = async (requester, courseIdsInput, data) => {
  const courseIds = await normalizeCourseIds(courseIdsInput);

  const { codingTask } = await createCodingTask(requester, courseIds, data);

  return { codingTasks: [codingTask], courseIds };
};

const updateCodingTask = async (requester, id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Coding task not found');
  }

  const task = await CodingTask.findById(id);
  if (!task) {
    throw new ApiError(404, 'Coding task not found');
  }

  assertCanModifyTask(requester, task);

  const updates = pickEditableFields(data);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }
  if (updates.status !== undefined && !STATUSES.includes(updates.status)) {
    throw new ApiError(400, 'Status must be one of: draft, published, archived');
  }

  const merged = { ...task.toObject(), ...updates };
  validateCommonFields(merged);
  if (merged.status === 'published') {
    validateForPublish(merged);
  }

  const updated = await CodingTask.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  return { codingTask: sanitizeTaskForTeacher(updated) };
};

export default {
  listCodingTasks,
  listCodingTaskGroups,
  getCodingTask,
  createCodingTask,
  createCodingTasksForCourses,
  updateCodingTask,
  listCodingSubmissions,
  createCodingSubmission,
};
