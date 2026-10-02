import asyncHandler from '../utils/async-handler.js';
import achievementService from '../services/achievement.service.js';

const getAchievements = asyncHandler(async (req, res) => {
  const achievements = await achievementService.getAchievements(req.user);

  res.status(200).json({
    status: 'success',
    data: achievements,
  });
});

export { getAchievements };
