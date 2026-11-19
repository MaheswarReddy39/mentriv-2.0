import { API_BASE_URL, API_PREFIX } from '../constants/api.js';
import { clearSessionStorage, getAccessToken } from '../utils/token-storage.js';

const buildUrl = (path) => `${API_BASE_URL}${API_PREFIX}${path}`;

// Friendly copy for responses that arrive without a message (gateway errors,
// HTML error pages) so pages never surface raw status codes to the user.
const STATUS_MESSAGES = {
  400: 'That request didn’t look right. Check your details and try again.',
  401: 'Your session expired. Please sign in again.',
  403: 'You don’t have permission to do that.',
  404: 'We couldn’t find what you were looking for.',
  409: 'That already exists. Try a different value.',
  413: 'That file is too large. Choose a smaller one.',
  422: 'Some details need fixing. Check the form and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'The service is temporarily unavailable. Please try again in a moment.',
  503: 'The service is temporarily unavailable. Please try again in a moment.',
  504: 'The server took too long to respond. Please try again.',
};

const fallbackMessage = (status) =>
  STATUS_MESSAGES[status] ||
  (status >= 500
    ? 'Something went wrong on our side. Please try again.'
    : 'Something went wrong. Please try again.');

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const parseResponse = async (response, accessToken) => {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const serverMessage = typeof body?.message === 'string' ? body.message.trim() : '';
    const message = serverMessage || fallbackMessage(response.status);

    // Expired/invalidated session on an authenticated call: clear the stale
    // token and return the user to login (skipped for the login request itself).
    if (response.status === 401 && accessToken) {
      clearSessionStorage();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    throw new ApiError(response.status, message, body?.errors);
  }

  return body;
};

const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'content-type': 'application/json' };
  const accessToken = token ?? getAccessToken();
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'We couldn’t reach the server. Check your connection and try again.'
    );
  }

  return parseResponse(response, accessToken);
};

const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export default apiClient;
