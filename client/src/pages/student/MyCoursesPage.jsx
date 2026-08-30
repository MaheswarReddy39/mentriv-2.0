import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getCourseProgress } from '../../services/progress.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import CategoryThumb from '../../components/common/CategoryThumb.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const STATUS_LABELS = {
  approved: 'Active',
  completed: 'Completed',
  pending: 'Awaiting approval',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};

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
        const list = res.data.enrollments;
        if (cancelled) return;
        setEnrollments(list);

        const active = list.filter((e) => ['approved', 'completed'].includes(e.status));
        const entries = await Promise.all(
          active.map(async (e) => {
            try {
              const p = await getCourseProgress(e.course.id);
              return [e.course.id, p.data.progress];
            } catch {
              return [e.course.id, null];
            }
          })
        );
        if (!cancelled) setProgressMap(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load your courses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e) => e.course.title.toLowerCase().includes(q));
  }, [enrollments, search]);

  if (loading) return <Loading label="Loading your coursesâ€¦" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <>
      <div className="page-head fade-in">
        <div>
          <h1>My Courses</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Everything you're learning, in one place.
          </p>
        </div>
        <Input
          label="Search my courses"
          type="search"
          placeholder="Search by title"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ minWidth: 240 }}
        />
      </div>

      {visible.length === 0 ? (
        search ? (
          <EmptyState title="No matches" message={`No courses match "${search}".`} />
        ) : (
          <EmptyState
            title="Your learning journey starts here"
            message="Explore courses and enroll in your first course."
            action={<Link to="/courses" className="btn btn-primary">Browse courses</Link>}
          />
        )
      ) : (
        <div className="card-grid">
          {visible.map((e) => {
            const progress = progressMap[e.course.id];
            const pct = progress?.overallPercentage ?? 0;
            const canContinue = e.status === 'approved' || e.status === 'completed';

            return (
              <Card key={e.id} variant="card-course card-interactive">
                <CategoryThumb category="" title={e.course.title} />
                <div className="card-course-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge status={e.status}>{STATUS_LABELS[e.status]}</Badge>
                    <span className="text-meta">{pct}%</span>
                  </div>

                  <h3 className="clamp-2">{e.course.title}</h3>
                  <ProgressBar value={pct} />

                  {canContinue ? (
                    <Link
                      to={`/courses/${e.course.id}/learn`}
                      className="btn btn-outline btn-sm"
                      style={{ marginTop: 'auto' }}
                    >
                      Continue
                    </Link>
                  ) : (
                    <Button variant="secondary" size="sm" disabled style={{ marginTop: 'auto' }}>
                      {STATUS_LABELS[e.status]}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
