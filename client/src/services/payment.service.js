import apiClient from './apiClient.js';

export const submitPayment = (payload) => apiClient.post('/payments', payload);

export const getMyPayments = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/payments/my${query ? `?${query}` : ''}`);
};

export const getPaymentById = (paymentId) => apiClient.get(`/payments/${paymentId}`);

export const listPayments = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/payments${query ? `?${query}` : ''}`);
};

export const updatePaymentStatus = (paymentId, status, rejectionReason) =>
  apiClient.patch(`/payments/${paymentId}/status`, {
    status,
    ...(rejectionReason ? { rejectionReason } : {}),
  });
