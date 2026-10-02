import apiClient from './apiClient.js';

export const listCodingTaskGroups = () => apiClient.get('/coding-task-groups');

export const listCodingTasks = (params = {}) => {
  const query = new URLSearchParams();
  if (params.courseId) query.set('courseId', params.courseId);
  if (params.level) query.set('level', params.level);
  if (params.topic) query.set('topic', params.topic);
  const qs = query.toString();
  return apiClient.get(`/coding-tasks${qs ? `?${qs}` : ''}`);
};

export const getCodingTask = (taskId) => apiClient.get(`/coding-tasks/${taskId}`);

export const createCodingTask = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/coding-tasks`, payload);

export const createCodingTasksForCourses = (courseIds, payload) =>
  apiClient.post('/coding-tasks/bulk', { courseIds, ...payload });

export const updateCodingTask = (taskId, payload) =>
  apiClient.patch(`/coding-tasks/${taskId}`, payload);

export const listCodingSubmissions = (taskId) =>
  apiClient.get(`/coding-tasks/${taskId}/submissions`);

export const createCodingSubmission = (taskId, payload) =>
  apiClient.post(`/coding-tasks/${taskId}/submissions`, payload);
