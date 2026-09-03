import { Router } from 'express';
import { body } from 'express-validator';
import { parseQuestions } from '../controllers/ai.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const AI_CREATE_ROLES = ['teacher', 'admin', 'superAdmin'];

const parseValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Question text is required')
    .isLength({ max: 15000 })
    .withMessage('Input text is too long'),
];

router.post(
  '/ai/parse-questions',
  requireAuth,
  requireRole(...AI_CREATE_ROLES),
  validate(parseValidation),
  parseQuestions
);

export default router;
