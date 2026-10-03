import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import ClassModel from '../models/class.model.js';
import Assignment from '../models/assignment.model.js';
import McqTest from '../models/mcq.model.js';
import Submission from '../models/submission.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import CourseProgress from '../models/course-progress.model.js';
import Enrollment from '../models/enrollment.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';
import { ACTIVE_ACCESS_STATUSES, hasActiveCourseEnrollment } from '../utils/course-access.util.js';

// Point system (documented for the How Points Work UI):
// - unique completed class          = +10
// - unique successful assignment    = +20 (+ up to 10 score bonus)
// - unique attempted practice set   = +10 (+ up to 10 latest-score bonus)
// Retries/resubmits/re-watches never add completion points again.
const CLASS_COMPLETION_POINTS = 10;
const ASSIGNMENT_COMPLETION_POINTS = 20;
const PRACTICE_COMPLETION_POINTS = 10;
const MAX_ASSIGNMENT_SCORE_BONUS = 10;
const MAX_PRACTICE_SCORE_BONUS = 10;

// Same completion statuses as the Student Progress service.
const SUCCESS_SUBMISSION_STATUSES = ['submitted', 'late', 'reviewed'];
const SCORED_ATTEMPT_STATUSES = ['submitted', 'evaluated'];

const TIME_FILTERS = ['week', 'month', 'all'];
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = { week: 7, month: 30 };

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resolveWindows = (timeFilter) => {
  if (timeFilter === 'all') return { current: null, previous: null };

  const days = PERIOD_DAYS[timeFilter];
  const now = Date.now();
  return {
    current: { start: now - days * DAY_MS, end: now },
    previous: { start: now - 2 * days * DAY_MS, end: now - days * DAY_MS },
  };
};

const inWindow = (date, window) => {
  if (!window) return true;
  if (!date) return false;
  const time = new Date(date).getTime();
  return Number.isFinite(time) && time >= window.start && time <= window.end;
};

// Eligible population: students with an active enrollment (approved/completed).
// Teachers/admins are never included. Course scope requires the requester to
// have active access to that course first (403 otherwise).
const resolveScope = async (requester, courseIdInput) => {
  if (courseIdInput) {
    if (!mongoose.isValidObjectId(courseIdInput)) {
      throw new ApiError(404, 'Course not found');
    }

    const course = await Course.findById(courseIdInput).select('title slug').lean();
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    if (!(await hasActiveCourseEnrollment(requester.id, courseIdInput))) {
      throw new ApiError(403, 'You do not have active access to this course');
    }

    const enrollments = await Enrollment.find({
      courseId: courseIdInput,
      status: { $in: ACTIVE_ACCESS_STATUSES },
    })
      .select('userId')
      .lean();

    const userIds = [...new Set(enrollments.map((entry) => entry.userId.toString()))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds }, role: 'student' }).select('name').lean()
      : [];
    const pairs = new Set(users.map((user) => `${user._id.toString()}:${courseIdInput}`));

    return { course, courseIds: [courseIdInput], users, pairs };
  }

  const enrollments = await Enrollment.find({
    status: { $in: ACTIVE_ACCESS_STATUSES },
  })
    .select('userId courseId')
    .lean();

  const userIds = [...new Set(enrollments.map((entry) => entry.userId.toString()))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds }, role: 'student' }).select('name').lean()
    : [];
  const studentIds = new Set(users.map((user) => user._id.toString()));

  const pairs = new Set();
  const courseIds = new Set();
  enrollments.forEach((enrollment) => {
    const userId = enrollment.userId.toString();
    if (!studentIds.has(userId)) return;
    const courseId = enrollment.courseId.toString();
    pairs.add(`${userId}:${courseId}`);
    courseIds.add(courseId);
  });

  return { course: null, courseIds: [...courseIds], users, pairs };
};

