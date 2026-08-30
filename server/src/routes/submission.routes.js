import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  listSubmissions,
  listAdminSubmissionOverview,
  reviewSubmission,
} from '../controllers/submission.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const SUBMISSION_STATUSES = ['submitted', 'reviewed', 'returned', 'late'];

const idParamRule = param('id').isMongoId().withMessage('Invalid submission id');
const assignmentParamRule = param('id').isMongoId().withMessage('Invalid assignment id');

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
  .isIn(SUBMISSION_STATUSES)
  .withMessage('Status must be one of: submitted, reviewed, returned, late');

const submitValidation = [
  assignmentParamRule,
  body('submissionText')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Submission text cannot exceed 5000 characters'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
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
  body('githubRepositoryName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('GitHub repository name cannot exceed 120 characters'),
  body('githubRepositoryUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2048 })
    .withMessage('GitHub repository URL cannot exceed 2048 characters')
    .custom((value) => !value || /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(value))
    .withMessage('GitHub repository URL must be a valid GitHub repository URL'),
  body('studentId').not().exists().withMessage('studentId cannot be set by clients'),
  body('courseId').not().exists().withMessage('courseId cannot be set by clients'),
  body('status').not().exists().withMessage('Status is determined automatically'),
  body('isLate').not().exists().withMessage('Lateness is calculated automatically'),
  body('marks').not().exists().withMessage('Marks can only be set during review'),
  body('feedback').not().exists().withMessage('Feedback can only be set during review'),
  body('attemptNumber').not().exists().withMessage('Attempt numbers are assigned automatically'),
  body('reviewedBy').not().exists().withMessage('reviewedBy cannot be set by clients'),
  body('reviewedAt').not().exists().withMessage('reviewedAt cannot be set by clients'),
];

const myListValidation = [...paginationRules, statusFilterRule];

const adminListValidation = [
  ...paginationRules,
  statusFilterRule,
  query('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid course id'),
  query('assignmentId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid assignment id'),
  query('studentId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid student id'),
];

const adminOverviewValidation = [
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Search is too long'),
  query('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => value === 'all' || /^[a-f\d]{24}$/i.test(value))
    .withMessage('Invalid course id'),
  query('level')
    .optional({ values: 'falsy' })
    .trim()
    .toLowerCase()
    .isIn(['all', 'basic', 'intermediate', 'advanced'])
    .withMessage('Level must be one of: all, basic, intermediate, advanced'),
];

const reviewValidation = [
  idParamRule,
  body('marks')
    .trim()
    .notEmpty()
    .withMessage('Marks are required')
    .isFloat({ min: 0 })
    .withMessage('Marks must be a non-negative number')
    .toFloat(),
  body('feedback')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Feedback cannot exceed 2000 characters'),
];

router.post(
  '/assignments/:id/submissions',
  requireAuth,
  validate(submitValidation),
  createSubmission
);
router.get('/submissions/my', requireAuth, validate(myListValidation), getMySubmissions);
router.get(
  '/submissions/admin/overview',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminOverviewValidation),
  listAdminSubmissionOverview
);
router.get('/submissions/:id', requireAuth, validate([idParamRule]), getSubmissionById);
router.get(
  '/submissions',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminListValidation),
  listSubmissions
);
router.patch(
  '/submissions/:id/review',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(reviewValidation),
  reviewSubmission
);

export default router;
