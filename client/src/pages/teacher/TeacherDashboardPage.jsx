import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { listNotifications } from '../../services/notification.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import useAuth from '../../hooks/useAuth.js';

const TYPE_LABELS = {
  class: 'Class',
  assignment: 'Assignment',
  payment: 'Payment',
  enrollment: 'Enrollment',
  announcement: 'Announcement',
  system: 'System',
};

const SHORTCUTS = [
  { to: '/teacher/classes', label: 'Add a class' },
  { to: '/teacher/assignments', label: 'Add an assignment' },
  { to: '/teacher/mcqs/new', label: 'Create a practice set' },
];

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-IN');

const relativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function ArrowIcon() {
  return (
    <svg
      className="teacher-dashboard-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg
      className="teacher-dashboard-caret"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="teacher-dashboard-skeleton" role="status">
      <span className="sr-only">Loading dashboard…</span>
      <div className="teacher-dashboard-skeleton-strip" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div className="skeleton teacher-dashboard-skeleton-cell" key={item} />
        ))}
      </div>
      <div className="skeleton teacher-dashboard-skeleton-focus" aria-hidden="true" />
      <div className="teacher-dashboard-skeleton-columns" aria-hidden="true">
        <div className="skeleton teacher-dashboard-skeleton-panel" />
        <div className="skeleton teacher-dashboard-skeleton-panel" />
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [courseFilter, setCourseFilter] = useState('all');
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [notificationsFailed, setNotificationsFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTeacherDashboard({ courseId: courseFilter });
      setDashboard(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load teacher dashboard.');
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let cancelled = false;
    setNotificationsFailed(false);
    listNotifications({ limit: 3 })
      .then((response) => {
        if (!cancelled) setNotifications(response?.data?.notifications || []);
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
          setNotificationsFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const courses = useMemo(() => dashboard?.courses || [], [dashboard]);
  const courseOptions = useMemo(
    () => [{ id: 'all', title: 'All courses' }].concat(
      courses.map((course) => ({ id: course.id, title: course.title }))
    ),
    [courses]
  );

  const retry = () => {
    setReloadKey((key) => key + 1);
    loadDashboard();
  };

  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const selectedCourse = dashboard?.selectedCourse || null;
  const courseLabel = selectedCourse?.title || 'All courses';

  const totalSubmissions = dashboard?.totalSubmissions ?? 0;
  const pendingSubmissions = dashboard?.pendingSubmissions ?? 0;
  const reviewedSubmissions = Math.max(0, totalSubmissions - pendingSubmissions);
  const reviewedPct = totalSubmissions > 0 ? (reviewedSubmissions / totalSubmissions) * 100 : 0;

  const snapshot = dashboard
    ? [
        {
          label: 'Students',
          value: formatNumber(dashboard.totalStudents),
          note: selectedCourse
            ? `in ${selectedCourse.title}`
            : dashboard.totalCourses === 0
              ? 'No courses yet'
              : `across ${dashboard.totalCourses} ${dashboard.totalCourses === 1 ? 'course' : 'courses'}`,
        },
        { label: 'Classes', value: formatNumber(dashboard.totalClasses), note: 'Published' },
        {
          label: 'Assignments',
          value: formatNumber(dashboard.totalAssignments),
          note: 'Published',
        },
        {
          label: 'Practice sets',
          value: formatNumber(dashboard.totalPracticeSets),
          note: 'Published',
        },
      ]
    : [];

  const announcement = dashboard?.liveAnnouncement || null;
  const recentSubmissions = dashboard?.recentSubmissions || [];
  const recentNotifications = notifications || [];

  return (
    <div className="teacher-dashboard fade-in">
      <header className="teacher-dashboard-masthead">
        <div className="teacher-dashboard-head">
          <h1 className="teacher-dashboard-title">
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </h1>

          {!dashboard && !error ? (
            <span className="skeleton teacher-dashboard-switch-skeleton" aria-hidden="true" />
          ) : courses.length > 1 ? (
            <label className="teacher-dashboard-switch">
              <span className="teacher-dashboard-switch-label" aria-hidden="true">
                <span>{courseLabel}</span>
                <CaretIcon />
              </span>
              <select
                className="teacher-dashboard-switch-select"
                aria-label="Course"
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
              >
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          ) : courses.length === 1 ? (
            <p className="teacher-dashboard-course-title">{courses[0].title}</p>
          ) : null}
        </div>

        <div className="teacher-dashboard-stat">
          <span className="teacher-dashboard-stat-label">Review queue</span>
          {!dashboard ? (
            error ? (
              <span className="teacher-dashboard-stat-value">—</span>
            ) : (
              <span className="skeleton teacher-dashboard-stat-skeleton" aria-hidden="true" />
            )
          ) : (
            <>
              <span className="teacher-dashboard-stat-value">
                {formatNumber(pendingSubmissions)}
                {totalSubmissions > 0 ? (
                  <span className="teacher-dashboard-stat-total">
                    {' '}
                    of {formatNumber(totalSubmissions)}
                  </span>
                ) : null}
              </span>
              {totalSubmissions > 0 ? (
                <>
                  <span className="teacher-dashboard-bar" aria-hidden="true">
                    <span style={{ width: `${reviewedPct}%` }} />
                  </span>
                  <span className="teacher-dashboard-stat-caption">
                    {pendingSubmissions > 0
                      ? `${formatNumber(reviewedSubmissions)} reviewed`
                      : 'All submissions reviewed'}
                  </span>
                </>
              ) : (
                <span className="teacher-dashboard-stat-caption">No submissions yet</span>
              )}
            </>
          )}
        </div>
      </header>

      {error ? (
        <div className="teacher-dashboard-state">
          <ErrorState message={error} onRetry={retry} />
        </div>
      ) : loading && !dashboard ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="teacher-dashboard-snapshot" aria-label="Teaching snapshot">
            {snapshot.map((item) => (
              <article className="teacher-dashboard-snapshot-cell" key={item.label}>
                <p className="teacher-dashboard-snapshot-label">{item.label}</p>
                <p className="teacher-dashboard-snapshot-value">{item.value}</p>
                <p className="teacher-dashboard-snapshot-note">{item.note}</p>
              </article>
            ))}
          </section>

          <section
            className={`teacher-dashboard-focus${announcement ? '' : ' is-empty'}`}
            aria-labelledby="teacher-announcement-heading"
          >
            <div className="teacher-dashboard-focus-head">
              <span className="teacher-dashboard-eyebrow">Live announcement</span>
              {announcement?.publishedAt ? (
                <span className="teacher-dashboard-focus-date">
                  {formatDate(announcement.publishedAt)}
                </span>
              ) : null}
            </div>
            <div className="teacher-dashboard-focus-body">
              <h2 id="teacher-announcement-heading">
                {announcement ? announcement.title : 'No live announcement.'}
              </h2>
              <p>
                {announcement
                  ? announcement.content
                  : 'Announcements published by an admin will appear here.'}
              </p>
            </div>
          </section>

          <div className="teacher-dashboard-columns">
            <section
              className="teacher-dashboard-panel"
              aria-labelledby="teacher-submissions-heading"
            >
              <header className="teacher-dashboard-panel-head">
                <h2 id="teacher-submissions-heading">Recent submissions</h2>
                <Link to="/teacher/submissions" className="teacher-dashboard-panel-link">
                  All submissions
                  <ArrowIcon />
                </Link>
              </header>

              {recentSubmissions.length === 0 ? (
                <EmptyState
                  title="No submissions yet"
                  message="Student submissions appear here as they arrive."
                />
              ) : (
                <ol className="teacher-dashboard-list">
                  {recentSubmissions.map((submission) => (
                    <li className="teacher-dashboard-row" key={submission.id}>
                      <span className="teacher-dashboard-row-main">
                        <span className="teacher-dashboard-row-title">{submission.studentName}</span>
                        <span className="teacher-dashboard-row-meta">
                          {submission.title}
                          {submission.courseTitle ? ` · ${submission.courseTitle}` : ''}
                        </span>
                      </span>
                      <span className="teacher-dashboard-row-side">
                        <span
                          className={`teacher-dashboard-status is-${
                            submission.status === 'pending' ? 'pending' : 'done'
                          }`}
                        >
                          {submission.status === 'pending'
                            ? submission.isLate
                              ? 'Late'
                              : 'Pending'
                            : 'Reviewed'}
                        </span>
                        <time dateTime={submission.submittedAt || undefined}>
                          {relativeTime(submission.submittedAt)}
                        </time>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="teacher-dashboard-side">
              <section
                className="teacher-dashboard-panel"
                aria-labelledby="teacher-shortcuts-heading"
              >
                <header className="teacher-dashboard-panel-head">
                  <h2 id="teacher-shortcuts-heading">Create</h2>
                </header>

                <ol className="teacher-dashboard-list">
                  {SHORTCUTS.map((shortcut) => (
                    <li key={shortcut.to}>
                      <Link to={shortcut.to} className="teacher-dashboard-row is-link">
                        <span className="teacher-dashboard-row-main">
                          <span className="teacher-dashboard-row-title">{shortcut.label}</span>
                        </span>
                        <ArrowIcon />
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>

              <section
                className="teacher-dashboard-panel"
                aria-labelledby="teacher-notifications-heading"
              >
                <header className="teacher-dashboard-panel-head">
                  <h2 id="teacher-notifications-heading">Notifications</h2>
                  <Link to="/teacher/notifications" className="teacher-dashboard-panel-link">
                    All notifications
                    <ArrowIcon />
                  </Link>
                </header>

                {notificationsFailed ? (
                  <p className="teacher-dashboard-note">Inbox unavailable right now.</p>
                ) : notifications === null ? (
                  <div className="teacher-dashboard-skeleton-rows" aria-hidden="true">
                    {[0, 1, 2].map((row) => (
                      <div className="teacher-dashboard-skeleton-row" key={row}>
                        <span className="skeleton teacher-dashboard-skeleton-line" />
                        <span className="skeleton teacher-dashboard-skeleton-meta" />
                      </div>
                    ))}
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <EmptyState title="No notifications" message="You're all caught up." />
                ) : (
                  <ol className="teacher-dashboard-list">
                    {recentNotifications.map((notification) => (
                      <li
                        className={`teacher-dashboard-row is-static${
                          notification.isRead ? '' : ' is-unread'
                        }`}
                        key={notification.id}
                      >
                        <span className="teacher-dashboard-row-main">
                          <span className="teacher-dashboard-row-title">{notification.title}</span>
                          <span className="teacher-dashboard-row-meta">
                            {TYPE_LABELS[notification.type] || 'Notification'}
                            <span aria-hidden="true"> · </span>
                            <time dateTime={notification.createdAt}>
                              {relativeTime(notification.createdAt)}
                            </time>
                          </span>
                        </span>
                        {notification.isRead ? null : (
                          <span className="teacher-dashboard-status is-pending">Unread</span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
