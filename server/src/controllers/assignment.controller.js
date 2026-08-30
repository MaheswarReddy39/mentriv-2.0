import asyncHandler from '../utils/async-handler.js';
import assignmentService from '../services/assignment.service.js';

const listByCourse = asyncHandler(async (req, res) => {
  const result = await assignmentService.listAssignmentsForCourse(
    req.user,
    req.params.courseId
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getAssignmentById = asyncHandler(async (req, res) => {
  const { assignment } = await assignmentService.getAssignmentById(
    req.user,
    req.params.id
  );

  res.status(200).json({
    status: 'success',
    data: { assignment },
  });
});

const createAssignment = asyncHandler(async (req, res) => {
  const { assignment } = await assignmentService.createAssignment(
    req.params.courseId,
    req.body,
    req.user
  );

  res.status(201).json({
    status: 'success',
    message: 'Assignment created successfully',
    data: { assignment },
  });
});

const updateAssignment = asyncHandler(async (req, res) => {
  const { assignment } = await assignmentService.updateAssignment(
    req.params.id,
    req.body
  );

  res.status(200).json({
    status: 'success',
    message: 'Assignment updated successfully',
    data: { assignment },
  });
});

const archiveAssignment = asyncHandler(async (req, res) => {
  const { assignment } = await assignmentService.archiveAssignment(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'Assignment archived successfully',
    data: { assignment },
  });
});

export { listByCourse, getAssignmentById, createAssignment, updateAssignment, archiveAssignment };
