import asyncHandler from '../utils/async-handler.js';
import studentService from '../services/student.service.js';

const listStudents = asyncHandler(async (req, res) => {
  const result = await studentService.listStudents(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const updateStudentStatus = asyncHandler(async (req, res) => {
  const { student } = await studentService.updateStudentStatus(req.params.id, req.body.status);

  res.status(200).json({
    status: 'success',
    message: `Student ${student.displayStatus} successfully`,
    data: { student },
  });
});

export { listStudents, updateStudentStatus };
