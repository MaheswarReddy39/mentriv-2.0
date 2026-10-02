import { Router } from 'express';
import { getAchievements } from '../controllers/achievement.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

router.get('/achievements', requireAuth, requireRole('student'), getAchievements);

export default router;
