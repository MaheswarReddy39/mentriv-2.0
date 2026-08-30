import asyncHandler from '../utils/async-handler.js';
import submissionService from '../services/submission.service.js';

const createSubmission = asyncHandler(async (req, res) => {
  const { submission } = await submissionService.createSubmission(
    req.user,
    req.params.id,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: 'Submission recorded successfully',
    data: { submission },
  });
});

const getMySubmissions = asyncHandler(async (req, res) => {
  const result = await submissionService.getMySubmissions(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getSubmissionById = asyncHandler(async (req, res) => {
  const { submission } = await submissionService.getSubmissionById(
    req.user,
    req.params.id
  );

  res.status(200).json({
    status: 'success',
    data: { submission },
  });
});

const listSubmissions = asyncHandler(async (req, res) => {
  const result = await submissionService.listSubmissions(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const listAdminSubmissionOverview = asyncHandler(async (req, res) => {
  const result = await submissionService.listAdminSubmissionOverview(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const reviewSubmission = asyncHandler(async (req, res) => {
  const { submission } = await submissionService.reviewSubmission(
    req.user.id,
    req.params.id,
    req.body
  );

  res.status(200).json({
    status: 'success',
    message: 'Submission reviewed successfully',
    data: { submission },
  });
});

export {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
  listSubmissions,
  listAdminSubmissionOverview,
  reviewSubmission,
};
