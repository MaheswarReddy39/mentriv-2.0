import asyncHandler from '../utils/async-handler.js';
import classService from '../services/class.service.js';

const listByCourse = asyncHandler(async (req, res) => {
  const result = await classService.listLessonsForCourse(
    req.user,
    req.params.courseId
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getLessonById = asyncHandler(async (req, res) => {
  const { lesson } = await classService.getLessonById(req.user, req.params.id);

  res.status(200).json({
    status: 'success',
    data: { lesson },
  });
});

const createLesson = asyncHandler(async (req, res) => {
  const { lesson } = await classService.createLesson(
    req.params.courseId,
    req.body
  );

  res.status(201).json({
    status: 'success',
    message: 'Lesson created successfully',
    data: { lesson },
  });
});

const updateLesson = asyncHandler(async (req, res) => {
  const { lesson } = await classService.updateLesson(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Lesson updated successfully',
    data: { lesson },
  });
});

const archiveLesson = asyncHandler(async (req, res) => {
  const { lesson } = await classService.archiveLesson(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Lesson archived successfully',
    data: { lesson },
  });
});

export { listByCourse, getLessonById, createLesson, updateLesson, archiveLesson };
