import apiClient from './apiClient.js';

export const listCourseAssignments = (courseId) =>
  apiClient.get(`/courses/${courseId}/assignments`);

export const getAssignmentById = (assignmentId) =>
  apiClient.get(`/assignments/${assignmentId}`);

export const createAssignment = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/assignments`, payload);

export const updateAssignment = (assignmentId, payload) =>
  apiClient.patch(`/assignments/${assignmentId}`, payload);

export const archiveAssignment = (assignmentId) =>
  apiClient.delete(`/assignments/${assignmentId}`);
