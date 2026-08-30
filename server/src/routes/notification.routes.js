import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createAdminNotification,
  listAdminNotifications,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();
const ADMIN_ROLES = ['admin', 'superAdmin'];
const ADMIN_AUDIENCES = ['all', 'students', 'teachers'];

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

const listValidation = [
  ...paginationRules,
  query('isRead')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => {
      const normalized = String(value).toLowerCase();
      return normalized === 'true' ? true : normalized === 'false' ? false : undefined;
    }),
  query('type')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['class', 'assignment', 'payment', 'enrollment', 'announcement', 'system'])
    .withMessage('Invalid notification type'),
];

const idParamRule = param('id').isMongoId().withMessage('Invalid notification id');

const adminCreateValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Notification Title is required')
    .isLength({ max: 150 })
    .withMessage('Notification Title cannot exceed 150 characters'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Notification Message is required')
    .isLength({ max: 1000 })
    .withMessage('Notification Message cannot exceed 1000 characters'),
  body('audience')
    .trim()
    .toLowerCase()
    .isIn(ADMIN_AUDIENCES)
    .withMessage('Send To must be All, Students, or Teachers'),
  body('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid course id'),
  body('recipientId').not().exists().withMessage('Recipients are resolved by the backend'),
  body('recipientRole').not().exists().withMessage('Recipients are resolved by the backend'),
  body('isRead').not().exists().withMessage('Read state is managed by the backend'),
  body('type').not().exists().withMessage('Notification type is managed by the backend'),
];

// Defense in depth: clients may not alter any notification content or ownership.
const readUpdateBodyGuards = [
  body('recipientId').not().exists().withMessage('recipientId cannot be changed'),
  body('recipientRole').not().exists().withMessage('recipientRole cannot be changed'),
  body('type').not().exists().withMessage('type cannot be changed'),
  body('title').not().exists().withMessage('title cannot be changed'),
  body('message').not().exists().withMessage('message cannot be changed'),
  body('link').not().exists().withMessage('link cannot be changed'),
  body('isRead').not().exists().withMessage('isRead is managed by this endpoint automatically'),
];

router.get('/notifications', requireAuth, validate(listValidation), listNotifications);
router.get(
  '/notifications/admin',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(paginationRules),
  listAdminNotifications
);
router.post(
  '/notifications/admin',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminCreateValidation),
  createAdminNotification
);
router.get(
  '/notifications/unread-count',
  requireAuth,
  getUnreadCount
);
router.patch(
  '/notifications/read-all',
  requireAuth,
  markAllNotificationsRead
);
router.patch(
  '/notifications/:id/read',
  requireAuth,
  validate([idParamRule, ...readUpdateBodyGuards]),
  markNotificationRead
);

export default router;
