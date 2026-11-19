import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import Enrollment from '../models/enrollment.model.js';
import Announcement from '../models/announcement.model.js';
import Assignment from '../models/assignment.model.js';
import Class from '../models/class.model.js';
import McqTest from '../models/mcq.model.js';
import McqAttempt from '../models/mcq-attempt.model.js';
import Submission from '../models/submission.model.js';
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

const PENDING_SUBMISSION_STATUSES = ['submitted', 'late'];

const sanitizeRecentSubmission = (submission) => ({
  id: submission._id.toString(),
  studentName: submission.studentId?.name || 'Student',
  title: submission.assignmentId?.title || 'Assignment',
  courseTitle: submission.courseId?.title || '',
  status: PENDING_SUBMISSION_STATUSES.includes(submission.status) ? 'pending' : 'reviewed',
  isLate: Boolean(submission.isLate || submission.status === 'late'),
  submittedAt: submission.submittedAt,
});

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

  const courseIds = selectedCourse ? [selectedCourse._id] : courses.map((course) => course._id);

  const [
    totalClasses,
    totalAssignments,
    totalPracticeSets,
    totalSubmissions,
    pendingSubmissions,
    recentSubmissions,
  ] = await Promise.all([
    Class.countDocuments({ courseId: { $in: courseIds }, status: 'published' }),
    Assignment.countDocuments({ courseIds: { $in: courseIds }, status: 'published' }),
    McqTest.countDocuments({ courseIds: { $in: courseIds }, status: 'published' }),
    Submission.countDocuments({ courseId: { $in: courseIds } }),
    Submission.countDocuments({
      courseId: { $in: courseIds },
      status: { $in: PENDING_SUBMISSION_STATUSES },
    }),
    Submission.find({ courseId: { $in: courseIds } })
      .sort({ submittedAt: -1, createdAt: -1 })
      .limit(5)
      .populate('studentId', 'name')
      .populate('assignmentId', 'title')
      .populate('courseId', 'title')
      .lean(),
  ]);

  return {
    totalStudents,
    totalCourses: selectedCourse ? 1 : courses.length,
    totalClasses,
    totalAssignments,
    totalPracticeSets,
    totalSubmissions,
    pendingSubmissions,
    recentSubmissions: recentSubmissions
      .filter((submission) => submission.studentId?._id && submission.assignmentId?._id)
      .map(sanitizeRecentSubmission),
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
      courseIds: [],
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
    McqTest.find({ courseIds: { $in: courseIds }, status: 'published' })
      .select('courseIds questions')
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
    const questionCount = Array.isArray(test.questions) ? test.questions.length : 0;
    // A shared test contributes its questions to every course it belongs to.
    (test.courseIds || []).forEach((courseId) => {
      const courseKey = courseId.toString();
      questionCountByCourse.set(courseKey, (questionCountByCourse.get(courseKey) || 0) + questionCount);
      if (!testIdsByCourse.has(courseKey)) {
        testIdsByCourse.set(courseKey, new Set());
      }
      testIdsByCourse.get(courseKey).add(test._id.toString());
    });
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

  return { courses, rows, courseIds: courseIds.map((id) => id.toString()) };
};

