import { useEffect, useMemo, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import { listAnnouncements } from '../../services/announcement.service.js';
import { listAdminCourses } from '../../services/course.service.js';
import { listEnrollments } from '../../services/enrollment.service.js';
import { listNotifications } from '../../services/notification.service.js';
import { listPayments } from '../../services/payment.service.js';
import { listStudents } from '../../services/student.service.js';
import { listTeachers } from '../../services/admin-teacher.service.js';
import { getStoredUser } from '../../utils/token-storage.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

const getTotal = (response, key, fallbackKey) =>
  response?.data?.[key] ?? response?.data?.pagination?.[fallbackKey || 'totalItems'] ?? 0;

export default function AdminDashboardPage() {
  const storedUser = getStoredUser();
  const adminName = storedUser?.name || 'Admin';
  const [courseFilter, setCourseFilter] = useState('all');
  const [dashboard, setDashboard] = useState({
    courses: [],
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    announcement: null,
    notifications: [],
    activity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const courseScopedParams = courseFilter === 'all' ? {} : { courseId: courseFilter };
      const [
        coursesRes,
        studentsRes,
        teachersRes,
        enrollmentsRes,
        paymentsRes,
        announcementsRes,
        notificationsRes,
      ] = await Promise.all([
        listAdminCourses({ limit: 100 }),
        listStudents({ courseId: courseFilter, level: 'all' }).catch(() => null),
        listTeachers({ courseId: courseFilter }).catch(() => null),
        listEnrollments(courseScopedParams).catch(() => null),
        listPayments({ status: 'verified', ...courseScopedParams }).catch(() => null),
        listAnnouncements({ status: 'published', limit: 5 }).catch(() => null),
        listNotifications({ limit: 5 }).catch(() => null),
      ]);

      const courses = coursesRes?.data?.courses || [];
      const payments = paymentsRes?.data?.payments || [];
      const announcements = announcementsRes?.data?.announcements || [];
      const notifications = notificationsRes?.data?.notifications || [];
      const enrollments = enrollmentsRes?.data?.enrollments || [];
      const selectedCourse = courses.find((course) => course.id === courseFilter) || null;

      const activity = [
        ...enrollments.slice(0, 3).map((enrollment) => ({
          id: `enrollment-${enrollment.id}`,
          title: enrollment.course?.title || 'Course enrollment',
          detail: `Enrollment ${enrollment.status}`,
          date: enrollment.enrolledAt,
          status: enrollment.status,
        })),
        ...payments.slice(0, 2).map((payment) => ({
          id: `payment-${payment.id}`,
          title: payment.course?.title || 'Payment',
          detail: `${payment.currency || 'INR'} ${payment.amount || 0}`,
          date: payment.verifiedAt || payment.submittedAt,
          status: payment.status,
        })),
      ]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 5);

      setDashboard({
        courses,
        selectedCourse,
        totalStudents: getTotal(studentsRes, 'totalStudents'),
        totalTeachers: getTotal(teachersRes, 'totalTeachers'),
        totalCourses: courseFilter === 'all' ? getTotal(coursesRes, 'totalItems') || courses.length : 1,
        totalEnrollments: getTotal(enrollmentsRes, 'totalItems'),
        totalRevenue: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        announcement: announcements[0] || null,
        notifications,
        activity,
      });
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [courseFilter]);

  const courseOptions = useMemo(
    () => [
      { id: 'all', title: 'All Courses' },
      ...dashboard.courses.map((course) => ({ id: course.id, title: course.title })),
    ],
    [dashboard.courses]
  );

  const stats = [
    { label: 'Total Students', value: dashboard.totalStudents, tone: 'stat-indigo' },
    { label: 'Total Teachers', value: dashboard.totalTeachers, tone: 'stat-violet' },
    { label: 'Total Courses', value: dashboard.totalCourses, tone: 'stat-teal' },
    { label: 'Total Enrollments', value: dashboard.totalEnrollments, tone: 'stat-coral' },
    {
      label: 'Total Revenue',
      value: currencyFormatter.format(dashboard.totalRevenue),
      tone: 'stat-amber',
    },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <p className="text-caption">Admin</p>
          <h1>Admin Dashboard</h1>
          <p className="admin-welcome">Welcome back, {adminName}</p>
        </div>

        <div className="admin-filter">
          <Select
            label="Filter by Course"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
          >
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </div>
      </header>

      {loading ? (
        <section className="admin-stats-panel">
          <Loading label="Loading dashboard..." />
        </section>
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : (
        <>
          <section className="admin-stats-panel" aria-label="Dashboard statistics">
            <div className="admin-stat-grid admin-stat-grid-five">
              {stats.map((stat) => (
                <article key={stat.label} className="admin-stat-card">
                  <p className={`admin-stat-value ${stat.tone}`}>{stat.value}</p>
                  <p className="admin-stat-label">{stat.label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-dashboard-main-grid">
            <article className="admin-announcement-card" aria-labelledby="live-announcement-heading">
              <div>
                <p className="text-caption">Recent / Live Announcement</p>
                {dashboard.announcement ? (
                  <>
                    <h2 id="live-announcement-heading">{dashboard.announcement.title}</h2>
                    <p>{dashboard.announcement.content}</p>
                  </>
                ) : (
                  <>
                    <h2 id="live-announcement-heading">No live announcement</h2>
                    <p>Published announcements will appear here.</p>
                  </>
                )}
              </div>
              {dashboard.announcement ? (
                <Badge status={dashboard.announcement.status || 'published'}>
                  {dashboard.announcement.status || 'Live'}
                </Badge>
              ) : null}
            </article>

            <Card variant="admin-dashboard-list-card">
              <div className="section-head">
                <div>
                  <p className="text-caption">Inbox</p>
                  <h2>Recent Notifications</h2>
                </div>
              </div>
              {dashboard.notifications.length === 0 ? (
                <EmptyState title="No notifications" message="Admin notifications will appear here." />
              ) : (
                <div className="admin-dashboard-list">
                  {dashboard.notifications.map((notification) => (
                    <article key={notification.id} className="admin-dashboard-list-row">
                      <div>
                        <h3>{notification.title}</h3>
                        <p>{notification.message}</p>
                      </div>
                      <span className="text-meta">{formatDate(notification.createdAt)}</span>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="admin-quick-actions admin-overview-section" aria-labelledby="activity-heading">
            <div>
              <p className="text-caption">Quick Overview</p>
              <h2 id="activity-heading">Recent Activity</h2>
              {dashboard.selectedCourse ? (
                <p className="text-sm">Showing activity for {dashboard.selectedCourse.title}</p>
              ) : (
                <p className="text-sm">Showing activity across all courses.</p>
              )}
            </div>

            {dashboard.activity.length === 0 ? (
              <EmptyState title="No recent activity" message="Enrollments and payments will appear here." />
            ) : (
              <div className="admin-dashboard-list admin-activity-list">
                {dashboard.activity.map((item) => (
                  <article key={item.id} className="admin-dashboard-list-row">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                    </div>
                    <Badge status={item.status}>{item.status}</Badge>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
