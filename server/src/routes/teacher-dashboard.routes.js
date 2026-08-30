import { Router } from 'express';
import { query } from 'express-validator';
import {
  getTeacherDashboard,
  getTeacherLeaderboard,
  getTeacherSubmissions,
} from '../controllers/teacher-dashboard.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const levelRule = query('courseId')
  .optional({ values: 'falsy' })
  .trim()
  .custom((value) => value === 'all' || /^[a-f\d]{24}$/i.test(value))
  .withMessage('Invalid course id');

const submissionQueryRules = [
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),
  query('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => value === 'all' || /^[a-f\d]{24}$/i.test(value))
    .withMessage('Invalid course id'),
  query('level')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['all', 'beginner', 'basic', 'intermediate', 'advanced'])
    .withMessage('Invalid level'),
];

const leaderboardQueryRules = [
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),
  query('courseId')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => value === 'all' || /^[a-f\d]{24}$/i.test(value))
    .withMessage('Invalid course id'),
];

router.get('/dashboard', requireAuth, requireRole('teacher'), validate([levelRule]), getTeacherDashboard);
router.get(
  '/submissions',
  requireAuth,
  requireRole('teacher'),
  validate(submissionQueryRules),
  getTeacherSubmissions
);
router.get(
  '/leaderboard',
  requireAuth,
  requireRole('teacher'),
  validate(leaderboardQueryRules),
  getTeacherLeaderboard
);

export default router;
