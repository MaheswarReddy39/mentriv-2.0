import apiClient from './apiClient.js';

export const getTeacherDashboard = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/dashboard${query ? `?${query}` : ''}`);
};

export const getTeacherSubmissions = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/submissions${query ? `?${query}` : ''}`);
};

export const getTeacherLeaderboard = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/leaderboard${query ? `?${query}` : ''}`);
};
