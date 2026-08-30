import apiClient from './apiClient.js';

export const createSubmission = (assignmentId, payload) =>
  apiClient.post(`/assignments/${assignmentId}/submissions`, payload);

export const getMySubmissions = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/submissions/my${query ? `?${query}` : ''}`);
};

export const getSubmissionById = (submissionId) =>
  apiClient.get(`/submissions/${submissionId}`);

export const listSubmissions = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/submissions${query ? `?${query}` : ''}`);
};

export const getAdminSubmissionOverview = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/submissions/admin/overview${query ? `?${query}` : ''}`);
};

export const reviewSubmission = (submissionId, { marks, feedback }) =>
  apiClient.patch(`/submissions/${submissionId}/review`, { marks, feedback });
