import asyncHandler from '../utils/async-handler.js';
import aiService from '../services/ai.service.js';

const parseQuestions = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide question text to parse.',
    });
  }

  if (text.trim().length > 15000) {
    return res.status(400).json({
      status: 'fail',
      message: 'Input text is too long. Please paste fewer questions at a time.',
    });
  }

  const questions = await aiService.parseQuestionsFromText(text.trim());

  if (questions.length === 0) {
    return res.status(422).json({
      status: 'fail',
      message: 'Could not parse any valid MCQ questions from the input. Please check the format and try again.',
    });
  }

  res.status(200).json({
    status: 'success',
    data: { questions },
  });
});

export { parseQuestions };
