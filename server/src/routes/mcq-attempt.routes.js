import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  startAttempt,
  submitAttempt,
  getMyAttempts,
  getAttemptById,
  listAttempts,
} from '../controllers/mcq-attempt.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const ATTEMPT_STATUSES = ['in_progress', 'submitted', 'evaluated', 'abandoned'];

const testIdParamRule = param('id').isMongoId().withMessage('Invalid MCQ test id');
const attemptIdParamRule = param('id').isMongoId().withMessage('Invalid attempt id');

const submitBodyRules = [
  body('answers')
    .notEmpty()
    .withMessage('Answers are required')
    .isArray()
    .withMessage('Answers must be an array'),
  body('answers.*.questionOrder')
    .if(body('answers').isArray())
    .notEmpty()
    .withMessage('Each answer requires a questionOrder')
    .isInt({ min: 0 })
    .withMessage('Question order must be a non-negative integer'),
  body('answers.*.selectedOption')
    .if(body('answers').isArray())
    .custom((value) => value === null || (Number.isInteger(Number(value)) && Number(value) >= 0))
    .withMessage('Selected option must be a non-negative integer or null'),
  body('answers.*.marksAwarded')
    .not()
    .exists()
    .withMessage('marksAwarded is calculated server-side'),
  body('score').not().exists().withMessage('score is calculated server-side'),
  body('totalMarks').not().exists().withMessage('totalMarks is calculated server-side'),
  body('percentage').not().exists().withMessage('percentage is calculated server-side'),
  body('passed').not().exists().withMessage('passed is calculated server-side'),
  body('correctOption').not().exists().withMessage('correctOption cannot be submitted'),
  body('status').not().exists().withMessage('Status transitions are handled server-side'),
  body('studentId').not().exists().withMessage('studentId comes from the authenticated session'),
  body('attemptNumber').not().exists().withMessage('attemptNumber is assigned automatically'),
];

const paginationRules = [
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
];

const statusFilterRule = query('status')
  .optional({ values: 'falsy' })
  .trim()
  .isIn(ATTEMPT_STATUSES)
  .withMessage('Status must be one of: in_progress, submitted, evaluated, abandoned');

const myListValidation = [
  ...paginationRules,
  statusFilterRule,
  query('mcqTestId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid MCQ test id'),
];

const adminListValidation = [
  ...paginationRules,
  statusFilterRule,
  query('mcqTestId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid MCQ test id'),
  query('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid course id'),
  query('studentId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid student id'),
];

const startBodyRules = [
  body('studentId').not().exists().withMessage('studentId comes from the authenticated session'),
  body('attemptNumber').not().exists().withMessage('attemptNumber is assigned automatically'),
  body('status').not().exists().withMessage('Status transitions are handled server-side'),
  body('startedAt').not().exists().withMessage('startedAt is set automatically'),
  body('score').not().exists().withMessage('score is calculated server-side'),
];

router.post(
  '/mcq-tests/:id/attempts',
  requireAuth,
  validate([testIdParamRule, ...startBodyRules]),
  startAttempt
);
router.post(
  '/mcq-attempts/:id/submit',
  requireAuth,
  validate([attemptIdParamRule, ...submitBodyRules]),
  submitAttempt
);
router.get('/mcq-attempts/my', requireAuth, validate(myListValidation), getMyAttempts);
router.get('/mcq-attempts/:id', requireAuth, validate([attemptIdParamRule]), getAttemptById);
router.get(
  '/mcq-attempts',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminListValidation),
  listAttempts
);

export default router;
