import mongoose from 'mongoose';
import CourseProgress from '../models/course-progress.model.js';
import Course from '../models/course.model.js';
import ClassModel from '../models/class.model.js';
import Assignment from '../models/assignment.model.js';
import McqTest from '../models/mcq.model.js';
import Submission from '../models/submission.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import Enrollment from '../models/enrollment.model.js';
import ApiError from '../utils/api-error.js';
import { hasActiveCourseEnrollment, ACTIVE_ACCESS_STATUSES } from '../utils/course-access.util.js';

const round2 = (value) => Math.round(value * 100) / 100;

// A "successful submission" counts toward assignment completion progress.
const SUCCESS_SUBMISSION_STATUSES = ['submitted', 'late', 'reviewed'];
// Only submitted/evaluated attempts count as attempted for MCQ progress.
const SCORED_ATTEMPT_STATUSES = ['submitted', 'evaluated'];
const MAX_ITEMS_PER_COURSE = 500;
const MAX_ATTEMPT_HISTORY = 20;
const MAX_RECENT_ACTIVITY = 20;

const sanitizeProgress = (progress) => ({
  id: progress._id.toString(),
  courseId: progress.courseId.toString(),
  overallPercentage: progress.overallPercentage,
  lastCompletedAt: progress.lastCompletedAt,
  completedLessons: progress.completedLessons.map((entry) => ({
    lessonId: entry.classId.toString(),
    completedAt: entry.completedAt,
  })),
  completedAssignments: progress.completedAssignments.map((entry) => ({
    assignmentId: entry.assignmentId.toString(),
    completedAt: entry.completedAt,
  })),
  completedMcqs: progress.completedMcqs.map((entry) => ({
    mcqTestId: entry.mcqTestId.toString(),
    completedAt: entry.completedAt,
  })),
  createdAt: progress.createdAt,
});

const getOrCreateProgress = async (studentId, courseId) => {
  let progress = await CourseProgress.findOne({ studentId, courseId });

  if (!progress) {
    try {
      progress = await CourseProgress.create({ studentId, courseId });
    } catch (error) {
      if (error.code === 11000) {
        progress = await CourseProgress.findOne({ studentId, courseId });
      } else {
        throw error;
      }
    }
  }

  return progress;
};

const recalculateOverallPercentage = async (progress) => {
  const [publishedLessons, publishedAssignments, publishedMcqs] = await Promise.all([
    ClassModel.countDocuments({ courseId: progress.courseId, status: 'published' }),
    Assignment.countDocuments({ courseId: progress.courseId, status: 'published' }),
    McqTest.countDocuments({ courseId: progress.courseId, status: 'published' }),
  ]);

  const totalItems = publishedLessons + publishedAssignments + publishedMcqs;
  const completedItems =
    progress.completedLessons.length +
    progress.completedAssignments.length +
    progress.completedMcqs.length;

  progress.overallPercentage =
    totalItems === 0 ? 0 : round2(Math.min(100, (completedItems / totalItems) * 100));
};

const assertCourseAndAccess = async (requester, courseIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput)) {
    throw new ApiError(404, 'Course not found');
  }

  const courseExists = await Course.exists({ _id: courseIdInput });
  if (!courseExists) {
    throw new ApiError(404, 'Course not found');
  }

  if (!(await hasActiveCourseEnrollment(requester.id, courseIdInput))) {
    throw new ApiError(403, 'You do not have active access to this course');
  }
};

const getProgress = async (requester, courseIdInput) => {
  await assertCourseAndAccess(requester, courseIdInput);
  const progress = await getOrCreateProgress(requester.id, courseIdInput);

  // Keep the stored percentage consistent with the course's CURRENT published
  // item set (e.g., when an item is archived later). Historical completion
  // entries themselves are never removed.
  const before = progress.overallPercentage;
  await recalculateOverallPercentage(progress);
  if (progress.overallPercentage !== before) {
    await progress.save();
  }

  return { progress: sanitizeProgress(progress) };
};

const markLessonComplete = async (requester, courseIdInput, classIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput) || !mongoose.isValidObjectId(classIdInput)) {
    throw new ApiError(404, 'Lesson not found');
  }

  const lesson = await ClassModel.findOne({
    _id: classIdInput,
    courseId: courseIdInput,
    status: 'published',
  });

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  await assertCourseAndAccess(requester, courseIdInput);

  const progress = await getOrCreateProgress(requester.id, courseIdInput);

  const alreadyCompleted = progress.completedLessons.some(
    (entry) => entry.classId.toString() === classIdInput
  );

  if (!alreadyCompleted) {
    progress.completedLessons.push({ classId: classIdInput, completedAt: new Date() });
    progress.lastCompletedAt = new Date();
    await recalculateOverallPercentage(progress);
    await progress.save();
  }

  return { progress: sanitizeProgress(progress), alreadyCompleted };
};

