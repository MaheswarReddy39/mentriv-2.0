import asyncHandler from '../utils/async-handler.js';
import attemptService from '../services/mcq-attempt.service.js';

const startAttempt = asyncHandler(async (req, res) => {
  const result = await attemptService.startAttempt(req.user, req.params.id);

  res.status(201).json({
    status: 'success',
    message: 'Attempt started successfully',
    data: result,
  });
});

const submitAttempt = asyncHandler(async (req, res) => {
  const result = await attemptService.submitAttempt(
    req.user,
    req.params.id,
    req.body.answers
  );

  res.status(200).json({
    status: 'success',
    message: 'Attempt submitted and evaluated successfully',
    data: { result },
  });
});

const getMyAttempts = asyncHandler(async (req, res) => {
  const result = await attemptService.getMyAttempts(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getAttemptById = asyncHandler(async (req, res) => {
  const { attempt } = await attemptService.getAttemptById(req.user, req.params.id);

  res.status(200).json({
    status: 'success',
    data: { attempt },
  });
});

const listAttempts = asyncHandler(async (req, res) => {
  const result = await attemptService.listAttempts(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export { startAttempt, submitAttempt, getMyAttempts, getAttemptById, listAttempts };