// One event per unique item, carrying its completion timestamp and the points
// it earns (completion + current score bonus). Deduplication happens here, so
// retries/resubmits/re-watches can never produce duplicate completion points.
const loadStudentEvents = async ({ courseIds, students, pairs }) => {
  const eventsByStudent = new Map(
    students.map((student) => [
      student._id.toString(),
      { classes: [], assignments: [], practices: [] },
    ])
  );

  if (students.length === 0 || courseIds.length === 0) return eventsByStudent;

  const courseFilter = { $in: courseIds };
  const studentFilter = { $in: students.map((student) => student._id) };

  const [progressDocs, submissions, attempts, classDocs, assignmentDocs, testDocs] =
    await Promise.all([
      CourseProgress.find({ courseId: courseFilter, studentId: studentFilter })
        .select('studentId courseId completedLessons createdAt')
        .lean(),
      Submission.find({
        courseId: courseFilter,
        studentId: studentFilter,
        status: { $in: SUCCESS_SUBMISSION_STATUSES },
      })
        .select('studentId courseId assignmentId submittedAt marks attemptNumber')
        .sort({ submittedAt: 1, attemptNumber: 1 })
        .lean(),
      McqAttempt.find({
        courseId: courseFilter,
        studentId: studentFilter,
        status: { $in: SCORED_ATTEMPT_STATUSES },
      })
        .select('studentId courseId mcqTestId submittedAt percentage attemptNumber')
        .sort({ submittedAt: 1, attemptNumber: 1 })
        .lean(),
      ClassModel.find({ courseId: courseFilter, status: 'published' }).select('courseId').lean(),
      Assignment.find({ courseIds: courseFilter, status: 'published' })
        .select('courseIds maxMarks')
        .lean(),
      McqTest.find({ courseIds: courseFilter, status: 'published' })
        .select('courseIds')
        .lean(),
    ]);

  // Published items only, matching what the Student Progress page counts.
  const publishedClasses = new Map();
  classDocs.forEach((doc) => {
    const courseId = doc.courseId.toString();
    if (!publishedClasses.has(courseId)) publishedClasses.set(courseId, new Set());
    publishedClasses.get(courseId).add(doc._id.toString());
  });

  const publishedAssignments = new Map();
  assignmentDocs.forEach((doc) => {
    // One shared assignment counts once for every course it belongs to.
    (doc.courseIds || []).forEach((courseId) => {
      const key = courseId.toString();
      if (!publishedAssignments.has(key)) publishedAssignments.set(key, new Map());
      publishedAssignments.get(key).set(doc._id.toString(), Number(doc.maxMarks) || 0);
    });
  });

  const publishedTests = new Map();
  testDocs.forEach((doc) => {
    (doc.courseIds || []).forEach((courseId) => {
      const key = courseId.toString();
      if (!publishedTests.has(key)) publishedTests.set(key, new Set());
      publishedTests.get(key).add(doc._id.toString());
    });
  });

  // ---- CLASSES: unique completions from CourseProgress (one reward each) ----
  progressDocs.forEach((doc) => {
    const studentId = doc.studentId.toString();
    const courseId = doc.courseId.toString();
    if (!pairs.has(`${studentId}:${courseId}`)) return;
    const published = publishedClasses.get(courseId);
    const events = eventsByStudent.get(studentId);
    if (!published || !events) return;

    const seen = new Set();
    (doc.completedLessons || []).forEach((entry) => {
      const classId = entry.classId.toString();
      if (!published.has(classId) || seen.has(classId)) return;
      seen.add(classId);
      events.classes.push({
        at: entry.completedAt || doc.createdAt,
        points: CLASS_COMPLETION_POINTS,
      });
    });
  });

  // ---- ASSIGNMENTS: unique successful submissions (earliest = completion) ----
  const submissionGroups = new Map();
  submissions.forEach((doc) => {
    const studentId = doc.studentId.toString();
    const courseId = doc.courseId.toString();
    if (!pairs.has(`${studentId}:${courseId}`)) return;
    const maxMarks = publishedAssignments.get(courseId)?.get(doc.assignmentId.toString());
    if (maxMarks === undefined) return;

    const key = `${studentId}:${doc.assignmentId.toString()}`;
    if (!submissionGroups.has(key)) {
      submissionGroups.set(key, { studentId, maxMarks, rows: [] });
    }
    submissionGroups.get(key).rows.push(doc);
  });

  submissionGroups.forEach((group) => {
    const rows = group.rows;
    const completionAt = rows[0]?.submittedAt;
    if (!completionAt) return;

    // Bonus comes from the LATEST scored submission only (never per retry).
    let latestScored = null;
    rows.forEach((row) => {
      if (row.marks !== null && row.marks !== undefined) latestScored = row;
    });

    let bonus = 0;
    let scorePct = null;
    if (latestScored && group.maxMarks > 0) {
      const ratio = clamp(Number(latestScored.marks) / group.maxMarks, 0, 1);
      bonus = Math.round(ratio * MAX_ASSIGNMENT_SCORE_BONUS);
      scorePct = round2(ratio * 100);
    }

    eventsByStudent.get(group.studentId).assignments.push({
      at: completionAt,
      points: ASSIGNMENT_COMPLETION_POINTS + bonus,
      scorePct,
    });
  });

  // ---- PRACTICE / MCQ: unique attempted tests (earliest = completion) ----
  const attemptGroups = new Map();
  attempts.forEach((doc) => {
    if (!doc.submittedAt) return;
    const studentId = doc.studentId.toString();
    const courseId = doc.courseId.toString();
    if (!pairs.has(`${studentId}:${courseId}`)) return;
    if (!publishedTests.get(courseId)?.has(doc.mcqTestId.toString())) return;

    const key = `${studentId}:${doc.mcqTestId.toString()}`;
    if (!attemptGroups.has(key)) {
      attemptGroups.set(key, { studentId, rows: [] });
    }
    attemptGroups.get(key).rows.push(doc);
  });

  attemptGroups.forEach((group) => {
    const rows = group.rows;
    const completionAt = rows[0].submittedAt;
    // Latest submitted attempt drives current performance (history preserved).
    const latest = rows[rows.length - 1];
    const pct = clamp(Number(latest.percentage) || 0, 0, 100);
    const bonus = Math.round((pct / 100) * MAX_PRACTICE_SCORE_BONUS);

    eventsByStudent.get(group.studentId).practices.push({
      at: completionAt,
      points: PRACTICE_COMPLETION_POINTS + bonus,
      scorePct: round2(pct),
    });
  });

  return eventsByStudent;
};