const buildSubmissionTimingRows = async ({ courseIds = [], normalizedSearch = '' } = {}) => {
  if (courseIds.length === 0) {
    return [];
  }

  const [submissionDocs, attemptDocs] = await Promise.all([
    Submission.find({ courseId: { $in: courseIds } })
      .sort({ submittedAt: -1 })
      .limit(100)
      .populate('studentId', 'name')
      .populate('assignmentId', 'title duration')
      .populate('courseId', 'title')
      .lean(),
    McqAttempt.find({ courseId: { $in: courseIds } })
      .sort({ submittedAt: -1, startedAt: -1 })
      .limit(100)
      .populate('studentId', 'name')
      .populate('mcqTestId', 'title duration')
      .populate('courseId', 'title')
      .lean(),
  ]);

  const buildRow = ({ id, doc, title, duration, status, isLate }) => {
    const startedAt = doc.startedAt ? new Date(doc.startedAt) : null;
    const submittedAt = doc.submittedAt ? new Date(doc.submittedAt) : null;
    const durationMinutes = typeof duration === 'number' ? duration : null;
    const timeTakenMinutes =
      startedAt && submittedAt
        ? Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 60000))
        : null;

    return {
      id,
      studentId: doc.studentId._id.toString(),
      studentName: doc.studentId.name,
      assignmentTitle: title,
      courseTitle: doc.courseId?.title || '',
      attemptNumber: doc.attemptNumber,
      status,
      isLate,
      startedAt,
      submittedAt,
      duration: durationMinutes,
      timeTakenMinutes,
    };
  };

  const submissionRows = submissionDocs
    .filter((doc) => doc.studentId?._id && doc.assignmentId?._id)
    .map((doc) =>
      buildRow({
        id: doc._id.toString(),
        doc,
        title: doc.assignmentId.title,
        duration: doc.assignmentId.duration,
        status: doc.status,
        isLate: Boolean(doc.isLate),
      })
    );

  const attemptRows = attemptDocs
    .filter((doc) => doc.studentId?._id && doc.mcqTestId?._id)
    .map((doc) =>
      buildRow({
        id: `attempt-${doc._id}`,
        doc,
        title: doc.mcqTestId.title,
        duration: doc.mcqTestId.duration,
        status: doc.status === 'evaluated' ? 'submitted' : 'pending',
        isLate: false,
      })
    );

  const rows = [...submissionRows, ...attemptRows]
    .sort(
      (a, b) =>
        (b.submittedAt ? b.submittedAt.getTime() : 0) -
        (a.submittedAt ? a.submittedAt.getTime() : 0)
    )
    .slice(0, 100);

  if (!normalizedSearch) {
    return rows;
  }
  return rows.filter((row) =>
    [row.studentName, row.assignmentTitle, row.courseTitle]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  );
};

const getTeacherSubmissions = async ({ search = '', courseId = 'all', level = 'all' } = {}) => {
  const { courses, rows, courseIds } = await buildStudentCourseProgressRows({ courseId, level });
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const submissions = rows.filter((row) => {
    if (!normalizedSearch) return true;
    return (
      row.studentName.toLowerCase().includes(normalizedSearch) ||
      row.courseTitle.toLowerCase().includes(normalizedSearch)
    );
  });

  const timing = await buildSubmissionTimingRows({ courseIds, normalizedSearch });

  const totalSubmissions = submissions.filter((row) => row.status === 'submitted').length;
  const pendingSubmissions = submissions.filter((row) => row.status === 'pending').length;
  const totalStudents = new Set(submissions.map((row) => row.studentId)).size;

  return {
    totalStudents,
    totalSubmissions,
    pendingSubmissions,
    courses: courses.map(sanitizeCourse),
    submissions,
    timing,
  };
};

const sanitizeTeacherClass = (lesson, courseId, courseTitle) => ({
  id: lesson._id.toString(),
  title: lesson.title,
  module: lesson.module || '',
  order: lesson.order || 0,
  duration: lesson.duration || 0,
  status: lesson.status,
  videoUrl: lesson.videoUrl || '',
  resourceCount: Array.isArray(lesson.resources) ? lesson.resources.length : 0,
  createdAt: lesson.createdAt,
  courseId,
  courseTitle,
});

