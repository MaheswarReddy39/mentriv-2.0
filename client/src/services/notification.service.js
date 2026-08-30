import apiClient from './apiClient.js';

export const listNotifications = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/notifications${query ? `?${query}` : ''}`);
};

export const listAdminNotifications = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/notifications/admin${query ? `?${query}` : ''}`);
};

export const createAdminNotification = (payload) =>
  apiClient.post('/notifications/admin', payload);

export const getUnreadCount = () => apiClient.get('/notifications/unread-count');

export const markNotificationRead = (notificationId) =>
  apiClient.patch(`/notifications/${notificationId}/read`);

export const markAllNotificationsRead = () =>
  apiClient.patch('/notifications/read-all');
