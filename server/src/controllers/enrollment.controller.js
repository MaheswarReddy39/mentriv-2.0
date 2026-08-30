import asyncHandler from '../utils/async-handler.js';
import enrollmentService from '../services/enrollment.service.js';

const enroll = asyncHandler(async (req, res) => {
  const { enrollment } = await enrollmentService.enrollInCourse(
    req.user.id,
    req.body.courseId
  );

  res.status(201).json({
    status: 'success',
    message: 'Enrollment request submitted successfully',
    data: { enrollment },
  });
});

const getMyEnrollments = asyncHandler(async (req, res) => {
  const result = await enrollmentService.getMyEnrollments(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getEnrollmentById = asyncHandler(async (req, res) => {
  const { enrollment } = await enrollmentService.getEnrollmentById(
    req.user,
    req.params.id
  );

  res.status(200).json({
    status: 'success',
    data: { enrollment },
  });
});

const listEnrollments = asyncHandler(async (req, res) => {
  const result = await enrollmentService.listEnrollments(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const { enrollment } = await enrollmentService.updateEnrollmentStatus(
    req.params.id,
    req.body.status
  );

  res.status(200).json({
    status: 'success',
    message: 'Enrollment status updated successfully',
    data: { enrollment },
  });
});

export { enroll, getMyEnrollments, getEnrollmentById, listEnrollments, updateEnrollmentStatus };
