import apiClient from './apiClient.js';

export const listPublishedCourses = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/courses${query ? `?${query}` : ''}`);
};

export const listAdminCourses = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/courses/admin${query ? `?${query}` : ''}`);
};

export const getCourseBySlug = (slug) => apiClient.get(`/courses/${slug}`);

export const getAdminCourseById = (courseId) => apiClient.get(`/courses/admin/${courseId}`);

export const createCourse = (payload) => apiClient.post('/courses', payload);

export const updateCourse = (courseId, payload) => apiClient.patch(`/courses/${courseId}`, payload);

export const archiveCourse = (courseId) => apiClient.delete(`/courses/${courseId}`);
