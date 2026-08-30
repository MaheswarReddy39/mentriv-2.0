import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  archiveLesson,
} from '../controllers/class.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const CLASS_CREATE_ROLES = ['teacher', ...ADMIN_ROLES];
const LESSON_STATUSES = ['draft', 'published', 'archived'];

const courseIdParamRule = param('courseId').isMongoId().withMessage('Invalid course id');
const idParamRule = param('id').isMongoId().withMessage('Invalid lesson id');

const urlRule = (field, max) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => !/\s/.test(value))
    .withMessage(`${field} must not contain whitespace`)
    .isLength({ max })
    .withMessage(`${field} cannot exceed ${max} characters`);

const resourceItemRules = [
  body('resources.*.title')
    .if(body('resources').isArray())
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Resource titles must be between 1 and 200 characters'),
  body('resources.*.url')
    .if(body('resources').isArray())
    .optional()
    .trim()
    .custom((value) => !/\s/.test(value))
    .withMessage('Resource URLs must not contain whitespace'),
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
  urlRule('videoUrl', 2048),
  body('duration')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('module')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Module cannot exceed 200 characters'),
  body('order')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('resources').optional().isArray().withMessage('Resources must be an array'),
  ...resourceItemRules,
  body('status')
    .optional({ values: 'falsy' })
    .isIn(LESSON_STATUSES)
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
  urlRule('videoUrl', 2048),
  body('duration')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('module')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Module cannot exceed 200 characters'),
  body('order')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('resources').optional().isArray().withMessage('Resources must be an array'),
  ...resourceItemRules,
  body('status')
    .optional({ values: 'falsy' })
    .isIn(LESSON_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('courseId').not().exists().withMessage('Lessons cannot be moved between courses'),
];

router.get('/courses/:courseId/classes', requireAuth, validate([courseIdParamRule]), listByCourse);
router.get('/classes/:id', requireAuth, validate([idParamRule]), getLessonById);
router.post(
  '/courses/:courseId/classes',
  requireAuth,
  requireRole(...CLASS_CREATE_ROLES),
  validate(createValidation),
  createLesson
);
router.patch(
  '/classes/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(updateValidation),
  updateLesson
);
router.delete(
  '/classes/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate([idParamRule]),
  archiveLesson
);

export default router;
