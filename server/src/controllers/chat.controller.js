import asyncHandler from '../utils/async-handler.js';
import chatService from '../services/chat.service.js';

const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  const result = await chatService.sendMessage({ message });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export { sendMessage };