const getTeacherClasses = async ({ courseId = 'all' } = {}) => {
  if (courseId !== 'all' && !mongoose.isValidObjectId(courseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  const courses = await getAvailableCourses();
  const selectedCourse =
    courseId === 'all' ? null : courses.find((course) => course._id.toString() === courseId);

  if (courseId !== 'all' && !selectedCourse) {
    throw new ApiError(404, 'Course not found');
  }

  const scopedCourses = selectedCourse ? [selectedCourse] : courses;
  const courseTitleById = new Map(
    scopedCourses.map((course) => [course._id.toString(), course.title])
  );

  const lessons = scopedCourses.length
    ? await Class.find({
        courseId: { $in: scopedCourses.map((course) => course._id) },
        status: { $ne: 'archived' },
      })
        .sort({ module: 1, order: 1, createdAt: 1 })
        .lean()
    : [];

  const classes = lessons.map((lesson) => {
    const lessonCourseId = lesson.courseId.toString();
    return sanitizeTeacherClass(
      lesson,
      lessonCourseId,
      courseTitleById.get(lessonCourseId) || ''
    );
  });

  return {
    courses: courses.map(sanitizeCourse),
    selectedCourse: selectedCourse ? sanitizeCourse(selectedCourse) : null,
    classes,
    totalClasses: classes.length,
    publishedClasses: classes.filter((lesson) => lesson.status === 'published').length,
    draftClasses: classes.filter((lesson) => lesson.status === 'draft').length,
  };
};

const sanitizeTeacherAssignment = (assignment, courseTitles) => ({
  id: assignment._id.toString(),
  title: assignment.title,
  assignmentType: assignment.assignmentType,
  duration: assignment.duration ?? null,
  maxMarks: assignment.maxMarks ?? null,
  dueDate: assignment.dueDate || null,
  status: assignment.status,
  createdAt: assignment.createdAt,
  courseTitles,
});

const sanitizeTeacherMcqTest = (test, courseTitles) => ({
  id: test._id.toString(),
  title: test.title,
  description: test.description || '',
  duration: test.duration ?? null,
  passingScore: test.passingScore ?? null,
  questionCount: Array.isArray(test.questions) ? test.questions.length : 0,
  status: test.status,
  createdAt: test.createdAt,
  courseTitles,
});

const getTeacherAssignments = async ({ courseId = 'all' } = {}) => {
  if (courseId !== 'all' && !mongoose.isValidObjectId(courseId)) {
    throw new ApiError(400, 'Invalid course id');
  }

  const courses = await getAvailableCourses();
  const selectedCourse =
    courseId === 'all' ? null : courses.find((course) => course._id.toString() === courseId);

  if (courseId !== 'all' && !selectedCourse) {
    throw new ApiError(404, 'Course not found');
  }

  const scopedCourses = selectedCourse ? [selectedCourse] : courses;
  const courseTitleById = new Map(
    scopedCourses.map((course) => [course._id.toString(), course.title])
  );
  const courseIds = scopedCourses.map((course) => course._id);

  const [assignmentDocs, mcqDocs] = courseIds.length
    ? await Promise.all([
        Assignment.find({ courseIds: { $in: courseIds }, status: { $ne: 'archived' } })
          .select('title assignmentType duration maxMarks dueDate status createdAt courseIds')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),
        McqTest.find({ courseIds: { $in: courseIds }, status: { $ne: 'archived' } })
          .select('title description duration passingScore status questions createdAt courseIds')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),
      ])
    : [[], []];

  const courseTitlesFor = (document) =>
    (document.courseIds || [])
      .map((id) => courseTitleById.get(id.toString()))
      .filter(Boolean);

  const assignments = assignmentDocs.map((assignment) =>
    sanitizeTeacherAssignment(assignment, courseTitlesFor(assignment))
  );
  const mcqTests = mcqDocs.map((test) => sanitizeTeacherMcqTest(test, courseTitlesFor(test)));

  return {
    courses: courses.map(sanitizeCourse),
    selectedCourse: selectedCourse ? sanitizeCourse(selectedCourse) : null,
    assignments,
    mcqTests,
    totalAssignments: assignments.length,
    publishedAssignments: assignments.filter((item) => item.status === 'published').length,
    totalMcqTests: mcqTests.length,
    publishedMcqTests: mcqTests.filter((item) => item.status === 'published').length,
  };
};

const getTeacherMcqs = async ({ courseId = 'all' } = {}) => {
  const { courses, selectedCourse, mcqTests, totalMcqTests, publishedMcqTests } =
    await getTeacherAssignments({ courseId });

  return {
    courses,
    selectedCourse,
    mcqTests,
    totalMcqTests,
    publishedMcqTests,
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
        courseCount: 0,
        attemptedCourseCount: 0,
        correctAnswers: 0,
        totalQuestions: 0,
      });
    }

    const student = byStudent.get(row.studentId);
    student.courseCount += 1;
    if (row.status === 'submitted') student.attemptedCourseCount += 1;
    student.correctAnswers += row.correctAnswers;
    student.totalQuestions += row.totalQuestions;
  });

  const leaderboard = Array.from(byStudent.values())
    .map((student) => ({
      id: student.studentId,
      studentId: student.studentId,
      studentName: student.studentName,
      mobileNumber: student.mobileNumber,
      courseCount: student.courseCount,
      attemptedCourseCount: student.attemptedCourseCount,
      correctAnswers: student.correctAnswers,
      totalQuestions: student.totalQuestions,
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

export default {
  getDashboard,
  getTeacherClasses,
  getTeacherAssignments,
  getTeacherMcqs,
  getTeacherSubmissions,
  getTeacherLeaderboard,
};
