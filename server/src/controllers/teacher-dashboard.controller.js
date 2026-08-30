import asyncHandler from '../utils/async-handler.js';
import teacherDashboardService from '../services/teacher-dashboard.service.js';

const getTeacherDashboard = asyncHandler(async (req, res) => {
  const result = await teacherDashboardService.getDashboard(req.query);

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

export { getTeacherDashboard, getTeacherSubmissions, getTeacherLeaderboard };
