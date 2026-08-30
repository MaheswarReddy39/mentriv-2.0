import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import StudentLayout from '../layouts/StudentLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import TeacherLayout from '../layouts/TeacherLayout.jsx';
import ProtectedRoute from '../components/routing/ProtectedRoute.jsx';
import AdminRoute from '../components/routing/AdminRoute.jsx';
import TeacherRoute from '../components/routing/TeacherRoute.jsx';
import StudentRoute from '../components/routing/StudentRoute.jsx';

// Public
import HomePage from '../pages/public/HomePage.jsx';
import CoursesPage from '../pages/public/CoursesPage.jsx';
import CourseDetailPage from '../pages/public/CourseDetailPage.jsx';
import AnnouncementsPage from '../pages/public/AnnouncementsPage.jsx';

// Auth
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage.jsx';
import ActivateAccountPage from '../pages/auth/ActivateAccountPage.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage.jsx';
import TeacherRegistrationPage from '../pages/auth/TeacherRegistrationPage.jsx';

// Student
import DashboardPage from '../pages/student/DashboardPage.jsx';
import StudentClassesPage from '../pages/student/StudentClassesPage.jsx';
import MyCoursesPage from '../pages/student/MyCoursesPage.jsx';
import CourseLearnPage from '../pages/student/CourseLearnPage.jsx';
import CourseAssignmentsPage from '../pages/student/CourseAssignmentsPage.jsx';
import CourseMcqsPage from '../pages/student/CourseMcqsPage.jsx';
import CourseProgressPage from '../pages/student/CourseProgressPage.jsx';
import ClassDetailPage from '../pages/student/ClassDetailPage.jsx';
import NotificationsPage from '../pages/student/NotificationsPage.jsx';
import ProfilePage from '../pages/student/ProfilePage.jsx';

// Assignments
import AssignmentDetailPage from '../pages/assignments/AssignmentDetailPage.jsx';

// MCQs
import McqTestDetailPage from '../pages/student/McqTestDetailPage.jsx';
import AttemptWorkspacePage from '../pages/student/AttemptWorkspacePage.jsx';
import McqAttemptResultPage from '../pages/student/McqAttemptResultPage.jsx';

// Admin
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminCoursesPage from '../pages/admin/AdminCoursesPage.jsx';
import AdminCourseCreatePage from '../pages/admin/AdminCourseCreatePage.jsx';
import CourseFormPage from '../pages/admin/CourseFormPage.jsx';
import AdminClassesPage from '../pages/admin/AdminClassesPage.jsx';
import ClassFormPage from '../pages/admin/ClassFormPage.jsx';
import AdminAssignmentsPage from '../pages/admin/AdminAssignmentsPage.jsx';
import AssignmentFormPage from '../pages/admin/AssignmentFormPage.jsx';
import AdminMcqsPage from '../pages/admin/AdminMcqsPage.jsx';
import McqTestFormPage from '../pages/admin/McqTestFormPage.jsx';
import AdminAnnouncementsPage from '../pages/admin/AdminAnnouncementsPage.jsx';
import AnnouncementFormPage from '../pages/admin/AnnouncementFormPage.jsx';
import AdminEnrollmentsPage from '../pages/admin/AdminEnrollmentsPage.jsx';
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage.jsx';
import AdminSubmissionsPage from '../pages/admin/AdminSubmissionsPage.jsx';
import AdminStudentsPage from '../pages/admin/AdminStudentsPage.jsx';
import AdminTeachersPage from '../pages/admin/AdminTeachersPage.jsx';
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage.jsx';

// Teacher
import TeacherDashboardPage from '../pages/teacher/TeacherDashboardPage.jsx';
import TeacherClassesPage from '../pages/teacher/TeacherClassesPage.jsx';
import TeacherAssignmentsPage from '../pages/teacher/TeacherAssignmentsPage.jsx';
import TeacherSubmissionsPage from '../pages/teacher/TeacherSubmissionsPage.jsx';
import TeacherLeaderboardPage from '../pages/teacher/TeacherLeaderboardPage.jsx';
import TeacherProfilePage from '../pages/teacher/TeacherProfilePage.jsx';

import NotFoundPage from '../pages/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Route>

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/teacher-registration" element={<TeacherRegistrationPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/activate-account" element={<ActivateAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Student (protected) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<StudentRoute />}>
          <Route element={<StudentLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/classes" element={<StudentClassesPage />} />
            <Route path="/assignments" element={<CourseAssignmentsPage />} />
            <Route path="/my-courses" element={<MyCoursesPage />} />
            <Route path="/courses/:courseId/learn" element={<CourseLearnPage />} />
            <Route path="/courses/:courseId/assignments" element={<CourseAssignmentsPage />} />
            <Route path="/courses/:courseId/mcqs" element={<CourseMcqsPage />} />
            <Route path="/courses/:courseId/progress" element={<CourseProgressPage />} />
            <Route path="/classes/:classId" element={<ClassDetailPage />} />
            <Route path="/assignments/:assignmentId" element={<AssignmentDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Route>

      {/* Teacher (protected + role-gated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<TeacherRoute />}>
          <Route element={<TeacherLayout />}>
            <Route path="/teacher" element={<TeacherDashboardPage />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/teacher/classes" element={<TeacherClassesPage />} />
            <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
            <Route path="/teacher/submissions" element={<TeacherSubmissionsPage />} />
            <Route path="/teacher/leaderboard" element={<TeacherLeaderboardPage />} />
            <Route path="/teacher/notifications" element={<NotificationsPage />} />
            <Route path="/teacher/profile" element={<TeacherProfilePage />} />
          </Route>
        </Route>
      </Route>

      {/* Admin (protected + role-gated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/courses" element={<AdminCoursesPage />} />
            <Route path="/admin/courses/new" element={<AdminCourseCreatePage />} />
            <Route path="/admin/courses/:courseId/edit" element={<CourseFormPage />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/teachers" element={<AdminTeachersPage />} />
            <Route path="/admin/classes" element={<AdminClassesPage />} />
            <Route path="/admin/classes/:classId/edit" element={<ClassFormPage />} />
            <Route path="/admin/enrollments" element={<AdminEnrollmentsPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
            <Route path="/admin/assignments/new" element={<AssignmentFormPage />} />
            <Route path="/admin/assignments/:assignmentId/edit" element={<AssignmentFormPage />} />
            <Route path="/admin/mcq-tests" element={<AdminMcqsPage />} />
            <Route path="/admin/mcq-tests/new" element={<McqTestFormPage />} />
            <Route path="/admin/mcq-tests/:testId/edit" element={<McqTestFormPage />} />
            <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
            <Route path="/admin/announcements/new" element={<AnnouncementFormPage />} />
            <Route path="/admin/announcements/:announcementId/edit" element={<AnnouncementFormPage />} />
          </Route>
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
