import apiClient from './apiClient.js';

export const listStudents = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/students${query ? `?${query}` : ''}`);
};

export const updateStudentStatus = (studentId, status) =>
  apiClient.patch(`/students/${studentId}/status`, { status });
