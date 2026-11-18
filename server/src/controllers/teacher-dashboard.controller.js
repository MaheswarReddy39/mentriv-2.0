import asyncHandler from '../utils/async-handler.js';
import teacherDashboardService from '../services/teacher-dashboard.service.js';

const getTeacherDashboard = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getDashboard(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTeacherClasses = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getTeacherClasses(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTeacherAssignments = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getTeacherAssignments(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTeacherMcqs = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getTeacherMcqs(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTeacherSubmissions = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getTeacherSubmissions(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTeacherLeaderboard = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getTeacherLeaderboard(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export {
  getTeacherAssignments,
  getTeacherClasses,
  getTeacherDashboard,
  getTeacherMcqs,
  getTeacherSubmissions,
  getTeacherLeaderboard,
};
