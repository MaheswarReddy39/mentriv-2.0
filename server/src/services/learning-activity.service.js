import mongoose from 'mongoose';
import CourseProgress from '../models/course-progress.model.js';
import Submission from '../models/submission.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import CodingSubmission from '../models/coding-submission.model.js';
import CodingTask from '../models/coding-task.model.js';
import Enrollment from '../models/enrollment.model.js';
import { ACTIVE_ACCESS_STATUSES } from '../utils/course-access.util.js';

const SUCCESS_SUBMISSION_STATUSES = ['submitted', 'late', 'reviewed'];
const SCORED_ATTEMPT_STATUSES = ['submitted', 'evaluated'];
const ACTIVITY_TYPES = ['class', 'assignment', 'mcq', 'coding'];
const WINDOW_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (value) => {
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const utcDayStart = (value) => {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const addDays = (date, amount) => new Date(date.getTime() + amount * DAY_MS);

const resolveStudentScope = async (requester) => {
  const enrollments = await Enrollment.find({
    userId: requester.id,
    status: { $in: ACTIVE_ACCESS_STATUSES },
  })
    .select('courseId')
    .lean();

  return [...new Set(enrollments.map((entry) => entry.courseId.toString()))];
};

const computeStats = (activeDates, windowStart, today) => {
  const totalActiveDays = activeDates.size;

  let currentStreak = 0;
  let cursor = activeDates.has(toDateKey(today)) ? new Date(today) : addDays(today, -1);
  while (cursor.getTime() >= windowStart.getTime() && activeDates.has(toDateKey(cursor))) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let maxStreak = 0;
  let run = 0;
  for (let day = new Date(windowStart); day.getTime() <= today.getTime(); day = addDays(day, 1)) {
    if (activeDates.has(toDateKey(day))) {
      run += 1;
      if (run > maxStreak) maxStreak = run;
    } else {
      run = 0;
    }
  }

  return { totalActiveDays, currentStreak, maxStreak };
};

const getLearningActivity = async (requester) => {
  const today = utcDayStart(new Date());
  const windowStart = addDays(today, -(WINDOW_DAYS - 1));
  const range = { from: toDateKey(windowStart), to: toDateKey(today), days: WINDOW_DAYS };
  const empty = { range, days: [], stats: { totalActiveDays: 0, currentStreak: 0, maxStreak: 0 } };

  const courseIds = await resolveStudentScope(requester);
  if (courseIds.length === 0) return empty;

  const studentId = new mongoose.Types.ObjectId(String(requester.id));
  const courseFilter = { $in: courseIds };
  const timeFilter = { $gte: windowStart };

  const [progressDocs, submissions, attempts, codingTaskIds, codingDocs] = await Promise.all([
    CourseProgress.find({ studentId, courseId: courseFilter })
      .select('completedLessons')
      .lean(),
    Submission.find({
      studentId,
      courseId: courseFilter,
      status: { $in: SUCCESS_SUBMISSION_STATUSES },
      submittedAt: timeFilter,
    })
      .select('assignmentId submittedAt')
      .lean(),
    McqAttempt.find({
      studentId,
      courseId: courseFilter,
      status: { $in: SCORED_ATTEMPT_STATUSES },
      submittedAt: timeFilter,
    })
      .select('mcqTestId submittedAt')
      .lean(),
    CodingTask.distinct('_id', { courseIds: courseFilter }),
    CodingSubmission.find({ studentId, courseId: courseFilter, createdAt: timeFilter })
      .select('taskId createdAt')
      .lean(),
  ]);

  const scopedTaskIds = new Set(codingTaskIds.map((id) => id.toString()));

  const seen = new Set();
  const events = [];
  const addEvent = (occurredAt, type, refId) => {
    const time = new Date(occurredAt).getTime();
    if (!Number.isFinite(time)) return;
    const date = toDateKey(utcDayStart(time));
    if (date < range.from || date > range.to) return;
    const key = `${date}|${type}|${refId}`;
    if (seen.has(key)) return;
    seen.add(key);
    events.push({ date, type, refId });
  };

  progressDocs.forEach((doc) => {
    (doc.completedLessons || []).forEach((entry) => {
      addEvent(entry.completedAt, 'class', entry.classId.toString());
    });
  });

  submissions.forEach((doc) => {
    addEvent(doc.submittedAt, 'assignment', doc.assignmentId.toString());
  });

  attempts.forEach((doc) => {
    addEvent(doc.submittedAt, 'mcq', doc.mcqTestId.toString());
  });

  codingDocs.forEach((doc) => {
    const taskId = doc.taskId.toString();
    if (!scopedTaskIds.has(taskId)) return;
    addEvent(doc.createdAt, 'coding', taskId);
  });

  const byDate = new Map();
  events.forEach((event) => {
    let entry = byDate.get(event.date);
    if (!entry) {
      entry = { date: event.date, count: 0, types: new Set() };
      byDate.set(event.date, entry);
    }
    entry.count += 1;
    entry.types.add(event.type);
  });

  const days = [...byDate.values()]
    .map((entry) => ({
      date: entry.date,
      count: entry.count,
      types: ACTIVITY_TYPES.filter((type) => entry.types.has(type)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const activeDates = new Set(days.map((day) => day.date));

  return {
    range,
    days,
    stats: computeStats(activeDates, windowStart, today),
  };
};

export default { getLearningActivity };
