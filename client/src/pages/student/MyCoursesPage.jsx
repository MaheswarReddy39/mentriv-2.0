import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getCourseProgress } from '../../services/progress.service.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const ACCESS_STATUSES = ['approved', 'completed'];

const STATUS_META = {
  approved: { label: 'Active', tone: 'active' },
  completed: { label: 'Completed', tone: 'done' },
  pending: { label: 'Awaiting approval', tone: 'pending' },
  rejected: { label: 'Not approved', tone: 'pending' },
  cancelled: { label: 'Cancelled', tone: 'idle' },
};

const STATUS_ORDER = { approved: 0, completed: 1, pending: 2, rejected: 3, cancelled: 4 };

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function ArrowIcon() {
  return (
    <svg
      className="student-courses-arrow"
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

function CoursesSkeleton() {
  return (
    <div className="student-courses-skeleton" role="status">
      <span className="sr-only">Loading your courses…</span>
      <div className="student-courses-skeleton-panel" aria-hidden="true">
        <div className="student-courses-skeleton-head">
          <span className="skeleton student-courses-skeleton-title" />
          <span className="skeleton student-courses-skeleton-count" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div className="student-courses-skeleton-row" key={row}>
            <span className="skeleton student-courses-skeleton-line" />
            <span className="skeleton student-courses-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyEnrollments({ limit: 50 });
        const list = res?.data?.enrollments || [];
        if (cancelled) return;
        setEnrollments(list);

        const active = list.filter((item) => ACCESS_STATUSES.includes(item.status));
        const entries = await Promise.all(
          active.map(async (item) => {
            try {
              const p = await getCourseProgress(item.course.id);
              return [item.course.id, p?.data?.progress || null];
            } catch {
              return [item.course.id, null];
            }
          })
        );
        if (!cancelled) setProgressMap(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load your courses.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(
    () =>
      [...enrollments].sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
          String(a.course?.title || '').localeCompare(String(b.course?.title || ''))
      ),
    [enrollments]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((item) =>
      String(item.course?.title || '').toLowerCase().includes(q)
    );
  }, [ordered, search]);

  const activeEnrollments = enrollments.filter((item) => item.status === 'approved');
  const completedEnrollments = enrollments.filter((item) => item.status === 'completed');
  const progressValues = [...activeEnrollments, ...completedEnrollments]
    .map((item) => progressMap[item.course?.id])
    .filter((progress) => progress && Number.isFinite(progress.overallPercentage));

  const averagePct = progressValues.length
    ? Math.round(
        progressValues.reduce((total, progress) => total + progress.overallPercentage, 0) /
          progressValues.length
      )
    : null;

  const statValue = loading ? null : averagePct === null ? '—' : `${averagePct}%`;
  const statCaption = enrollments.length
    ? [
        `${activeEnrollments.length} active`,
        completedEnrollments.length ? `${completedEnrollments.length} completed` : null,
        enrollments.filter((item) => item.status === 'pending').length
          ? `${enrollments.filter((item) => item.status === 'pending').length} pending`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'No enrollments yet';

  const countLabel = search.trim()
    ? `${visible.length} of ${enrollments.length}`
    : `${enrollments.length} ${enrollments.length === 1 ? 'course' : 'courses'}`;

  return (
    <div className="student-courses fade-in">
      <header className="student-courses-masthead">
        <div className="student-courses-head">
          <h1 className="student-courses-title">My Courses</h1>
        </div>

        <div className="student-courses-stat">
          <span className="student-courses-stat-label">Average progress</span>
          {loading ? (
            <span className="skeleton student-courses-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-courses-stat-value">{statValue}</span>
          )}
          <span className="student-courses-bar" aria-hidden="true">
            <span style={{ width: `${averagePct || 0}%` }} />
          </span>
          <span className="student-courses-stat-caption">{statCaption}</span>
        </div>
      </header>

      {loading ? (
        <CoursesSkeleton />
      ) : error ? (
        <div className="student-courses-state">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="student-courses-state">
          <EmptyState
            title="No courses yet"
            message="Enroll in a course and it will appear here."
            action={
              <Link to="/courses" className="btn btn-outline btn-sm">
                Browse courses
              </Link>
            }
          />
        </div>
      ) : (
        <section className="student-courses-panel" aria-labelledby="student-courses-list-heading">
          <header className="student-courses-panel-head">
            <h2 id="student-courses-list-heading">Your courses</h2>
            <div className="student-courses-tools">
              <span className="student-courses-count">{countLabel}</span>
              <input
                className="student-courses-search-input"
                type="search"
                placeholder="Search courses"
                aria-label="Search courses"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </header>

          {visible.length === 0 ? (
            <div className="student-courses-empty">
              <EmptyState title="No matches" message={`No courses match “${search.trim()}”.`} />
            </div>
          ) : (
            <ol className="student-courses-list">
              {visible.map((enrollment) => {
                const courseId = enrollment.course?.id;
                const progress = progressMap[courseId];
                const pct = Number.isFinite(progress?.overallPercentage)
                  ? Math.round(progress.overallPercentage)
                  : null;
                const meta = STATUS_META[enrollment.status] || {
                  label: String(enrollment.status || 'Enrolled')
                    .replace(/_/g, ' ')
                    .replace(/^\w/, (char) => char.toUpperCase()),
                  tone: 'idle',
                };
                const canContinue = ACCESS_STATUSES.includes(enrollment.status);
                const enrolledOn = formatDate(enrollment.enrolledAt);
                const lastActivity = formatDate(progress?.lastCompletedAt);
                const metaLine = [
                  enrolledOn ? `Enrolled ${enrolledOn}` : null,
                  lastActivity ? `Last activity ${lastActivity}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                const body = (
                  <>
                    <div className="student-courses-row-main">
                      <h3 className="student-courses-row-title">
                        {enrollment.course?.title || 'Untitled course'}
                      </h3>
                      {metaLine ? <p className="student-courses-row-meta">{metaLine}</p> : null}
                    </div>

                    <div className="student-courses-row-progress">
                      <span className="student-courses-row-pct">
                        {pct === null ? '—' : `${pct}%`}
                      </span>
                      {pct === null ? null : (
                        <span className="student-courses-row-track" aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </div>

                    <span className={`student-courses-row-state is-${meta.tone}`}>
                      {meta.label}
                    </span>

                    {canContinue ? (
                      <ArrowIcon />
                    ) : (
                      <span className="student-courses-arrow-space" aria-hidden="true" />
                    )}
                  </>
                );

                return (
                  <li key={enrollment.id}>
                    {canContinue ? (
                      <Link to={`/courses/${courseId}/learn`} className="student-courses-row">
                        {body}
                      </Link>
                    ) : (
                      <div className="student-courses-row is-static">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