const markAssignmentComplete = async (requester, courseIdInput, assignmentIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput) || !mongoose.isValidObjectId(assignmentIdInput)) {
    throw new ApiError(404, 'Assignment not found');
  }

  const assignment = await Assignment.findOne({
    _id: assignmentIdInput,
    courseId: courseIdInput,
    status: 'published',
  });

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  await assertCourseAndAccess(requester, courseIdInput);

  const reviewedSubmission = await Submission.exists({
    studentId: requester.id,
    courseId: courseIdInput,
    assignmentId: assignmentIdInput,
    status: 'reviewed',
  });

  if (!reviewedSubmission) {
    throw new ApiError(
      400,
      'A reviewed submission is required before this assignment can be marked complete'
    );
  }

  const progress = await getOrCreateProgress(requester.id, courseIdInput);

  const alreadyCompleted = progress.completedAssignments.some(
    (entry) => entry.assignmentId.toString() === assignmentIdInput
  );

  if (!alreadyCompleted) {
    progress.completedAssignments.push({
      assignmentId: assignmentIdInput,
      completedAt: new Date(),
    });
    progress.lastCompletedAt = new Date();
    await recalculateOverallPercentage(progress);
    await progress.save();
  }

  return { progress: sanitizeProgress(progress), alreadyCompleted };
};

const markMcqComplete = async (requester, courseIdInput, mcqTestIdInput) => {
  if (!mongoose.isValidObjectId(courseIdInput) || !mongoose.isValidObjectId(mcqTestIdInput)) {
    throw new ApiError(404, 'MCQ test not found');
  }

  const mcqTest = await McqTest.findOne({
    _id: mcqTestIdInput,
    courseId: courseIdInput,
    status: 'published',
  });

  if (!mcqTest) {
    throw new ApiError(404, 'MCQ test not found');
  }

  await assertCourseAndAccess(requester, courseIdInput);

  const evaluatedAttempt = await McqAttempt.exists({
    studentId: requester.id,
    mcqTestId: mcqTestIdInput,
    status: 'evaluated',
  });

  if (!evaluatedAttempt) {
    throw new ApiError(
      400,
      'An evaluated attempt is required before this MCQ test can be marked complete'
    );
  }

  const progress = await getOrCreateProgress(requester.id, courseIdInput);

  const alreadyCompleted = progress.completedMcqs.some(
    (entry) => entry.mcqTestId.toString() === mcqTestIdInput
  );

  if (!alreadyCompleted) {
    progress.completedMcqs.push({ mcqTestId: mcqTestIdInput, completedAt: new Date() });
    progress.lastCompletedAt = new Date();
    await recalculateOverallPercentage(progress);
    await progress.save();
  }

  return { progress: sanitizeProgress(progress), alreadyCompleted };
};

const pctFor = (completed, total) => (total > 0 ? round2((completed / total) * 100) : 0);

// Average of the category percentages that actually have data.
// Categories with a total of 0 are excluded so they never break or skew the page.
const averageCategoryPct = (pcts) => {
  const usable = pcts.filter((entry) => entry.total > 0).map((entry) => entry.pct);
  if (usable.length === 0) return 0;
  return round2(usable.reduce((sum, value) => sum + value, 0) / usable.length);
};

