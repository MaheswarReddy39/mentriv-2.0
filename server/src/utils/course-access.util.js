import Enrollment from '../models/enrollment.model.js';

const ACTIVE_ACCESS_STATUSES = ['approved', 'completed'];

const isAdminRole = (role) => role === 'admin' || role === 'superAdmin';

const hasActiveCourseEnrollment = async (userId, courseId) =>
  Boolean(
    await Enrollment.exists({
      userId,
      courseId,
      status: { $in: ACTIVE_ACCESS_STATUSES },
    })
  );

export { ACTIVE_ACCESS_STATUSES, isAdminRole, hasActiveCourseEnrollment };
