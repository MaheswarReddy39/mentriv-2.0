import apiClient from './apiClient.js';

export const getTeacherDashboard = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/dashboard${query ? `?${query}` : ''}`);
};

export const getTeacherClasses = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/classes${query ? `?${query}` : ''}`);
};

export const getTeacherAssignments = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/assignments${query ? `?${query}` : ''}`);
};

export const getTeacherMcqs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/mcqs${query ? `?${query}` : ''}`);
};

export const getTeacherSubmissions = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/submissions${query ? `?${query}` : ''}`);
};

export const getTeacherLeaderboard = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teacher/leaderboard${query ? `?${query}` : ''}`);
};
