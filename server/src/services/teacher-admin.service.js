import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import authService from './auth.service.js';

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

const listTeachers = async ({ search = '', courseId = 'all' } = {}) => {
  const selectedCourseId = normalize(courseId);

  if (selectedCourseId && selectedCourseId !== 'all' && !mongoose.isValidObjectId(selectedCourseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  const [totalTeachers, teacherDocs, courseOptions] = await Promise.all([
    User.countDocuments({ role: 'teacher' }),
    User.find({ role: 'teacher' })
      .select(TEACHER_VISIBLE_FIELDS)
      .populate('selectedCourseId', COURSE_VISIBLE_FIELDS)
      .sort({ createdAt: -1 })
      .lean(),
    getCourseOptions(),
  ]);

  const searchTerm = normalize(search);
  const teachers = teacherDocs
    .map(sanitizeTeacher)
    .filter((teacher) => {
      const courseMatches =
        !selectedCourseId ||
        selectedCourseId === 'all' ||
        teacher.selectedCourse?.id === selectedCourseId;

      const searchable = [teacher.name, teacher.phone].join(' ').toLowerCase();
      const searchMatches = !searchTerm || searchable.includes(searchTerm);

      return courseMatches && searchMatches;
    });

  return {
    totalTeachers,
    filteredTeachers: teachers.length,
    teachers,
    courses: courseOptions,
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

  return { teacher: sanitizeTeacher(teacher.toObject()) };
};

export default {
  listTeachers,
  updateTeacherStatus,
};
