import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  enroll,
  getMyEnrollments,
  getEnrollmentById,
  listEnrollments,
  updateEnrollmentStatus,
} from '../controllers/enrollment.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];

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
  .isIn(ENROLLMENT_STATUSES)
  .withMessage('Status must be one of: pending, approved, rejected, completed, cancelled');

const idParamRule = param('id').isMongoId().withMessage('Invalid enrollment id');

const createValidation = [
  body('courseId')
    .trim()
    .notEmpty()
    .withMessage('Course identifier is required')
    .isMongoId()
    .withMessage('Invalid course id'),
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
];

const statusUpdateValidation = [
  idParamRule,
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(ENROLLMENT_STATUSES)
    .withMessage('Status must be one of: pending, approved, rejected, completed, cancelled'),
];

router.post('/', requireAuth, validate(createValidation), enroll);
router.get('/my', requireAuth, validate(myListValidation), getMyEnrollments);
router.get(
  '/',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminListValidation),
  listEnrollments
);
router.get('/:id', requireAuth, validate([idParamRule]), getEnrollmentById);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(statusUpdateValidation),
  updateEnrollmentStatus
);

export default router;
