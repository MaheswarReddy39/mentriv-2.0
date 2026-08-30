import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { listStudents, updateStudentStatus } from '../controllers/student.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();
const ADMIN_ROLES = ['admin', 'superAdmin'];

const listValidation = [
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

const statusUpdateValidation = [
  param('id').isMongoId().withMessage('Invalid student id'),
  body('status')
    .trim()
    .toLowerCase()
    .isIn(['accepted', 'rejected'])
    .withMessage('Status must be accepted or rejected'),
];

router.get('/', requireAuth, requireRole(...ADMIN_ROLES), validate(listValidation), listStudents);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(statusUpdateValidation),
  updateStudentStatus
);

export default router;
