import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listByCourse,
  getTestById,
  createTest,
  updateTest,
  archiveTest,
} from '../controllers/mcq.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const MCQ_CREATE_ROLES = ['teacher', ...ADMIN_ROLES];
const MCQ_STATUSES = ['draft', 'published', 'archived'];

const courseIdParamRule = param('courseId').isMongoId().withMessage('Invalid course id');
const idParamRule = param('id').isMongoId().withMessage('Invalid MCQ test id');

const questionItemRules = [
  body('questions.*.question')
    .if(body('questions').isArray())
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question text must be between 1 and 1000 characters'),
  body('questions.*.options')
    .if(body('questions').isArray())
    .optional()
    .isArray({ min: 2 })
    .withMessage('Each question must have at least two options'),
  body('questions.*.options.*')
    .if(body('questions').isArray())
    .optional()
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Options must be non-empty and under 300 characters'),
  body('questions.*.correctOption')
    .if(body('questions').isArray())
    .optional()
    .isInt({ min: 0 })
    .withMessage('Correct option must be a non-negative integer index'),
  body('questions.*.marks')
    .if(body('questions').isArray())
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Question marks must be a non-negative number'),
  body('questions.*.order')
    .if(body('questions').isArray())
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Question order must be a non-negative integer'),
  body('questions.*.explanation')
    .if(body('questions').isArray())
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Explanation cannot exceed 2000 characters'),
];

const createValidation = [
  ...[courseIdParamRule],
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('questions').optional().isArray().withMessage('Questions must be an array'),
  ...questionItemRules,
  body('duration')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('passingScore')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(MCQ_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
];

const updateValidation = [
  idParamRule,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('questions').optional().isArray().withMessage('Questions must be an array'),
  ...questionItemRules,
  body('duration')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('passingScore')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(MCQ_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('courseId').not().exists().withMessage('Tests cannot be moved between courses'),
];

router.get('/courses/:courseId/mcq-tests', requireAuth, validate([courseIdParamRule]), listByCourse);
router.get('/mcq-tests/:id', requireAuth, validate([idParamRule]), getTestById);
router.post(
  '/courses/:courseId/mcq-tests',
  requireAuth,
  requireRole(...MCQ_CREATE_ROLES),
  validate(createValidation),
  createTest
);
router.patch(
  '/mcq-tests/:id',
  requireAuth,
  requireRole(...MCQ_CREATE_ROLES),
  validate(updateValidation),
  updateTest
);
router.delete(
  '/mcq-tests/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate([idParamRule]),
  archiveTest
);

export default router;
