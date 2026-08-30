import apiClient from './apiClient.js';

export const getCourseProgress = (courseId) =>
  apiClient.get(`/courses/${courseId}/progress`);

export const completeLesson = (courseId, classId) =>
  apiClient.post(`/courses/${courseId}/progress/lessons/${classId}/complete`);

export const completeAssignment = (courseId, assignmentId) =>
  apiClient.post(`/courses/${courseId}/progress/assignments/${assignmentId}/complete`);

export const completeMcqTest = (courseId, mcqTestId) =>
  apiClient.post(`/courses/${courseId}/progress/mcq-tests/${mcqTestId}/complete`);
