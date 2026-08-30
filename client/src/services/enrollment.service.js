import apiClient from './apiClient.js';

export const enrollInCourse = (courseId) => apiClient.post('/enrollments', { courseId });

export const getMyEnrollments = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/enrollments/my${query ? `?${query}` : ''}`);
};

export const getEnrollmentById = (enrollmentId) => apiClient.get(`/enrollments/${enrollmentId}`);

export const listEnrollments = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/enrollments${query ? `?${query}` : ''}`);
};

export const updateEnrollmentStatus = (enrollmentId, status) =>
  apiClient.patch(`/enrollments/${enrollmentId}/status`, { status });
