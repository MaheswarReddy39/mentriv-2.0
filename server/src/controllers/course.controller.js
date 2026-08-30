import asyncHandler from '../utils/async-handler.js';
import courseService from '../services/course.service.js';

const listCourses = asyncHandler(async (req, res) => {
  const { page, limit, category, level, search } = req.query;
  const result = await courseService.listPublishedCourses({ page, limit, category, level, search });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const listAdminCourses = asyncHandler(async (req, res) => {
  const { page, limit, category, level, search, status } = req.query;
  const result = await courseService.listAdminCourses({ page, limit, category, level, search, status });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getCourseBySlug = asyncHandler(async (req, res) => {
  const { course } = await courseService.getPublishedCourseBySlug(req.params.slug);

  res.status(200).json({
    status: 'success',
    data: { course },
  });
});

const getAdminCourseById = asyncHandler(async (req, res) => {
  const { course } = await courseService.getAdminCourseById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { course },
  });
});

const createCourse = asyncHandler(async (req, res) => {
  const { course } = await courseService.createCourse(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Course created successfully',
    data: { course },
  });
});

const updateCourse = asyncHandler(async (req, res) => {
  const { course } = await courseService.updateCourse(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Course updated successfully',
    data: { course },
  });
});

const archiveCourse = asyncHandler(async (req, res) => {
  const { course } = await courseService.archiveCourse(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Course archived successfully',
    data: { course },
  });
});

export {
  listCourses,
  listAdminCourses,
  getCourseBySlug,
  getAdminCourseById,
  createCourse,
  updateCourse,
  archiveCourse,
};
