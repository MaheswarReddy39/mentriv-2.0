import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getProgress,
  completeLesson,
  completeAssignment,
  completeMcq,
} from '../controllers/progress.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();

const courseIdParamRule = param('courseId').isMongoId().withMessage('Invalid course id');
const classIdParamRule = param('classId').isMongoId().withMessage('Invalid lesson id');
const assignmentIdParamRule = param('assignmentId').isMongoId().withMessage('Invalid assignment id');
const mcqTestIdParamRule = param('mcqTestId').isMongoId().withMessage('Invalid MCQ test id');

const noClientOverrides = [
  body('studentId').not().exists().withMessage('studentId comes from the authenticated session'),
  body('completedAt').not().exists().withMessage('completion timestamps are set automatically'),
  body('overallPercentage').not().exists().withMessage('overall percentage is calculated server-side'),
];

router.get(
  '/courses/:courseId/progress',
  requireAuth,
  validate([courseIdParamRule]),
  getProgress
);
router.post(
  '/courses/:courseId/progress/lessons/:classId/complete',
  requireAuth,
  validate([...noClientOverrides, courseIdParamRule, classIdParamRule]),
  completeLesson
);
router.post(
  '/courses/:courseId/progress/assignments/:assignmentId/complete',
  requireAuth,
  validate([...noClientOverrides, courseIdParamRule, assignmentIdParamRule]),
  completeAssignment
);
router.post(
  '/courses/:courseId/progress/mcq-tests/:mcqTestId/complete',
  requireAuth,
  validate([...noClientOverrides, courseIdParamRule, mcqTestIdParamRule]),
  completeMcq
);

export default router;
