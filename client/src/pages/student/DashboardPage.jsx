import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getCourseProgress } from '../../services/progress.service.js';
import { listNotifications } from '../../services/notification.service.js';
import Card from '../../components/common/Card.jsx';
import Badge from '../../components/common/Badge.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import useAuth from '../../hooks/useAuth.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const getCourseTitle = (enrollment) => enrollment?.course?.title || 'No course selected';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [res, notificationResult] = await Promise.all([
          getMyEnrollments({ limit: 50 }),
          listNotifications({ limit: 3 }).catch(() => ({ data: { notifications: [] } })),
        ]);
        const list = res?.data?.enrollments || [];
        if (cancelled) return;
        setEnrollments(list);
        setNotifications(notificationResult?.data?.notifications || []);

        const active = list.filter((e) => ACTIVE_STATUSES.includes(e.status) && getCourseId(e));
        const progressEntries = await Promise.all(
          active.map(async (e) => {
            const courseId = getCourseId(e);
            try {
              const p = await getCourseProgress(courseId);
              return [courseId, p?.data?.progress || null];
            } catch {
              return [courseId, null];
            }
          })
        );
        if (cancelled) return;
        setProgressMap(Object.fromEntries(progressEntries));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load your dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => ACTIVE_STATUSES.includes(e.status) && getCourseId(e)),
    [enrollments]
  );

  const selectedEnrollment = useMemo(() => {
    return [...activeEnrollments].sort((a, b) => {
      const aCourseId = getCourseId(a);
      const bCourseId = getCourseId(b);
      const aTime = progressMap[aCourseId]?.lastCompletedAt
        ? new Date(progressMap[aCourseId].lastCompletedAt).getTime()
        : 0;
      const bTime = progressMap[bCourseId]?.lastCompletedAt
        ? new Date(progressMap[bCourseId].lastCompletedAt).getTime()
        : 0;
      return bTime - aTime;
    })[0] || null;
  }, [activeEnrollments, progressMap]);

  const selectedCourseId = getCourseId(selectedEnrollment);
  const selectedProgress = selectedEnrollment
    ? progressMap[selectedCourseId]?.overallPercentage ?? 0
    : null;

  if (loading) return <Loading label="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const studentName = user?.name || 'Student';

  return (
    <div className="admin-dashboard student-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <h1>Welcome back, {studentName}</h1>
        </div>
      </header>

      <section className="admin-stat-grid teacher-stat-grid" aria-label="Student dashboard summary">
        <Card>
          <p className="admin-stat-value stat-indigo">
            {selectedEnrollment ? getCourseTitle(selectedEnrollment) : '-'}
          </p>
          <p className="admin-stat-label">Selected Course</p>
        </Card>
        <Card>
          <p className="admin-stat-value stat-violet">
            {selectedProgress === null ? '-' : `${selectedProgress}%`}
          </p>
          <p className="admin-stat-label">Student Progress</p>
          {selectedProgress !== null ? (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <ProgressBar value={selectedProgress} />
            </div>
          ) : null}
        </Card>
      </section>

      <section className="admin-quick-actions" aria-labelledby="top-notifications-heading">
        <div className="section-head">
          <div>
            <h2 id="top-notifications-heading">Top Notifications</h2>
          </div>
          <Link to="/notifications" className="link-arrow text-sm">View all</Link>
        </div>

        {notifications.length === 0 ? (
          <EmptyState title="No notifications" message="You're all caught up." />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {notifications.map((notification) => (
              <Card key={notification.id} variant="card-notification">
                {!notification.isRead ? (
                  <span className="due-dot" style={{ background: 'var(--indigo)' }} aria-hidden="true" />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge status={notification.type}>{notification.type}</Badge>
                    <span className="text-meta">
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleDateString('en-IN')
                        : ''}
                    </span>
                  </div>
                  <h3 className="text-h4" style={{ margin: 'var(--space-2) 0 var(--space-1)' }}>
                    {notification.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    {notification.message}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="admin-quick-actions" aria-labelledby="quick-actions-heading">
        <div className="section-head">
          <div>
            <h2 id="quick-actions-heading">Quick Actions</h2>
          </div>
        </div>

        <div className="quick-actions">
          <Link
            to={selectedCourseId ? `/courses/${selectedCourseId}/learn` : '/classes'}
            className={`btn btn-primary${selectedEnrollment ? '' : ' disabled'}`}
            aria-disabled={!selectedEnrollment}
          >
            Watch Class
          </Link>
        </div>
      </section>
    </div>
  );
}
