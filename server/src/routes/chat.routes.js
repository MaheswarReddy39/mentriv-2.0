import { Router } from 'express';
import { body } from 'express-validator';
import { sendMessage } from '../controllers/chat.controller.js';
import { streamMessage } from '../controllers/chat-stream.controller.js';
import validate from '../middleware/validate.middleware.js';
import chatRateLimit from '../middleware/chat-rate-limit.js';

const router = Router();

const sendValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Please enter a valid message.')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Please enter a valid message.'),
];

router.post('/', chatRateLimit, validate(sendValidation), sendMessage);
router.post('/stream', chatRateLimit, validate(sendValidation), streamMessage);

export default router;
