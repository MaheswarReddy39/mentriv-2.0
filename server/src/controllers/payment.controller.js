import asyncHandler from '../utils/async-handler.js';
import paymentService from '../services/payment.service.js';

const submitPayment = asyncHandler(async (req, res) => {
  const { payment } = await paymentService.submitPayment(req.user.id, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Payment submitted successfully and is awaiting verification',
    data: { payment },
  });
});

const getMyPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getMyPayments(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getPaymentById = asyncHandler(async (req, res) => {
  const { payment } = await paymentService.getPaymentById(req.user, req.params.id);

  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

const listPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.listPayments(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { payment } = await paymentService.updatePaymentStatus(
    req.user.id,
    req.params.id,
    req.body.status,
    req.body.rejectionReason
  );

  res.status(200).json({
    status: 'success',
    message: `Payment ${payment.status} successfully`,
    data: { payment },
  });
});

export { submitPayment, getMyPayments, getPaymentById, listPayments, updatePaymentStatus };
