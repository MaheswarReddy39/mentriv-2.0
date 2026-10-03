import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listByCourse,
  getAssignmentById,
  createAssignment,
  createAssignmentsForCourses,
  updateAssignment,
  archiveAssignment,
} from '../controllers/assignment.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { MAX_BULK_COURSES } from '../utils/course-ids.util.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const ASSIGNMENT_CREATE_ROLES = ['teacher', ...ADMIN_ROLES];
const ASSIGNMENT_STATUSES = ['draft', 'published', 'archived'];

const courseIdParamRule = param('courseId').isMongoId().withMessage('Invalid course id');
const idParamRule = param('id').isMongoId().withMessage('Invalid assignment id');

const attachmentItemRules = [
  body('attachments.*.title')
    .if(body('attachments').isArray())
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Attachment titles must be between 1 and 200 characters'),
  body('attachments.*.url')
    .if(body('attachments').isArray())
    .optional()
    .trim()
    .custom((value) => !/\s/.test(value))
    .withMessage('Attachment URLs must not contain whitespace'),
];

const durationRule = body('duration')
  .optional()
  .custom((value) => {
    if (value === null || value === '') return true;
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 1) {
      throw new Error('Duration must be a whole number of minutes (1 or more)');
    }
    return true;
  });

const createBodyValidation = [
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
  body('assignmentType')
    .optional({ values: 'falsy' })
    .isIn(['normalTest'])
    .withMessage('Assignment type must be normalTest'),
  body('instructions')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Instructions cannot exceed 5000 characters'),
  body('dueDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  durationRule,
  body('maxMarks')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Max marks must be a non-negative number'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  ...attachmentItemRules,
  body('status')
    .optional({ values: 'falsy' })
    .isIn(ASSIGNMENT_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
];

const courseIdsRules = [
  body('courseIds')
    .isArray({ min: 1, max: MAX_BULK_COURSES })
    .withMessage(`Select between 1 and ${MAX_BULK_COURSES} courses`),
  body('courseIds.*').isMongoId().withMessage('Invalid course id'),
  body('courseIds').custom((value) => {
    if (!Array.isArray(value)) return true;
    if (new Set(value.map(String)).size !== value.length) {
      throw new Error('Duplicate courses are not allowed');
    }
    return true;
  }),
];

const createValidation = [courseIdParamRule, ...createBodyValidation];

const bulkCreateValidation = [...courseIdsRules, ...createBodyValidation];

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
  body('instructions')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Instructions cannot exceed 5000 characters'),
  body('dueDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  durationRule,
  body('maxMarks')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Max marks must be a non-negative number'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  ...attachmentItemRules,
  body('status')
    .optional({ values: 'falsy' })
    .isIn(ASSIGNMENT_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('courseId').not().exists().withMessage('Assignments cannot be moved between courses'),
  body('courseIds').not().exists().withMessage('Assignments cannot be moved between courses'),
];

router.get('/courses/:courseId/assignments', requireAuth, validate([courseIdParamRule]), listByCourse);
router.get('/assignments/:id', requireAuth, validate([idParamRule]), getAssignmentById);
router.post(
  '/assignments/bulk',
  requireAuth,
  requireRole(...ASSIGNMENT_CREATE_ROLES),
  validate(bulkCreateValidation),
  createAssignmentsForCourses
);
router.post(
  '/courses/:courseId/assignments',
  requireAuth,
  requireRole(...ASSIGNMENT_CREATE_ROLES),
  validate(createValidation),
  createAssignment
);
router.patch(
  '/assignments/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(updateValidation),
  updateAssignment
);
router.delete(
  '/assignments/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate([idParamRule]),
  archiveAssignment
);

export default router;
