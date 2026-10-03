import Enrollment from '../models/enrollment.model.js';

const ACTIVE_ACCESS_STATUSES = ['approved', 'completed'];

const isAdminRole = (role) => role === 'admin' || role === 'superAdmin';

const normalizeCourseIdList = (courseIds) => {
  const list = (Array.isArray(courseIds) ? courseIds : [courseIds]).filter(Boolean);
  return list.map(String);
};

const hasActiveCourseEnrollment = async (userId, courseId) =>
  Boolean(
    await Enrollment.exists({
      userId,
      courseId,
      status: { $in: ACTIVE_ACCESS_STATUSES },
    })
  );

// Content documents are shared across courses: a student has access when they
// are actively enrolled in ANY of the document's courses.
const hasActiveCourseEnrollmentIn = async (userId, courseIds) => {
  const ids = normalizeCourseIdList(courseIds);
  if (ids.length === 0) return false;
  return Boolean(
    await Enrollment.exists({
      userId,
      courseId: { $in: ids },
      status: { $in: ACTIVE_ACCESS_STATUSES },
    })
  );
};

// Picks the course a shared document should be attempted under: the first of
// the document's own courses in which the student is actively enrolled.
// Keeps attempts/progress course-aware when one document spans many courses.
const findActiveCourseIn = async (userId, courseIds) => {
  const ids = normalizeCourseIdList(courseIds);
  if (ids.length === 0) return null;

  const rows = await Enrollment.find({
    userId,
    courseId: { $in: ids },
    status: { $in: ACTIVE_ACCESS_STATUSES },
  })
    .select('courseId')
    .lean();

  if (rows.length === 0) return null;
  const enrolled = new Set(rows.map((row) => String(row.courseId)));
  return ids.find((id) => enrolled.has(id)) || null;
};

export {
  ACTIVE_ACCESS_STATUSES,
  isAdminRole,
  hasActiveCourseEnrollment,
  hasActiveCourseEnrollmentIn,
  findActiveCourseIn,
};
