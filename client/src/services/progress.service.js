import apiClient from './apiClient.js';

export const getCourseProgress = (courseId) =>
  apiClient.get(`/courses/${courseId}/progress`);

export const getProgressOverview = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/progress/overview${query ? `?${query}` : ''}`);
};

export const getLeaderboard = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/leaderboard${query ? `?${query}` : ''}`);
};

export const completeLesson = (courseId, classId) =>
  apiClient.post(`/courses/${courseId}/progress/lessons/${classId}/complete`);

export const completeAssignment = (courseId, assignmentId) =>
  apiClient.post(`/courses/${courseId}/progress/assignments/${assignmentId}/complete`);

export const completeMcqTest = (courseId, mcqTestId) =>
  apiClient.post(`/courses/${courseId}/progress/mcq-tests/${mcqTestId}/complete`);
