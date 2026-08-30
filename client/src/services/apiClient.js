import { API_BASE_URL, API_PREFIX } from '../constants/api.js';
import { clearSessionStorage, getAccessToken } from '../utils/token-storage.js';

const buildUrl = (path) => `${API_BASE_URL}${API_PREFIX}${path}`;

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
    const message = body?.message || `Request failed with status ${response.status}`;

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

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse(response, accessToken);
};

const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export default apiClient;
