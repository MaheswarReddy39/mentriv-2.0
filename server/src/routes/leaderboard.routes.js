import { Router } from 'express';
import { query } from 'express-validator';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const leaderboardQueryRules = [
  query('courseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Invalid course id'),
  query('timeFilter')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['week', 'month', 'all'])
    .withMessage('Invalid time filter'),
];

router.get(
  '/leaderboard',
  requireAuth,
  requireRole('student'),
  validate(leaderboardQueryRules),
  getLeaderboard
);

export default router;
