import apiClient from './apiClient.js';

export const getAchievements = () => apiClient.get('/achievements');
