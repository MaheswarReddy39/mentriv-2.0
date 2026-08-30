import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  submitPayment,
  getMyPayments,
  getPaymentById,
  listPayments,
  updatePaymentStatus,
} from '../controllers/payment.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const PAYMENT_STATUSES = ['pending', 'verified', 'rejected'];

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
  .isIn(PAYMENT_STATUSES)
  .withMessage('Status must be one of: pending, verified, rejected');

const idParamRule = param('id').isMongoId().withMessage('Invalid payment id');

const screenshotUrlRule = body('screenshotUrl')
  .optional({ values: 'falsy' })
  .trim()
  .custom((value) => /^(https?:\/\/\S+|\/[a-zA-Z0-9._~\-/]+)$/.test(value))
  .withMessage('Screenshot URL must be a valid http(s) URL or a root-relative path');

const createValidation = [
  body('enrollmentId')
    .trim()
    .notEmpty()
    .withMessage('Enrollment identifier is required')
    .isMongoId()
    .withMessage('Invalid enrollment id'),
  body('transactionId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Transaction ID cannot exceed 100 characters'),
  screenshotUrlRule,
  body('currency')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .equals('INR')
    .withMessage('Only INR payments are supported'),
  body('paymentMethod')
    .optional({ values: 'falsy' })
    .trim()
    .toLowerCase()
    .isIn(['upi'])
    .withMessage('Unsupported payment method'),
  body('amount').not().exists().withMessage('Amount is derived from the course price'),
  body('status').not().exists().withMessage('Status cannot be set by clients'),
  body('verifiedBy').not().exists().withMessage('verifiedBy cannot be set by clients'),
  body('verifiedAt').not().exists().withMessage('verifiedAt cannot be set by clients'),
  body('userId').not().exists().withMessage('userId cannot be set by clients'),
];

const myListValidation = [
  ...paginationRules,
  statusFilterRule,
];

const adminListValidation = [
  ...paginationRules,
  statusFilterRule,
  query('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid course id'),
  query('enrollmentId')
    .optional({ values: 'falsy' })
    .trim()
    .isMongoId()
    .withMessage('Invalid enrollment id'),
];

const statusUpdateValidation = [
  idParamRule,
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['verified', 'rejected'])
    .withMessage('Status must be either verified or rejected'),
  body('rejectionReason')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Rejection reason must be between 5 and 500 characters'),
];

router.post('/', requireAuth, validate(createValidation), submitPayment);
router.get('/my', requireAuth, validate(myListValidation), getMyPayments);
router.get(
  '/',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminListValidation),
  listPayments
);
router.get('/:id', requireAuth, validate([idParamRule]), getPaymentById);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(statusUpdateValidation),
  updatePaymentStatus
);

export default router;
