import asyncHandler from '../utils/async-handler.js';
import teacherAdminService from '../services/teacher-admin.service.js';

const listTeachers = asyncHandler(async (req, res) => {
  const result = await teacherAdminService.listTeachers(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const updateTeacherStatus = asyncHandler(async (req, res) => {
  const { teacher } = await teacherAdminService.updateTeacherStatus(req.params.id, req.body.status);

  res.status(200).json({
    status: 'success',
    message: `Teacher ${teacher.displayStatus} successfully`,
    data: { teacher },
  });
});

export { listTeachers, updateTeacherStatus };
