import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import authService from './auth.service.js';
import emailService from './email.service.js';

const TEACHER_VISIBLE_FIELDS = 'name email phone status selectedCourseId createdAt';
const COURSE_VISIBLE_FIELDS = 'title slug level status';
const STATUS_LABELS = {
  active: 'accepted',
  accepted: 'accepted',
  pending: 'pending',
  rejected: 'rejected',
  inactive: 'inactive',
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const sanitizeCourse = (course) => {
  if (!course?._id) return null;
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    level: course.level,
    status: course.status,
  };
};

const sanitizeTeacher = (teacher) => {
  const course = sanitizeCourse(teacher.selectedCourseId);

  return {
    id: teacher._id.toString(),
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    status: teacher.status,
    displayStatus: STATUS_LABELS[teacher.status] || teacher.status,
    selectedCourse: course,
    courses: course ? [course] : [],
    createdAt: teacher.createdAt,
  };
};

const getCourseOptions = async () => {
  const courses = await Course.find({})
    .select(COURSE_VISIBLE_FIELDS)
    .sort({ title: 1 })
    .lean();

  return courses.map(sanitizeCourse).filter(Boolean);
};

const listTeachers = async ({ search = '', courseId = 'all', page = 1, limit = 50 } = {}) => {
  const selectedCourseId = normalize(courseId);
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (selectedCourseId && selectedCourseId !== 'all' && !mongoose.isValidObjectId(selectedCourseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  const totalTeachers = await User.countDocuments({ role: 'teacher' });

  // Get filtered teacher IDs first
  const allTeacherDocs = await User.find({ role: 'teacher' })
    .select(TEACHER_VISIBLE_FIELDS)
    .populate('selectedCourseId', COURSE_VISIBLE_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  const searchTerm = normalize(search);
  const filteredTeacherDocs = allTeacherDocs.filter((teacher) => {
    const course = sanitizeCourse(teacher.selectedCourseId);
    const courseMatches =
      !selectedCourseId ||
      selectedCourseId === 'all' ||
      (course && course.id === selectedCourseId);

    const searchable = [teacher.name, teacher.phone].join(' ').toLowerCase();
    const searchMatches = !searchTerm || searchable.includes(searchTerm);

    return courseMatches && searchMatches;
  });

  const filteredTotal = filteredTeacherDocs.length;

  // Get paginated teachers
  const paginatedTeacherDocs = filteredTeacherDocs.slice(
    (pageNumber - 1) * limitNumber,
    pageNumber * limitNumber
  );

  const teachers = paginatedTeacherDocs.map(sanitizeTeacher);
  const courseOptions = await getCourseOptions();

  return {
    totalTeachers,
    filteredTeachers: filteredTotal,
    teachers,
    courses: courseOptions,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: filteredTotal,
      totalPages: Math.ceil(filteredTotal / limitNumber),
      hasNextPage: pageNumber * limitNumber < filteredTotal,
    },
  };
};

const updateTeacherStatus = async (teacherId, status) => {
  if (!mongoose.isValidObjectId(teacherId)) {
    throw new ApiError(404, 'Teacher not found');
  }

  if (!['accepted', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Teacher status must be accepted or rejected');
  }

  const teacher = await User.findOne({ _id: teacherId, role: 'teacher' })
    .select(
      '+emailVerificationToken +emailVerificationExpires +accountActivationToken +accountActivationExpires +tokenVersion'
    )
    .populate('selectedCourseId', COURSE_VISIBLE_FIELDS);

  if (!teacher) {
    throw new ApiError(404, 'Teacher not found');
  }

  teacher.status = status;
  teacher.tokenVersion = (teacher.tokenVersion ?? 0) + 1;

  if (status === 'accepted') {
    teacher.isEmailVerified = true;
    teacher.emailVerificationToken = undefined;
    teacher.emailVerificationExpires = undefined;
    if (teacher.passwordHash) {
      teacher.accountActivated = true;
      teacher.accountActivationToken = undefined;
      teacher.accountActivationExpires = undefined;
    } else {
      await authService.createActivationForApprovedUser(teacher);
    }
  } else {
    teacher.accountActivated = false;
    teacher.accountActivationToken = undefined;
    teacher.accountActivationExpires = undefined;
  }

  await teacher.save();
  await teacher.populate('selectedCourseId', COURSE_VISIBLE_FIELDS);

  try {
    const payload = { to: teacher.email, teacherName: teacher.name };
    if (status === 'accepted') {
      await emailService.sendTeacherApprovalEmail(payload);
    } else {
      await emailService.sendTeacherRejectionEmail(payload);
    }
  } catch (error) {
    console.error(`[email] Teacher ${status} email failed: ${error.message}`);
  }

  return { teacher: sanitizeTeacher(teacher.toObject()) };
};

export default {
  listTeachers,
  updateTeacherStatus,
};
