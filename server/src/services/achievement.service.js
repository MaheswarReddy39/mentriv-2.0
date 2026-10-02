import mongoose from 'mongoose';
import CourseProgress from '../models/course-progress.model.js';
import Submission from '../models/submission.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import ClassModel from '../models/class.model.js';
import Assignment from '../models/assignment.model.js';
import McqTest from '../models/mcq.model.js';
import Enrollment from '../models/enrollment.model.js';
import { ACTIVE_ACCESS_STATUSES } from '../utils/course-access.util.js';

// Student-level, cumulative achievements derived from existing activity data.
// Nothing is written to the database: unlock state and unlock dates are
// computed from immutable completion/submission/attempt timestamps, so the
// endpoint is naturally idempotent (refreshing can never duplicate unlocks).

// Same completion statuses as the Progress/Leaderboard services.
const SUCCESS_SUBMISSION_STATUSES = ['submitted', 'late', 'reviewed'];
const SCORED_ATTEMPT_STATUSES = ['submitted', 'evaluated'];

const DAY_MS = 24 * 60 * 60 * 1000;
const ASSIGNMENT_ACE_RATIO = 0.9;

// The catalog defines requirements once; each entry is evaluated against the
// same deduplicated event sets (unique class / unique assignment / unique set).
const ACHIEVEMENT_CATALOG = [
  {
    id: 'first-class',
    category: 'learning',
    title: 'First Class',
    description: 'Complete your first class on Mentriv.',
    requirement: 'Complete 1 class',
    target: 1,
    kind: 'classes',
  },
  {
    id: 'ten-classes',
    category: 'learning',
    title: '10 Classes',
    description: 'Complete 10 unique classes across your courses.',
    requirement: 'Complete 10 classes',
    target: 10,
    kind: 'classes',
  },
  {
    id: 'twenty-five-classes',
    category: 'learning',
    title: '25 Classes',
    description: 'Complete 25 unique classes across your courses.',
    requirement: 'Complete 25 classes',
    target: 25,
    kind: 'classes',
  },
  {
    id: 'first-assignment',
    category: 'assignments',
    title: 'First Assignment',
    description: 'Successfully submit your first assignment.',
    requirement: 'Submit 1 assignment',
    target: 1,
    kind: 'assignments',
  },
  {
    id: 'five-assignments',
    category: 'assignments',
    title: '5 Assignments',
    description: 'Complete 5 unique assignments across your courses.',
    requirement: 'Complete 5 assignments',
    target: 5,
    kind: 'assignments',
  },
  {
    id: 'ten-assignments',
    category: 'assignments',
    title: '10 Assignments',
    description: 'Complete 10 unique assignments across your courses.',
    requirement: 'Complete 10 assignments',
    target: 10,
    kind: 'assignments',
  },
  {
    id: 'first-practice',
    category: 'practice',
    title: 'First Practice',
    description: 'Submit your first practice set.',
    requirement: 'Attempt 1 practice set',
    target: 1,
    kind: 'practices',
  },
  {
    id: 'ten-practices',
    category: 'practice',
    title: '10 Practices',
    description: 'Attempt 10 unique practice sets across your courses.',
    requirement: 'Attempt 10 practice sets',
    target: 10,
    kind: 'practices',
  },
  {
    id: 'practice-master',
    category: 'practice',
    title: 'Practice Master',
    description: 'Attempt 25 unique practice sets across your courses.',
    requirement: 'Attempt 25 practice sets',
    target: 25,
    kind: 'practices',
  },
  {
    id: 'perfect-score',
    category: 'performance',
    title: 'Perfect Score',
    description: 'Score 100% in any practice set.',
    requirement: 'Score 100% in a practice set',
    target: 1,
    kind: 'perfect',
  },
  {
    id: 'assignment-ace',
    category: 'performance',
    title: 'Assignment Ace',
    description: 'Score 90% or higher on an assignment.',
    requirement: 'Score 90% on an assignment',
    target: 1,
    kind: 'assignmentScore',
  },
  {
    id: 'week-streak',
    category: 'streak',
    title: 'Week Streak',
    description: 'Learn on 7 days in a row.',
    requirement: 'Keep a 7-day learning streak',
    target: 7,
    kind: 'streak',
  },
  {
    id: 'month-streak',
    category: 'streak',
    title: 'Month Streak',
    description: 'Learn on 30 days in a row.',
    requirement: 'Keep a 30-day learning streak',
    target: 30,
    kind: 'streak',
  },
];

// The student's active course population (approved/completed enrollments).
// Activity outside these course/person pairs never counts.
const resolveStudentScope = async (requester) => {
  const enrollments = await Enrollment.find({
    userId: requester.id,
    status: { $in: ACTIVE_ACCESS_STATUSES },
  })
    .select('courseId')
    .lean();

  const courseIds = [...new Set(enrollments.map((entry) => entry.courseId.toString()))];
  return { courseIds };
};

