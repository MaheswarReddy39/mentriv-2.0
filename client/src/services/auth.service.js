import apiClient from './apiClient.js';

export const register = (payload) => apiClient.post('/auth/register', payload);
export const registerTeacher = (payload) => apiClient.post('/auth/teachers/register', payload);
export const login = (payload) => apiClient.post('/auth/login', payload);
export const logout = () => apiClient.post('/auth/logout');
export const getCurrentUser = () => apiClient.get('/auth/me');
export const updateCurrentUserProfile = (payload) => apiClient.patch('/auth/me', payload);
export const changePassword = (payload) => apiClient.patch('/auth/change-password', payload);
export const verifyEmail = (token) => apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
export const resendActivationEmail = (email) => apiClient.post('/auth/resend-activation', { email });
export const activateAccount = ({ token, password }) =>
  apiClient.post('/auth/activate-account', { token, password });
export const forgotPassword = (email) => apiClient.post('/auth/forgot-password', { email });
export const resetPassword = ({ token, password }) =>
  apiClient.post('/auth/reset-password', { token, password });