// Points/counts for one time window. A whole item (completion + its bonus)
// contributes only when its completion event falls inside the window.
const buildStats = (eventsByStudent, eligibleIds, window) =>
  eligibleIds.map((studentId) => {
    const events = eventsByStudent.get(studentId) || {
      classes: [],
      assignments: [],
      practices: [],
    };

    let points = 0;
    let classesCompleted = 0;
    let assignmentsCompleted = 0;
    let mcqsAttempted = 0;
    let lastActivityAt = null;
    const scores = [];

    const countEvent = (event) => {
      if (!inWindow(event.at, window)) return false;
      points += event.points;
      const time = new Date(event.at).getTime();
      if (lastActivityAt === null || time > lastActivityAt) lastActivityAt = time;
      return true;
    };

    events.classes.forEach((event) => {
      if (countEvent(event)) classesCompleted += 1;
    });

    events.assignments.forEach((event) => {
      if (!countEvent(event)) return;
      assignmentsCompleted += 1;
      if (event.scorePct !== null && event.scorePct !== undefined) scores.push(event.scorePct);
    });

    events.practices.forEach((event) => {
      if (!countEvent(event)) return;
      mcqsAttempted += 1;
      if (event.scorePct !== null && event.scorePct !== undefined) scores.push(event.scorePct);
    });

    return {
      studentId,
      points,
      classesCompleted,
      assignmentsCompleted,
      mcqsAttempted,
      averageScore: scores.length
        ? round2(scores.reduce((total, value) => total + value, 0) / scores.length)
        : null,
      lastActivityAt,
    };
  });