const groupDatesBy = (docs, keyOf, dateOf) => {
  const earliest = new Map();
  docs.forEach((doc) => {
    const key = keyOf(doc);
    const date = dateOf(doc);
    if (!key || !date) return;
    const time = new Date(date).getTime();
    if (!Number.isFinite(time)) return;
    const existing = earliest.get(key);
    if (existing === undefined || time < existing) earliest.set(key, time);
  });
  return [...earliest.values()].sort((a, b) => a - b);
};

// Longest run of consecutive activity days + the day each streak length was
// first reached (used as the streak achievement unlock date).
const analyzeStreak = (times) => {
  const dayKeys = [
    ...new Set(
      times.map((time) => {
        const d = new Date(time);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
      })
    ),
  ].sort();

  let maxStreak = 0;
  let run = 0;
  let previous = null;
  const milestones = new Map();

  dayKeys.forEach((key) => {
    const time = Date.parse(`${key}T00:00:00Z`);
    if (previous !== null && time - previous === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    previous = time;
    if (run > maxStreak) maxStreak = run;
    if (!milestones.has(run)) milestones.set(run, key);
  });

  return { maxStreak, milestones };
};

const loadActivity = async (requester, courseIds) => {
  const empty = {
    classDates: [],
    assignmentDates: [],
    assignmentAceDates: [],
    practiceDates: [],
    perfectDates: [],
    streak: { maxStreak: 0, milestones: new Map() },
  };

  if (courseIds.length === 0) return empty;

  const studentId = new mongoose.Types.ObjectId(String(requester.id));
  const courseFilter = { $in: courseIds };

  const [progressDocs, submissions, attempts, classDocs, assignmentDocs, testDocs] =
    await Promise.all([
      CourseProgress.find({ studentId, courseId: courseFilter })
        .select('completedLessons')
        .lean(),
      Submission.find({
        studentId,
        courseId: courseFilter,
        status: { $in: SUCCESS_SUBMISSION_STATUSES },
      })
        .select('assignmentId courseId submittedAt marks attemptNumber')
        .sort({ submittedAt: 1, attemptNumber: 1 })
        .lean(),
      McqAttempt.find({
        studentId,
        courseId: courseFilter,
        status: { $in: SCORED_ATTEMPT_STATUSES },
      })
        .select('mcqTestId courseId submittedAt percentage attemptNumber')
        .sort({ submittedAt: 1, attemptNumber: 1 })
        .lean(),
      ClassModel.find({ courseId: courseFilter, status: 'published' }).select('_id').lean(),
      Assignment.find({ courseId: courseFilter, status: 'published' })
        .select('_id maxMarks')
        .lean(),
      McqTest.find({ courseId: courseFilter, status: 'published' }).select('_id').lean(),
    ]);

  const publishedClassIds = new Set(classDocs.map((doc) => doc._id.toString()));
  const publishedAssignment = new Map(
    assignmentDocs.map((doc) => [doc._id.toString(), Number(doc.maxMarks) || 0])
  );
  const publishedTestIds = new Set(testDocs.map((doc) => doc._id.toString()));

  // CLASSES: one completion per unique class (re-watches never re-count).
  const classTimes = [];
  const activityTimes = [];
  const seenClasses = new Set();
  progressDocs.forEach((doc) => {
    (doc.completedLessons || []).forEach((entry) => {
      const classId = entry.classId.toString();
      if (!publishedClassIds.has(classId) || seenClasses.has(classId)) return;
      seenClasses.add(classId);
      const time = new Date(entry.completedAt).getTime();
      if (Number.isFinite(time)) {
        classTimes.push(time);
        activityTimes.push(time);
      }
    });
  });
  classTimes.sort((a, b) => a - b);

  // ASSIGNMENTS: one completion per unique assignment (earliest successful
  // submission is the completion moment; resubmissions never re-count).
  const successfulByAssignment = new Map();
  submissions.forEach((doc) => {
    const assignmentId = doc.assignmentId.toString();
    if (!publishedAssignment.has(assignmentId)) return;
    if (!successfulByAssignment.has(assignmentId)) successfulByAssignment.set(assignmentId, []);
    successfulByAssignment.get(assignmentId).push(doc);
  });

  const assignmentTimes = [];
  const assignmentAceTimes = [];
  successfulByAssignment.forEach((rows) => {
    const first = rows[0];
    const firstTime = new Date(first.submittedAt).getTime();
    if (Number.isFinite(firstTime)) assignmentTimes.push(firstTime);

    rows.forEach((row) => {
      const rowTime = new Date(row.submittedAt).getTime();
      if (Number.isFinite(rowTime)) activityTimes.push(rowTime);
      if (row.marks === null || row.marks === undefined) return;
      const maxMarks = publishedAssignment.get(row.assignmentId.toString());
      if (!(maxMarks > 0)) return;
      const ratio = Number(row.marks) / maxMarks;
      if (ratio + 1e-9 >= ASSIGNMENT_ACE_RATIO) {
        if (Number.isFinite(rowTime)) assignmentAceTimes.push(rowTime);
      }
    });
  });
  assignmentTimes.sort((a, b) => a - b);
  assignmentAceTimes.sort((a, b) => a - b);

  // PRACTICES: one per unique practice set (retries never re-count; the
  // earliest submitted attempt is the completion moment). Previous attempts
  // remain untouched in history.
  const successfulByTest = new Map();
  attempts.forEach((doc) => {
    if (!doc.submittedAt) return;
    const testId = doc.mcqTestId.toString();
    if (!publishedTestIds.has(testId)) return;
    if (!successfulByTest.has(testId)) successfulByTest.set(testId, []);
    successfulByTest.get(testId).push(doc);
  });

  const practiceTimes = [];
  const perfectTimes = [];
  successfulByTest.forEach((rows) => {
    const firstTime = new Date(rows[0].submittedAt).getTime();
    if (Number.isFinite(firstTime)) practiceTimes.push(firstTime);

    rows.forEach((row) => {
      const time = new Date(row.submittedAt).getTime();
      if (Number.isFinite(time)) activityTimes.push(time);
      if (Number(row.percentage) !== 100) return;
      if (Number.isFinite(time)) perfectTimes.push(time);
    });
  });
  practiceTimes.sort((a, b) => a - b);
  perfectTimes.sort((a, b) => a - b);

  // Streak = consecutive days with ANY learning activity (classes, assignment
  // submissions, practice attempts). Derived from existing timestamps only -
  // no separate streak model is created.
  const streak = analyzeStreak(activityTimes);

  return {
    classDates: classTimes,
    assignmentDates: assignmentTimes,
    assignmentAceDates: assignmentAceTimes,
    practiceDates: practiceTimes,
    perfectDates: perfectTimes,
    streak,
  };
};

// The nth event (1-based) unlocks count milestones; its timestamp is the
// unlock date. current/target are capped so unlocked achievements display a
// clean target/target progress in the modal.
const evaluateCount = (dates, target) => {
  const count = dates.length;
  const unlocked = count >= target;
  return {
    unlocked,
    current: unlocked ? target : count,
    unlockedAt: unlocked ? new Date(dates[target - 1]) : null,
  };
};

const evaluateFlag = (dates, target) => {
  const reached = dates.length > 0;
  return {
    unlocked: reached,
    current: reached ? target : 0,
    unlockedAt: reached ? new Date(dates[0]) : null,
  };
};

const evaluateStreak = (streakInfo, target) => {
  const reached = streakInfo.maxStreak >= target;
  const milestone = streakInfo.milestones.get(target);
  return {
    unlocked: reached,
    current: reached ? target : streakInfo.maxStreak,
    unlockedAt: reached && milestone ? new Date(`${milestone}T00:00:00`) : null,
  };
};

const evaluateAchievement = (definition, activity) => {
  switch (definition.kind) {
    case 'classes':
      return evaluateCount(activity.classDates, definition.target);
    case 'assignments':
      return evaluateCount(activity.assignmentDates, definition.target);
    case 'practices':
      return evaluateCount(activity.practiceDates, definition.target);
    case 'perfect':
      return evaluateFlag(activity.perfectDates, definition.target);
    case 'assignmentScore':
      return evaluateFlag(activity.assignmentAceDates, definition.target);
    case 'streak':
      return evaluateStreak(activity.streak, definition.target);
    default:
      return { unlocked: false, current: 0, unlockedAt: null };
  }
};

const getAchievements = async (requester) => {
  const { courseIds } = await resolveStudentScope(requester);
  const activity = await loadActivity(requester, courseIds);

  const achievements = ACHIEVEMENT_CATALOG.map((definition) => {
    const evaluation = evaluateAchievement(definition, activity);
    return {
      id: definition.id,
      category: definition.category,
      title: definition.title,
      description: definition.description,
      requirement: definition.requirement,
      status: evaluation.unlocked ? 'unlocked' : 'locked',
      current: evaluation.current,
      target: definition.target,
      unlockedAt: evaluation.unlockedAt,
    };
  });

  const unlocked = achievements.filter((entry) => entry.status === 'unlocked');
  const recentUnlocked = [...unlocked]
    .sort((a, b) => {
      const delta = new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      if (delta !== 0) return delta;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 3);

  return {
    total: achievements.length,
    unlocked: unlocked.length,
    remaining: achievements.length - unlocked.length,
    completionPercentage:
      achievements.length > 0
        ? Math.round((unlocked.length / achievements.length) * 100)
        : 0,
    achievements,
    recentUnlocked,
  };
};

export default { getAchievements };
