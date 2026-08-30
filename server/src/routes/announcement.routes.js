import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
} from '../controllers/announcement.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const ANNOUNCEMENT_STATUSES = ['draft', 'published', 'archived'];
const ANNOUNCEMENT_TYPES = ['general', 'class', 'assignment', 'payment', 'system'];
const AUDIENCES = ['all', 'students', 'admins'];

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

const typeFilterRule = query('type')
  .optional({ values: 'falsy' })
  .trim()
  .isIn(ANNOUNCEMENT_TYPES)
  .withMessage('Invalid announcement type');

// status is honored only for admins inside the service; harmless for others.
const statusFilterRule = query('status')
  .optional({ values: 'falsy' })
  .trim()
  .isIn(ANNOUNCEMENT_STATUSES)
  .withMessage('Invalid announcement status');

const idParamRule = param('id').isMongoId().withMessage('Invalid announcement id');

const listValidation = [...paginationRules, typeFilterRule, statusFilterRule];

const createValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 5000 })
    .withMessage('Content cannot exceed 5000 characters'),
  body('type')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(ANNOUNCEMENT_TYPES)
    .withMessage('Type must be one of: general, class, assignment, payment, system'),
  body('audience')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(AUDIENCES)
    .withMessage('Audience must be one of: all, students, admins'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(ANNOUNCEMENT_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('publishedAt').not().exists().withMessage('publishedAt is set automatically on publish'),
  body('createdBy').not().exists().withMessage('createdBy comes from the authenticated session'),
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
  body('content')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Content cannot exceed 5000 characters'),
  body('type')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(ANNOUNCEMENT_TYPES)
    .withMessage('Type must be one of: general, class, assignment, payment, system'),
  body('audience')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(AUDIENCES)
    .withMessage('Audience must be one of: all, students, admins'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(ANNOUNCEMENT_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('publishedAt').not().exists().withMessage('publishedAt is set automatically on publish'),
  body('createdBy').not().exists().withMessage('createdBy cannot be changed'),
];

router.get('/announcements', optionalAuth, validate(listValidation), listAnnouncements);
router.get('/announcements/:id', optionalAuth, validate([idParamRule]), getAnnouncementById);
router.post(
  '/announcements',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(createValidation),
  createAnnouncement
);
router.patch(
  '/announcements/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(updateValidation),
  updateAnnouncement
);
router.delete(
  '/announcements/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate([idParamRule]),
  archiveAnnouncement
);

export default router;
