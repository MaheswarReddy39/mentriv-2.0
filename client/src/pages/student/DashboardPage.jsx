import { useEffect, useState } from 'react';
import { getProgressOverview } from '../../services/progress.service.js';
import Card from '../../components/common/Card.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import useAuth from '../../hooks/useAuth.js';
import LearningStreakSection from './LearningStreakSection.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getProgressOverview();
        if (!cancelled) setOverview(result?.data || null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load your dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const overall = overview?.overall || null;
  const studentName = user?.name || 'Student';

  const statCards = [
    { label: 'Course Progress', tone: 'stat-indigo' },
    { label: 'Classes', tone: 'stat-teal' },
    { label: 'Assignments', tone: 'stat-amber' },
    { label: 'Practice', tone: 'stat-coral' },
  ];

  return (
    <div className="admin-dashboard student-dashboard fade-in">
      <header className="admin-dashboard-header">
        <div>
          <h1>Welcome back, {studentName}</h1>
          <p className="admin-welcome">A little learning every day adds up.</p>
        </div>
      </header>

      {loading ? (
        <>
          <section className="admin-stat-grid teacher-stat-grid" aria-hidden="true">
            {statCards.map((card) => (
              <div key={card.label} className="card">
                <Skeleton height="2rem" width="55%" />
                <Skeleton height="0.75rem" width="40%" style={{ marginTop: 'var(--space-3)' }} />
                <Skeleton
                  height="0.6rem"
                  radius="var(--radius-pill)"
                  style={{ marginTop: 'var(--space-4)' }}
                />
              </div>
            ))}
          </section>
          <section className="streak-section" aria-hidden="true">
            <Skeleton height="1.25rem" width="180px" />
            <Skeleton height="140px" style={{ marginTop: 'var(--space-5)' }} />
          </section>
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <>
          <section className="admin-stat-grid teacher-stat-grid" aria-label="Quick overview">
            <Card>
              <p className="admin-stat-value stat-indigo">{overall ? `${overall.pct}%` : '-'}</p>
              <p className="admin-stat-label">Course Progress</p>
              {overall ? (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <ProgressBar value={overall.pct} />
                </div>
              ) : null}
            </Card>
            <Card>
              <p className="admin-stat-value stat-teal">
                {overall ? `${overall.classes.completed} / ${overall.classes.total}` : '-'}
              </p>
              <p className="admin-stat-label">Classes</p>
            </Card>
            <Card>
              <p className="admin-stat-value stat-amber">
                {overall ? `${overall.assignments.completed} / ${overall.assignments.total}` : '-'}
              </p>
              <p className="admin-stat-label">Assignments</p>
            </Card>
            <Card>
              <p className="admin-stat-value stat-coral">
                {overall ? `${overall.mcq.attempted} / ${overall.mcq.total}` : '-'}
              </p>
              <p className="admin-stat-label">Practice</p>
            </Card>
          </section>

          <LearningStreakSection />
        </>
      )}
    </div>
  );
}
