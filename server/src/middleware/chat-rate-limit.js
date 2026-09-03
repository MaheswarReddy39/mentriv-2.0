import ApiError from '../utils/api-error.js';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 20;

const clients = new Map();

const cleanup = () => {
  const now = Date.now();
  for (const [key, entry] of clients) {
    if (now - entry.windowStart >= WINDOW_MS) {
      clients.delete(key);
    }
  }
};

setInterval(cleanup, 5 * 60 * 1000).unref();

const chatRateLimit = (req, _res, next) => {
  const identifier = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = clients.get(identifier);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    clients.set(identifier, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    return next(
      new ApiError(429, 'You have reached the chat limit. Please try again later.')
    );
  }

  next();
};

export default chatRateLimit;
