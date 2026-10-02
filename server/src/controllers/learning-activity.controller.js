import asyncHandler from '../utils/async-handler.js';
import learningActivityService from '../services/learning-activity.service.js';

const getMyLearningActivity = asyncHandler(async (req, res) => {
  const data = await learningActivityService.getLearningActivity(req.user);

  res.status(200).json({
    status: 'success',
    data,
  });
});

export { getMyLearningActivity };
