import mongoose from 'mongoose';
import CourseProgress from '../models/course-progress.model.js';
import Course from '../models/course.model.js';
import ClassModel from '../models/class.model.js';
import Assignment from '../models/assignment.model.js';
import McqTest from '../models/mcq.model.js';
import Submission from '../models/submission.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import ApiError from '../utils/api-error.js';
import { hasActiveCourseEnrollment } from '../utils/course-access.util.js';

const round2 = (value) => Math.round(value * 100) / 100;

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

export default { getProgress, markLessonComplete, markAssignmentComplete, markMcqComplete };
