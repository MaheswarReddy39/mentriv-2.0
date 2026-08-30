import apiClient from './apiClient.js';

export const listTeachers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/teachers${query ? `?${query}` : ''}`);
};

export const updateTeacherStatus = (teacherId, status) =>
  apiClient.patch(`/teachers/${teacherId}/status`, { status });
