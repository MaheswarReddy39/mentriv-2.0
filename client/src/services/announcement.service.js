import apiClient from './apiClient.js';

export const listAnnouncements = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/announcements${query ? `?${query}` : ''}`);
};

export const getAnnouncementById = (announcementId) =>
  apiClient.get(`/announcements/${announcementId}`);

export const createAnnouncement = (payload) => apiClient.post('/announcements', payload);

export const updateAnnouncement = (announcementId, payload) =>
  apiClient.patch(`/announcements/${announcementId}`, payload);

export const archiveAnnouncement = (announcementId) =>
  apiClient.delete(`/announcements/${announcementId}`);
