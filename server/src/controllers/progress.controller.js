import asyncHandler from '../utils/async-handler.js';
import progressService from '../services/progress.service.js';

const getProgress = asyncHandler(async (req, res) => {
  const { progress } = await progressService.getProgress(req.user, req.params.courseId);

  res.status(200).json({
    status: 'success',
    data: { progress },
  });
});

const completeLesson = asyncHandler(async (req, res) => {
  const { progress, alreadyCompleted } = await progressService.markLessonComplete(
    req.user,
    req.params.courseId,
    req.params.classId
  );

  res.status(200).json({
    status: 'success',
    message: alreadyCompleted
      ? 'Lesson was already marked complete'
      : 'Lesson marked complete successfully',
    data: { progress, alreadyCompleted },
  });
});

const completeAssignment = asyncHandler(async (req, res) => {
  const { progress, alreadyCompleted } = await progressService.markAssignmentComplete(
    req.user,
    req.params.courseId,
    req.params.assignmentId
  );

  res.status(200).json({
    status: 'success',
    message: alreadyCompleted
      ? 'Assignment was already marked complete'
      : 'Assignment marked complete successfully',
    data: { progress, alreadyCompleted },
  });
});

const completeMcq = asyncHandler(async (req, res) => {
  const { progress, alreadyCompleted } = await progressService.markMcqComplete(
    req.user,
    req.params.courseId,
    req.params.mcqTestId
  );

  res.status(200).json({
    status: 'success',
    message: alreadyCompleted
      ? 'MCQ test was already marked complete'
      : 'MCQ test marked complete successfully',
    data: { progress, alreadyCompleted },
  });
});

export { getProgress, completeLesson, completeAssignment, completeMcq };
