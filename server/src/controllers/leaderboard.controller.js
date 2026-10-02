import asyncHandler from '../utils/async-handler.js';
import leaderboardService from '../services/leaderboard.service.js';

const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await leaderboardService.getLeaderboard(req.user, {
    courseId: req.query.courseId || null,
    timeFilter: req.query.timeFilter || 'all',
  });

  res.status(200).json({
    status: 'success',
    data: leaderboard,
  });
});

export { getLeaderboard };
