import apiClient from './apiClient.js';

export const getMyLearningActivity = () => apiClient.get('/students/me/learning-activity');