const buildCourseBucket = async (studentId, courseDoc) => {
  const courseId = courseDoc._id;

  const [classes, assignments, tests, progressDoc] = await Promise.all([
    ClassModel.find({ courseId, status: 'published' })
      .sort({ module: 1, order: 1, createdAt: 1 })
      .select('title module order')
      .limit(MAX_ITEMS_PER_COURSE)
      .lean(),
    Assignment.find({ courseId, status: 'published' })
      .sort({ dueDate: 1, createdAt: 1 })
      .select('title dueDate maxMarks')
      .limit(MAX_ITEMS_PER_COURSE)
      .lean(),
    McqTest.find({ courseId, status: 'published' })
      .sort({ createdAt: 1 })
      .select('title description passingScore duration')
      .limit(MAX_ITEMS_PER_COURSE)
      .lean(),
    CourseProgress.findOne({ studentId, courseId }).select('completedLessons').lean(),
  ]);

  // ---- CLASSES: unique completed lessons from the existing CourseProgress model ----
  const completedLessonAt = new Map(
    (progressDoc?.completedLessons || []).map((entry) => [
      entry.classId.toString(),
      entry.completedAt,
    ])
  );

  const classItems = classes.map((doc) => {
    const classId = doc._id.toString();
    const completedAt = completedLessonAt.get(classId) || null;
    return {
      id: classId,
      title: doc.title,
      module: doc.module || '',
      completed: Boolean(completedAt),
      completedAt,
    };
  });

  const topicMap = new Map();
  classItems.forEach((item) => {
    const name = item.module || 'General';
    if (!topicMap.has(name)) topicMap.set(name, { name, completed: 0, total: 0 });
    const topic = topicMap.get(name);
    topic.total += 1;
    if (item.completed) topic.completed += 1;
  });
  const classTopics = [...topicMap.values()].map((topic) => ({
    ...topic,
    pct: pctFor(topic.completed, topic.total),
  }));

  const classesCompleted = classItems.filter((item) => item.completed).length;

  // ---- ASSIGNMENTS: unique successfully submitted assignments from Submission ----
  const assignmentIds = assignments.map((doc) => doc._id);
  const submissionDocs = assignmentIds.length
    ? await Submission.find({ studentId, assignmentId: { $in: assignmentIds } })
        .select('assignmentId status submittedAt marks')
        .limit(MAX_ITEMS_PER_COURSE)
        .lean()
    : [];

  const submissionsByAssignment = new Map();
  submissionDocs.forEach((submission) => {
    const key = submission.assignmentId.toString();
    if (!submissionsByAssignment.has(key)) submissionsByAssignment.set(key, []);
    submissionsByAssignment.get(key).push(submission);
  });

  const now = Date.now();
  const assignmentItems = assignments.map((doc) => {
    const assignmentId = doc._id.toString();
    const rows = submissionsByAssignment.get(assignmentId) || [];
    const successful = rows.filter((row) => SUCCESS_SUBMISSION_STATUSES.includes(row.status));
    const completed = successful.length > 0;

    const bySubmittedAtDesc = [...rows].sort(
      (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );
    const latestSubmission = bySubmittedAtDesc[0] || null;
    const scoredSubmission =
      bySubmittedAtDesc.find(
        (row) =>
          SUCCESS_SUBMISSION_STATUSES.includes(row.status) &&
          row.marks !== null &&
          row.marks !== undefined
      ) || null;

    const completedAt = completed
      ? new Date(
          Math.min(
            ...successful.map((row) => new Date(row.submittedAt || now).getTime())
          )
        )
      : null;

    const overdue =
      !completed && doc.dueDate && new Date(doc.dueDate).getTime() < now;

    return {
      id: assignmentId,
      title: doc.title,
      dueDate: doc.dueDate || null,
      status: completed ? 'completed' : overdue ? 'overdue' : 'pending',
      completed,
      completedAt,
      submittedAt: latestSubmission ? latestSubmission.submittedAt : null,
      // Score is reported separately and never feeds completion progress.
      marks: scoredSubmission ? scoredSubmission.marks : null,
      maxMarks: doc.maxMarks,
    };
  });

  const assignmentsCompleted = assignmentItems.filter((item) => item.completed).length;

  // ---- MCQ / PRACTICE: unique attempted tests from McqAttempt ----
  const testIds = tests.map((doc) => doc._id);
  const attemptDocs = testIds.length
    ? await McqAttempt.find({ studentId, courseId, mcqTestId: { $in: testIds } })
        .select(
          'mcqTestId status percentage score totalMarks passed attemptNumber submittedAt startedAt'
        )
        .sort({ submittedAt: -1, createdAt: -1 })
        .limit(MAX_ITEMS_PER_COURSE)
        .lean()
    : [];

  const attemptsByTest = new Map();
  attemptDocs.forEach((attempt) => {
    const key = attempt.mcqTestId.toString();
    if (!attemptsByTest.has(key)) attemptsByTest.set(key, []);
    attemptsByTest.get(key).push(attempt);
  });

  const mcqItems = tests.map((doc) => {
    const testId = doc._id.toString();
    const rows = attemptsByTest.get(testId) || [];
    const submitted = rows.filter(
      (row) => SCORED_ATTEMPT_STATUSES.includes(row.status) && row.submittedAt
    );
    const inProgress = rows.find((row) => row.status === 'in_progress') || null;

    // Latest submitted attempt drives the CURRENT score (retries never overwrite history).
    const latest = submitted[0] || null;
    const bestScore = submitted.reduce(
      (max, row) =>
        row.percentage !== null && row.percentage !== undefined
          ? Math.max(max, Number(row.percentage))
          : max,
      0
    );

    const history = [...submitted]
      .sort((a, b) => Number(b.attemptNumber || 0) - Number(a.attemptNumber || 0))
      .slice(0, MAX_ATTEMPT_HISTORY)
      .map((row) => ({
        id: row._id.toString(),
        attemptNumber: row.attemptNumber,
        status: row.status,
        score: row.score,
        totalMarks: row.totalMarks,
        percentage: row.percentage,
        passed: Boolean(row.passed),
        submittedAt: row.submittedAt,
      }));

    return {
      id: testId,
      title: doc.title,
      description: doc.description || '',
      passingScore: doc.passingScore || 0,
      duration: doc.duration || 0,
      attempted: submitted.length > 0,
      attemptsCount: submitted.length,
      bestScore: submitted.length ? bestScore : null,
      latestAttemptId: latest ? latest._id.toString() : null,
      latestScore: latest ? latest.percentage : null,
      latestPassed: latest ? Boolean(latest.passed) : null,
      lastAttemptAt: latest ? latest.submittedAt : null,
      inProgressAttemptId: inProgress ? inProgress._id.toString() : null,
      inProgressStartedAt: inProgress ? inProgress.startedAt : null,
      history,
    };
  });

  const mcqAttempted = mcqItems.filter((item) => item.attempted).length;

  const classesCategory = {
    completed: classesCompleted,
    total: classes.length,
    pct: pctFor(classesCompleted, classes.length),
  };
  const assignmentsCategory = {
    completed: assignmentsCompleted,
    total: assignments.length,
    pct: pctFor(assignmentsCompleted, assignments.length),
  };
  const mcqCategory = {
    attempted: mcqAttempted,
    total: tests.length,
    pct: pctFor(mcqAttempted, tests.length),
  };

  const activityTimes = [
    ...classItems.map((item) => item.completedAt),
    ...assignmentItems.map((item) => item.submittedAt),
    ...mcqItems.map((item) => item.lastAttemptAt),
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime());

  return {
    id: courseDoc._id.toString(),
    title: courseDoc.title,
    slug: courseDoc.slug,
    overallPct: averageCategoryPct([classesCategory, assignmentsCategory, mcqCategory]),
    lastActivityAt: activityTimes.length ? new Date(Math.max(...activityTimes)) : null,
    classes: {
      ...classesCategory,
      topics: classTopics,
      items: classItems,
    },
    assignments: {
      ...assignmentsCategory,
      items: assignmentItems,
    },
    mcq: {
      ...mcqCategory,
      items: mcqItems,
    },
  };
};

// Continue Learning: resume an in-progress practice first, otherwise the next
// incomplete item inside the most recently active course of the current scope.
const deriveContinueLearning = (buckets) => {
  if (buckets.length === 0) return null;

  let resume = null;
  buckets.forEach((bucket) => {
    bucket.mcq.items.forEach((item) => {
      if (!item.inProgressAttemptId) return;
      const at = new Date(item.inProgressStartedAt || 0).getTime();
      if (!resume || at > resume.at) {
        resume = {
          at,
          payload: {
            type: 'mcq',
            id: item.id,
            title: item.title,
            courseId: bucket.id,
            courseTitle: bucket.title,
            pct: bucket.overallPct,
          },
        };
      }
    });
  });
  if (resume) return resume.payload;

  const ordered = [...buckets].sort(
    (a, b) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime()
  );

  for (const bucket of ordered) {
    const nextClass = bucket.classes.items.find((item) => !item.completed);
    if (nextClass) {
      return {
        type: 'class',
        id: nextClass.id,
        title: nextClass.title,
        courseId: bucket.id,
        courseTitle: bucket.title,
        pct: bucket.overallPct,
        module: nextClass.module,
      };
    }

    const nextAssignment =
      bucket.assignments.items.find((item) => item.status === 'pending') ||
      bucket.assignments.items.find((item) => item.status === 'overdue');
    if (nextAssignment) {
      return {
        type: 'assignment',
        id: nextAssignment.id,
        title: nextAssignment.title,
        courseId: bucket.id,
        courseTitle: bucket.title,
        pct: bucket.overallPct,
        dueDate: nextAssignment.dueDate,
      };
    }

    const nextTest = bucket.mcq.items.find((item) => !item.attempted);
    if (nextTest) {
      return {
        type: 'mcq',
        id: nextTest.id,
        title: nextTest.title,
        courseId: bucket.id,
        courseTitle: bucket.title,
        pct: bucket.overallPct,
      };
    }
  }

  return null;
};

const buildRecentActivity = (buckets) => {
  const events = [];

  buckets.forEach((bucket) => {
    bucket.classes.items.forEach((item) => {
      if (!item.completed) return;
      events.push({
        id: `class-${item.id}`,
        type: 'class',
        kind: 'Class',
        status: 'completed',
        at: item.completedAt,
        title: item.title,
        desc: `Watched in ${bucket.title}`,
      });
    });

    bucket.assignments.items.forEach((item) => {
      if (!item.completed) return;
      events.push({
        id: `assignment-${item.id}`,
        type: 'assignment',
        kind: 'Assignment',
        status: 'submitted',
        at: item.submittedAt || item.completedAt,
        title: item.title,
        desc:
          item.marks !== null && item.marks !== undefined
            ? `Scored ${item.marks} / ${item.maxMarks}`
            : `Submitted in ${bucket.title}`,
      });
    });

    bucket.mcq.items.forEach((item) => {
      item.history.forEach((attempt) => {
        events.push({
          id: `mcq-${attempt.id}`,
          type: 'mcq',
          kind: 'Practice',
          status: attempt.passed ? 'passed' : 'failed',
          at: attempt.submittedAt,
          title: item.title,
          desc: `${attempt.percentage}% · Attempt #${attempt.attemptNumber}`,
        });
      });
    });
  });

  return events
    .filter((event) => event.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_RECENT_ACTIVITY);
};

const getStudentProgressOverview = async (requester, courseIdInput) => {
  const enrollments = await Enrollment.find({
    userId: requester.id,
    status: { $in: ACTIVE_ACCESS_STATUSES },
  })
    .populate('courseId', 'title slug')
    .lean();

  const seen = new Set();
  let courses = enrollments
    .map((enrollment) => enrollment.courseId)
    .filter(Boolean)
    .filter((course) => {
      const id = course._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  if (courseIdInput) {
    if (!mongoose.isValidObjectId(courseIdInput)) {
      throw new ApiError(404, 'Course not found');
    }
    if (!seen.has(courseIdInput)) {
      throw new ApiError(403, 'You do not have active access to this course');
    }
    courses = courses.filter((course) => course._id.toString() === courseIdInput);
  }

  const buckets = await Promise.all(
    courses.map((course) => buildCourseBucket(requester.id, course))
  );

  const sum = (selector) =>
    buckets.reduce((total, bucket) => total + selector(bucket), 0);

  const classesCategory = {
    completed: sum((bucket) => bucket.classes.completed),
    total: sum((bucket) => bucket.classes.total),
  };
  classesCategory.pct = pctFor(classesCategory.completed, classesCategory.total);

  const assignmentsCategory = {
    completed: sum((bucket) => bucket.assignments.completed),
    total: sum((bucket) => bucket.assignments.total),
  };
  assignmentsCategory.pct = pctFor(assignmentsCategory.completed, assignmentsCategory.total);

  const mcqCategory = {
    attempted: sum((bucket) => bucket.mcq.attempted),
    total: sum((bucket) => bucket.mcq.total),
  };
  mcqCategory.pct = pctFor(mcqCategory.attempted, mcqCategory.total);

  // Overall = (Class % + Assignment % + MCQ %) / 3, skipping empty categories.
  const overallPct = averageCategoryPct([
    classesCategory,
    assignmentsCategory,
    mcqCategory,
  ]);

  const completedActivities =
    classesCategory.completed + assignmentsCategory.completed + mcqCategory.attempted;
  const totalActivities = classesCategory.total + assignmentsCategory.total + mcqCategory.total;

  return {
    scope: {
      courseId: courseIdInput || null,
      courseCount: buckets.length,
    },
    overall: {
      pct: overallPct,
      completedActivities,
      totalActivities,
      classes: classesCategory,
      assignments: assignmentsCategory,
      mcq: mcqCategory,
    },
    continueLearning: deriveContinueLearning(buckets),
    recentActivity: buildRecentActivity(buckets),
    courses: buckets,
  };
};

export default {
  getProgress,
  markLessonComplete,
  markAssignmentComplete,
  markMcqComplete,
  getStudentProgressOverview,
};
