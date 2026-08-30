import apiClient from './apiClient.js';

export const listCourseClasses = (courseId) =>
  apiClient.get(`/courses/${courseId}/classes`);

export const getClassById = (classId) => apiClient.get(`/classes/${classId}`);

export const createClass = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/classes`, payload);

export const updateClass = (classId, payload) => apiClient.patch(`/classes/${classId}`, payload);

export const archiveClass = (classId) => apiClient.delete(`/classes/${classId}`);
