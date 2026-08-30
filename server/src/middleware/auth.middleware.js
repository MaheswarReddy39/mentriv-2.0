import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';
import asyncHandler from '../utils/async-handler.js';
import { verifyAccessToken } from '../services/token.service.js';

const GENERIC_INVALID_SESSION = () => new ApiError(401, 'Invalid or expired session');

const isLoginEnabledStatus = (status) => ['active', 'accepted'].includes(status);

const sanitizeAuthenticatedUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  accountActivated: user.accountActivated,
  status: user.status,
});

const authenticateBearerToken = async (header) => {
  if (!header.startsWith('Bearer ') || !header.slice(7).trim()) {
    throw new ApiError(401, 'Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7).trim());
  } catch {
    throw GENERIC_INVALID_SESSION();
  }

  const { sub, tv } = payload ?? {};
  if (!sub || typeof tv !== 'number') {
    throw GENERIC_INVALID_SESSION();
  }

  const user = await User.findById(sub).select('+tokenVersion');
  if (!user) {
    throw GENERIC_INVALID_SESSION();
  }

  if ((user.tokenVersion ?? 0) !== tv) {
    throw new ApiError(401, 'Session is no longer valid. Please log in again.');
  }

  if (!isLoginEnabledStatus(user.status)) {
    throw new ApiError(403, 'This account is inactive. Please contact support.');
  }

  return user;
};

const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await authenticateBearerToken(req.headers.authorization || '');
  req.user = sanitizeAuthenticatedUser(user);
  next();
});

// Attaches req.user when a VALID bearer token is present; never rejects.
// Used by public endpoints that personalize responses (e.g., announcements).
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ') && header.slice(7).trim()) {
    try {
      const user = await authenticateBearerToken(header);
      req.user = sanitizeAuthenticatedUser(user);
    } catch {
      // Invalid/expired tokens degrade gracefully to anonymous access.
      req.user = undefined;
    }
  }
  next();
});

export { requireAuth, optionalAuth };
export default requireAuth;