// Sort: points desc, then latest activity desc, then name, then id (stable).
// Rank uses competition ranking on POINTS only, so ties share the same rank.
const rankStats = (stats, usersById, requesterId) => {
  const rows = stats.map((stat) => ({
    ...stat,
    name: usersById.get(stat.studentId)?.name || 'Student',
    isMe: stat.studentId === requesterId,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aActivity = a.lastActivityAt || 0;
    const bActivity = b.lastActivityAt || 0;
    if (bActivity !== aActivity) return bActivity - aActivity;
    const nameDelta = a.name.localeCompare(b.name, 'en');
    if (nameDelta !== 0) return nameDelta;
    return a.studentId.localeCompare(b.studentId);
  });

  let currentRank = 0;
  let previousPoints = null;
  rows.forEach((row, index) => {
    if (row.points !== previousPoints) {
      currentRank = index + 1;
      previousPoints = row.points;
    }
    row.rank = currentRank;
  });

  return rows;
};

const getLeaderboard = async (requester, { courseId = null, timeFilter = 'all' } = {}) => {
  const normalizedTimeFilter = TIME_FILTERS.includes(timeFilter) ? timeFilter : 'all';

  const { course, courseIds, users, pairs } = await resolveScope(requester, courseId);
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const eligibleIds = users.map((user) => user._id.toString());

  const eventsByStudent = await loadStudentEvents({ courseIds, students: users, pairs });

  const windows = resolveWindows(normalizedTimeFilter);
  const rows = rankStats(
    buildStats(eventsByStudent, eligibleIds, windows.current),
    usersById,
    requester.id
  );

  // Rank change is derived from a real previous-period ranking (same
  // population, shifted window). All-time has no previous period -> null.
  let previousRank = null;
  if (windows.previous) {
    const previousRows = rankStats(
      buildStats(eventsByStudent, eligibleIds, windows.previous),
      usersById,
      requester.id
    );
    const previousMe = previousRows.find((row) => row.isMe);
    previousRank = previousMe ? previousMe.rank : null;
  }

  const meRow = rows.find((row) => row.isMe) || null;
  const rankChange =
    meRow && previousRank !== null ? previousRank - meRow.rank : null;
  // Percentile = share of the OTHER participants this student beats.
  const percentile = meRow
    ? rows.length > 1
      ? Math.round(
          (rows.filter((row) => row.points < meRow.points).length / (rows.length - 1)) * 100
        )
      : 100
    : null;

  const sanitizeRow = (row) => ({
    rank: row.rank,
    studentId: row.studentId,
    name: row.name,
    avatar: null,
    points: row.points,
    classesCompleted: row.classesCompleted,
    assignmentsCompleted: row.assignmentsCompleted,
    mcqsAttempted: row.mcqsAttempted,
    averageScore: row.averageScore,
    isMe: row.isMe,
  });

  const me = meRow
    ? {
        rank: meRow.rank,
        previousRank,
        rankChange,
        totalPoints: meRow.points,
        totalParticipants: rows.length,
        percentile,
        classesCompleted: meRow.classesCompleted,
        assignmentsCompleted: meRow.assignmentsCompleted,
        mcqsAttempted: meRow.mcqsAttempted,
        averageScore: meRow.averageScore,
      }
    : {
        rank: null,
        previousRank: null,
        rankChange: null,
        totalPoints: 0,
        totalParticipants: rows.length,
        percentile: null,
        classesCompleted: 0,
        assignmentsCompleted: 0,
        mcqsAttempted: 0,
        averageScore: null,
      };

  return {
    scope: {
      courseId: course ? course._id.toString() : null,
      courseTitle: course ? course.title : null,
      timeFilter: normalizedTimeFilter,
      windowStart: windows.current ? new Date(windows.current.start) : null,
      windowEnd: windows.current ? new Date(windows.current.end) : null,
    },
    participants: rows.length,
    topStudents: rows.slice(0, 3).map(sanitizeRow),
    rows: rows.map(sanitizeRow),
    me,
  };
};

export default { getLeaderboard };
