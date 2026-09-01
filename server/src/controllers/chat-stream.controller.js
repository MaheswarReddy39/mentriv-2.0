import asyncHandler from '../utils/async-handler.js';
import chatService from '../services/chat.service.js';

const CHATBOT_UNAVAILABLE_MSG = 'Chatbot is temporarily unavailable. Please try again later.';

const streamMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onToken = (token) => {
    sendEvent('token', { content: token });
  };

  const onDone = (meta) => {
    sendEvent('done', {
      route: meta.route,
      ragUsed: meta.ragUsed,
      sources: meta.sources,
      provider: meta.provider,
      timestamp: new Date().toISOString(),
    });
    res.end();
  };

  const onError = (error) => {
    sendEvent('error', { message: CHATBOT_UNAVAILABLE_MSG });
    res.end();
  };

  try {
    await chatService.streamAnswer({ message, onToken, onDone, onError });
  } catch (error) {
    if (!res.writableEnded) {
      sendEvent('error', { message: CHATBOT_UNAVAILABLE_MSG });
      res.end();
    }
  }
});

export { streamMessage };
