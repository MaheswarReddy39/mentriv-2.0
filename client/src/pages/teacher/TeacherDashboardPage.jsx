import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Select from '../../components/common/Select.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import { listNotifications } from '../../services/notification.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import { getStoredUser } from '../../utils/token-storage.js';

const FALLBACK_ANNOUNCEMENT = {
  label: 'Live announcement',
  title: 'No live announcement yet',
  content: 'The latest teacher announcement will appear here when published.',
};

export default function TeacherDashboardPage() {
  const storedUser = getStoredUser();
  const [courseFilter, setCourseFilter] = useState('all');
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, notificationRes] = await Promise.all([
        getTeacherDashboard({ courseId: courseFilter }),
        listNotifications({ limit: 3 }).catch(() => ({ data: { notifications: [] } })),
      ]);
      setDashboard(response.data);
      setNotifications(notificationRes?.data?.notifications || []);
    } catch (err) {
      setError(err.message || 'Failed to load teacher dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [courseFilter]);

  const courseOptions = useMemo(
    () => [
      { id: 'all', title: 'All' },
      ...(dashboard?.courses || []).map((course) => ({ id: course.id, title: course.title })),
    ],
    [dashboard]
  );

  const teacherName = storedUser?.name || 'Teacher';
  const announcement = dashboard?.liveAnnouncement
    ? {
        label: 'Live announcement',
        title: dashboard.liveAnnouncement.title,
        content: dashboard.liveAnnouncement.content,
      }
    : FALLBACK_ANNOUNCEMENT;

  return (
    <div className="admin-dashboard teacher-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <p className="text-caption">Teacher</p>
          <h1>Teacher Dashboard</h1>
          <p className="admin-welcome">Welcome back, {teacherName}</p>
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

      <section className="admin-stats-panel" aria-label="Dashboard statistics">
        {loading ? (
          <Loading label="Loading dashboard..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboard} />
        ) : (
          <div className="admin-stat-grid teacher-stat-grid">
            <article className="admin-stat-card">
              <p className="admin-stat-value stat-indigo">{dashboard?.totalStudents ?? 0}</p>
              <p className="admin-stat-label">Total Students</p>
            </article>
            <article className="admin-stat-card">
              <p className="admin-stat-value stat-violet">{dashboard?.totalCourses ?? 0}</p>
              <p className="admin-stat-label">Total Courses</p>
            </article>
          </div>
        )}
      </section>

      <section className="admin-announcement-card" aria-labelledby="teacher-live-announcement-heading">
        <div>
          <p className="text-caption">{announcement.label}</p>
          <h2 id="teacher-live-announcement-heading">{announcement.title}</h2>
          <p>{announcement.content}</p>
        </div>
        <span className="badge badge-success">Live</span>
      </section>

      <section className="admin-quick-actions admin-overview-section" aria-labelledby="teacher-notifications-heading">
        <div>
          <p className="text-caption">Inbox</p>
          <h2 id="teacher-notifications-heading">Recent Notifications</h2>
        </div>
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" message="You're all caught up." />
        ) : (
          <div className="admin-dashboard-list admin-activity-list">
            {notifications.map((notification) => (
              <Card key={notification.id} variant="admin-dashboard-list-row">
                <div>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                </div>
                <Badge status={notification.type}>{notification.type}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="admin-quick-actions" aria-labelledby="teacher-quick-actions-heading">
        <div>
          <p className="text-caption">Shortcuts</p>
          <h2 id="teacher-quick-actions-heading">Quick Actions</h2>
        </div>
        <div className="admin-action-grid">
          <Link to="/teacher/classes" className="btn btn-primary">
            Add Class
          </Link>
          <Link to="/teacher/assignments" className="btn btn-outline">
            Add Assignment
          </Link>
        </div>
      </section>
    </div>
  );
}
