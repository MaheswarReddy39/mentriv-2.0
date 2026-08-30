import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import Enrollment from '../models/enrollment.model.js';
import ApiError from '../utils/api-error.js';

const STUDENT_VISIBLE_FIELDS = 'name email phone status selectedCourseId createdAt';
const COURSE_VISIBLE_FIELDS = 'title slug level status';
const STATUS_LABELS = {
  active: 'accepted',
  accepted: 'accepted',
  pending: 'pending',
  rejected: 'rejected',
  inactive: 'inactive',
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const sanitizeCourse = (course) => ({
  id: course._id.toString(),
  title: course.title,
  slug: course.slug,
  level: course.level,
  status: course.status,
});

const sanitizeStudent = (student, courses = []) => ({
  id: student._id.toString(),
  name: student.name,
  email: student.email,
  phone: student.phone,
  status: student.status,
  displayStatus: STATUS_LABELS[student.status] || student.status,
  createdAt: student.createdAt,
  courses,
});

const getCourseOptions = async () => {
  const courses = await Course.find({})
    .select(COURSE_VISIBLE_FIELDS)
    .sort({ title: 1 })
    .lean();

  return courses.map(sanitizeCourse);
};

const listStudents = async ({ search = '', courseId = 'all', level = 'all' } = {}) => {
  const selectedCourseId = normalize(courseId);
  const selectedLevel = normalize(level);

  if (selectedCourseId && selectedCourseId !== 'all' && !mongoose.isValidObjectId(selectedCourseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  if (selectedLevel && selectedLevel !== 'all' && !['basic', 'intermediate', 'advanced'].includes(selectedLevel)) {
    throw new ApiError(400, 'Invalid course level');
  }

  const [totalStudents, studentDocs, courseOptions] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.find({ role: 'student' })
      .select(STUDENT_VISIBLE_FIELDS)
      .populate('selectedCourseId', COURSE_VISIBLE_FIELDS)
      .sort({ createdAt: -1 })
      .lean(),
    getCourseOptions(),
  ]);

  const studentIds = studentDocs.map((student) => student._id);
  const enrollments = await Enrollment.find({ userId: { $in: studentIds } })
    .populate('courseId', COURSE_VISIBLE_FIELDS)
    .lean();

  const coursesByStudent = new Map();
  enrollments.forEach((enrollment) => {
    const course = enrollment.courseId;
    if (!course?._id) return;

    const userKey = enrollment.userId.toString();
    const existing = coursesByStudent.get(userKey) || [];
    const coursePayload = {
      ...sanitizeCourse(course),
      enrollmentStatus: enrollment.status,
    };

    if (!existing.some((item) => item.id === coursePayload.id)) {
      existing.push(coursePayload);
    }

    coursesByStudent.set(userKey, existing);
  });

  const searchTerm = normalize(search);
  const students = studentDocs
    .map((student) => {
      const courses = coursesByStudent.get(student._id.toString()) || [];
      if (student.selectedCourseId?._id && !courses.some((course) => course.id === student.selectedCourseId._id.toString())) {
        courses.push({
          ...sanitizeCourse(student.selectedCourseId),
          enrollmentStatus: student.status === 'accepted' || student.status === 'active' ? 'approved' : student.status,
        });
      }
      return sanitizeStudent(student, courses);
    })
    .filter((student) => {
      const courseMatches =
        !selectedCourseId ||
        selectedCourseId === 'all' ||
        student.courses.some((course) => course.id === selectedCourseId);

      const levelMatches =
        !selectedLevel ||
        selectedLevel === 'all' ||
        student.courses.some((course) => course.level === selectedLevel);

      const searchable = [
        student.name,
        student.email,
        student.phone,
        student.status,
        student.displayStatus,
        ...student.courses.flatMap((course) => [course.title, course.level, course.enrollmentStatus]),
      ]
        .join(' ')
        .toLowerCase();

      const searchMatches = !searchTerm || searchable.includes(searchTerm);

      return courseMatches && levelMatches && searchMatches;
    });

  return {
    totalStudents,
    filteredStudents: students.length,
    students,
    courses: courseOptions,
  };
};

const updateStudentStatus = async (studentId, status) => {
  if (!mongoose.isValidObjectId(studentId)) {
    throw new ApiError(404, 'Student not found');
  }

  if (!['accepted', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Student status must be accepted or rejected');
  }

  const student = await User.findOne({ _id: studentId, role: 'student' }).select(
    '+emailVerificationToken +emailVerificationExpires +accountActivationToken +accountActivationExpires +tokenVersion'
  );

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  student.status = status;
  student.tokenVersion = (student.tokenVersion ?? 0) + 1;

  if (status === 'accepted') {
    student.isEmailVerified = true;
    student.accountActivated = true;
    student.emailVerificationToken = undefined;
    student.emailVerificationExpires = undefined;
    student.accountActivationToken = undefined;
    student.accountActivationExpires = undefined;
  } else {
    student.accountActivated = false;
  }

  await student.save();

  if (student.selectedCourseId) {
    await Enrollment.findOneAndUpdate(
      { userId: student._id, courseId: student.selectedCourseId },
      {
        $set: {
          status: status === 'accepted' ? 'approved' : 'rejected',
          activeEnrollment: status === 'accepted',
          approvedAt: status === 'accepted' ? new Date() : null,
          completedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    await Enrollment.updateMany(
      { userId: student._id, status: 'pending' },
      {
        $set: {
          status: status === 'accepted' ? 'approved' : 'rejected',
          activeEnrollment: status === 'accepted',
          approvedAt: status === 'accepted' ? new Date() : null,
        },
      }
    );
  }

  return { student: sanitizeStudent(student.toObject(), []) };
};

export default {
  listStudents,
  updateStudentStatus,
};
