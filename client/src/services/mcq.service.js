import apiClient from './apiClient.js';

export const listCourseMcqTests = (courseId) =>
  apiClient.get(`/courses/${courseId}/mcq-tests`);

export const getMcqTestById = (testId) => apiClient.get(`/mcq-tests/${testId}`);

export const createMcqTest = (courseId, payload) =>
  apiClient.post(`/courses/${courseId}/mcq-tests`, payload);

export const updateMcqTest = (testId, payload) => apiClient.patch(`/mcq-tests/${testId}`, payload);

export const archiveMcqTest = (testId) => apiClient.delete(`/mcq-tests/${testId}`);

export const startAttempt = (testId) => apiClient.post(`/mcq-tests/${testId}/attempts`);

export const submitAttempt = (attemptId, answers) =>
  apiClient.post(`/mcq-attempts/${attemptId}/submit`, { answers });

export const getMyAttempts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/mcq-attempts/my${query ? `?${query}` : ''}`);
};

export const getAttemptById = (attemptId) => apiClient.get(`/mcq-attempts/${attemptId}`);

export const listAttempts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/mcq-attempts${query ? `?${query}` : ''}`);
};

export const parseQuestionsWithAI = (text) =>
  apiClient.post('/ai/parse-questions', { text });
