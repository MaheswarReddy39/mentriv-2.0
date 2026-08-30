import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import Enrollment from '../models/enrollment.model.js';
import Announcement from '../models/announcement.model.js';
import McqTest from '../models/mcq.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import ApiError from '../utils/api-error.js';
import { ACTIVE_ACCESS_STATUSES } from '../utils/course-access.util.js';
import mongoose from 'mongoose';

const RELEVANT_ENROLLMENT_STATUSES = ['pending', 'approved', 'completed'];

const sanitizeCourse = (course) => ({
  id: course._id.toString(),
  title: course.title,
  slug: course.slug,
  level: course.level,
  status: course.status,
});

const sanitizeAnnouncement = (announcement) => {
  if (!announcement) return null;
  return {
    id: announcement._id.toString(),
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    audience: announcement.audience,
    publishedAt: announcement.publishedAt,
  };
};

const getDashboard = async ({ courseId = 'all' } = {}) => {
  if (courseId !== 'all' && !mongoose.isValidObjectId(courseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  const [courses, liveAnnouncement] = await Promise.all([
    Course.find({ status: { $ne: 'archived' } }).select('title slug level status').sort({ title: 1 }).lean(),
    Announcement.findOne({ status: 'published', audience: { $in: ['all', 'admins'] } })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const selectedCourse =
    courseId === 'all' ? null : courses.find((course) => course._id.toString() === courseId);

  if (courseId !== 'all' && !selectedCourse) {
    throw new ApiError(404, 'Course not found');
  }

  let totalStudents;
  if (selectedCourse) {
    const studentIds = await Enrollment.distinct('userId', {
      courseId,
      status: { $in: RELEVANT_ENROLLMENT_STATUSES },
    });
    totalStudents = studentIds.length;
  } else {
    totalStudents = await User.countDocuments({ role: 'student' });
  }

  return {
    totalStudents,
    totalCourses: selectedCourse ? 1 : courses.length,
    selectedCourse: selectedCourse ? sanitizeCourse(selectedCourse) : null,
    courses: courses.map(sanitizeCourse),
    liveAnnouncement: sanitizeAnnouncement(liveAnnouncement),
  };
};

const roundProgress = (value) => Math.round(value * 100) / 100;

const getAvailableCourses = async () =>
  Course.find({ status: { $ne: 'archived' } })
    .select('title slug level status')
    .sort({ title: 1 })
    .lean();

const validateCourseAndLevel = (courses, { courseId = 'all', level = 'all' } = {}) => {
  if (courseId !== 'all' && !mongoose.isValidObjectId(courseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  const normalizedLevel = String(level || 'all').toLowerCase();
  if (!['all', 'beginner', 'basic', 'intermediate', 'advanced'].includes(normalizedLevel)) {
    throw new ApiError(400, 'Invalid level');
  }

  const selectedCourse =
    courseId === 'all' ? null : courses.find((course) => course._id.toString() === courseId);

  if (courseId !== 'all' && !selectedCourse) {
    throw new ApiError(404, 'Course not found');
  }

  const filteredCourses = courses.filter((course) => {
    const matchesCourse = courseId === 'all' || course._id.toString() === courseId;
    const matchesLevel = normalizedLevel === 'all' || course.level === normalizedLevel;
    return matchesCourse && matchesLevel;
  });

  return { filteredCourses, normalizedLevel };
};

const buildStudentCourseProgressRows = async ({ courseId = 'all', level = 'all' } = {}) => {
  const courses = await getAvailableCourses();
  const { filteredCourses } = validateCourseAndLevel(courses, { courseId, level });
  const courseIds = filteredCourses.map((course) => course._id);
  const courseIdSet = new Set(courseIds.map((id) => id.toString()));

  if (courseIds.length === 0) {
    return {
      courses,
      rows: [],
    };
  }

  const [enrollments, mcqTests, attempts] = await Promise.all([
    Enrollment.find({
      courseId: { $in: courseIds },
      status: { $in: ACTIVE_ACCESS_STATUSES },
    })
      .populate('userId', 'name email phone')
      .populate('courseId', 'title level')
      .sort({ createdAt: -1 })
      .lean(),
    McqTest.find({ courseId: { $in: courseIds }, status: 'published' })
      .select('courseId questions')
      .lean(),
    McqAttempt.find({
      courseId: { $in: courseIds },
      status: { $in: ['submitted', 'evaluated'] },
    })
      .select('studentId courseId mcqTestId answers submittedAt updatedAt createdAt')
      .sort({ submittedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const questionCountByCourse = new Map();
  const testIdsByCourse = new Map();
  mcqTests.forEach((test) => {
    const courseKey = test.courseId.toString();
    const questionCount = Array.isArray(test.questions) ? test.questions.length : 0;
    questionCountByCourse.set(courseKey, (questionCountByCourse.get(courseKey) || 0) + questionCount);
    if (!testIdsByCourse.has(courseKey)) {
      testIdsByCourse.set(courseKey, new Set());
    }
    testIdsByCourse.get(courseKey).add(test._id.toString());
  });

  const latestAttemptByStudentCourseTest = new Map();
  attempts.forEach((attempt) => {
    const courseKey = attempt.courseId.toString();
    const testKey = attempt.mcqTestId.toString();
    if (!courseIdSet.has(courseKey) || !testIdsByCourse.get(courseKey)?.has(testKey)) {
      return;
    }

    const key = `${attempt.studentId.toString()}:${courseKey}:${testKey}`;
    if (!latestAttemptByStudentCourseTest.has(key)) {
      latestAttemptByStudentCourseTest.set(key, attempt);
    }
  });

  const attemptsByStudentCourse = new Map();
  latestAttemptByStudentCourseTest.forEach((attempt) => {
    const key = `${attempt.studentId.toString()}:${attempt.courseId.toString()}`;
    if (!attemptsByStudentCourse.has(key)) {
      attemptsByStudentCourse.set(key, []);
    }
    attemptsByStudentCourse.get(key).push(attempt);
  });

  const rows = enrollments
    .filter((enrollment) => enrollment.userId?._id && enrollment.courseId?._id)
    .map((enrollment) => {
      const student = enrollment.userId;
      const course = enrollment.courseId;
      const studentId = student._id.toString();
      const courseKey = course._id.toString();
      const studentCourseAttempts = attemptsByStudentCourse.get(`${studentId}:${courseKey}`) || [];
      const totalQuestions = questionCountByCourse.get(courseKey) || 0;
      const correctAnswers = studentCourseAttempts.reduce(
        (count, attempt) =>
          count + (attempt.answers || []).filter((answer) => answer.isCorrect === true).length,
        0
      );
      const progress = totalQuestions > 0 ? roundProgress((correctAnswers / totalQuestions) * 100) : 0;
      const status = studentCourseAttempts.length > 0 ? 'submitted' : 'pending';

      return {
        id: `${studentId}-${courseKey}`,
        studentId,
        studentName: student.name,
        mobileNumber: student.phone || '',
        courseId: courseKey,
        courseTitle: course.title,
        level: course.level,
        correctAnswers,
        totalQuestions,
        progress,
        status,
      };
    });

  return { courses, rows };
};

const getTeacherSubmissions = async ({ search = '', courseId = 'all', level = 'all' } = {}) => {
  const { courses, rows } = await buildStudentCourseProgressRows({ courseId, level });
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const submissions = rows.filter((row) => {
    if (!normalizedSearch) return true;
    return (
      row.studentName.toLowerCase().includes(normalizedSearch) ||
      row.courseTitle.toLowerCase().includes(normalizedSearch)
    );
  });

  const totalSubmissions = submissions.filter((row) => row.status === 'submitted').length;
  const pendingSubmissions = submissions.filter((row) => row.status === 'pending').length;
  const totalStudents = new Set(submissions.map((row) => row.studentId)).size;

  return {
    totalStudents,
    totalSubmissions,
    pendingSubmissions,
    courses: courses.map(sanitizeCourse),
    submissions,
  };
};

const getTeacherLeaderboard = async ({ search = '', courseId = 'all' } = {}) => {
  const { courses, rows } = await buildStudentCourseProgressRows({ courseId });
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const byStudent = new Map();

  rows.forEach((row) => {
    if (normalizedSearch) {
      const mobileNumber = String(row.mobileNumber || '').toLowerCase();
      const matchesSearch =
        row.studentName.toLowerCase().includes(normalizedSearch) ||
        mobileNumber.includes(normalizedSearch);
      if (!matchesSearch) return;
    }

    if (!byStudent.has(row.studentId)) {
      byStudent.set(row.studentId, {
        id: row.studentId,
        studentId: row.studentId,
        studentName: row.studentName,
        mobileNumber: row.mobileNumber,
        correctAnswers: 0,
        totalQuestions: 0,
      });
    }

    const student = byStudent.get(row.studentId);
    student.correctAnswers += row.correctAnswers;
    student.totalQuestions += row.totalQuestions;
  });

  const leaderboard = Array.from(byStudent.values())
    .map((student) => ({
      id: student.studentId,
      studentId: student.studentId,
      studentName: student.studentName,
      mobileNumber: student.mobileNumber,
      progress:
        student.totalQuestions > 0
          ? roundProgress((student.correctAnswers / student.totalQuestions) * 100)
          : 0,
    }))
    .sort((a, b) => {
      const progressDelta = Number(b.progress || 0) - Number(a.progress || 0);
      if (progressDelta !== 0) return progressDelta;
      return a.studentName.localeCompare(b.studentName);
    });

  return {
    courses: courses.map(sanitizeCourse),
    leaderboard,
  };
};

export default { getDashboard, getTeacherSubmissions, getTeacherLeaderboard };
