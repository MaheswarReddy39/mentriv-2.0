import { Router } from 'express';
import { getMyLearningActivity } from '../controllers/learning-activity.controller.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

router.get('/students/me/learning-activity', requireAuth, requireRole('student'), getMyLearningActivity);

export default router;
