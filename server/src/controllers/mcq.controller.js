import asyncHandler from '../utils/async-handler.js';
import mcqService from '../services/mcq.service.js';

const listByCourse = asyncHandler(async (req, res) => {
  const result = await mcqService.listTestsForCourse(req.user, req.params.courseId);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getTestById = asyncHandler(async (req, res) => {
  const { mcqTest } = await mcqService.getTestById(req.user, req.params.id);

  res.status(200).json({
    status: 'success',
    data: { mcqTest },
  });
});

const createTest = asyncHandler(async (req, res) => {
  const { mcqTest } = await mcqService.createMcqTest(req.params.courseId, req.body);

  res.status(201).json({
    status: 'success',
    message: 'MCQ test created successfully',
    data: { mcqTest },
  });
});

const updateTest = asyncHandler(async (req, res) => {
  const { mcqTest } = await mcqService.updateMcqTest(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'MCQ test updated successfully',
    data: { mcqTest },
  });
});

const archiveTest = asyncHandler(async (req, res) => {
  const { mcqTest } = await mcqService.archiveMcqTest(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'MCQ test archived successfully',
    data: { mcqTest },
  });
});

export { listByCourse, getTestById, createTest, updateTest, archiveTest };
