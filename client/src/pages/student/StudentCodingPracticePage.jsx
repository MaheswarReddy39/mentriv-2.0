import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { listCodingTasks } from '../../services/coding-practice.service.js';

// ONE row per teacher-entered title — the title IS the technology/category
// (HTML, CSS, JavaScript, React, ...). The per-task `topic` field is a detail
// description and never becomes a row. Rows follow the backend task order
// (first appearance); titles from several courses/levels merge into one row
// and each task is counted exactly once.
const mergeTechnologyRows = (tasks) => {
  const byTitle = new Map();

  tasks.forEach((task) => {
    const title = String(task?.title || '').trim();
    if (!title) return;

    const entry = byTitle.get(title) || {
      title,
      taskCount: 0,
      solvedCount: 0,
      attemptedCount: 0,
    };
    entry.taskCount += 1;
    if (task.studentStatus === 'solved') entry.solvedCount += 1;
    if (task.studentStatus !== 'not_started') entry.attemptedCount += 1;
    byTitle.set(title, entry);
  });

  return [...byTitle.values()].map((entry) => ({
    ...entry,
    progress:
      entry.taskCount > 0
        ? Math.round((entry.solvedCount / entry.taskCount) * 100)
        : 0,
  }));
};

function ArrowIcon() {
  return (
    <svg
      className="student-coding-arrow"
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

function CodingSkeleton() {
  return (
    <div className="student-coding-skeleton" role="status">
      <span className="sr-only">Loading coding practice…</span>
      <div className="student-coding-skeleton-panel" aria-hidden="true">
        <div className="student-coding-skeleton-head">
          <span className="skeleton student-coding-skeleton-title" />
          <span className="skeleton student-coding-skeleton-count" />
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="student-coding-skeleton-row" key={row}>
            <div className="student-coding-skeleton-copy">
              <span className="skeleton student-coding-skeleton-line" />
              <span className="skeleton student-coding-skeleton-meta" />
            </div>
            <span className="skeleton student-coding-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentCodingPracticePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Already scoped server-side to published tasks in enrolled courses.
      const response = await listCodingTasks({});
      setTasks(response?.data?.tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to load coding practice.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = mergeTechnologyRows(tasks);
  const totalTasks = rows.reduce((sum, row) => sum + row.taskCount, 0);
  const totalSolved = rows.reduce((sum, row) => sum + row.solvedCount, 0);
  const solvedPct = totalTasks > 0 ? Math.round((totalSolved / totalTasks) * 100) : 0;

  const openTechnology = (title) => {
    const params = new URLSearchParams({ title });
    navigate(`/coding-practice/topic?${params.toString()}`);
  };

  return (
    <div className="student-coding fade-in">
      <header className="student-coding-masthead">
        <div className="student-coding-head">
          <h1 className="student-coding-title">Coding Practice</h1>
        </div>

        <div className="student-coding-stat">
          <span className="student-coding-stat-label">Solved</span>
          {loading ? (
            <span className="skeleton student-coding-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-coding-stat-value">
              {error ? '—' : totalSolved}
              <span className="student-coding-stat-total"> / {error ? '—' : totalTasks}</span>
            </span>
          )}
          <span className="student-coding-bar" aria-hidden="true">
            <span style={{ width: `${error ? 0 : solvedPct}%` }} />
          </span>
        </div>
      </header>

      {error ? (
        <div className="student-coding-state">
          <ErrorState title="Failed to load coding practice" message={error} onRetry={load} />
        </div>
      ) : loading ? (
        <CodingSkeleton />
      ) : rows.length === 0 ? (
        <div className="student-coding-state">
          <EmptyState
            title="No coding tasks yet"
            message="Coding challenges appear here once your instructor publishes them."
          />
        </div>
      ) : (
        <section className="student-coding-panel" aria-labelledby="student-coding-technologies">
          <header className="student-coding-panel-head">
            <h2 id="student-coding-technologies">Technologies</h2>
            <span className="student-coding-panel-count">
              {rows.length} {rows.length === 1 ? 'technology' : 'technologies'}
            </span>
          </header>

          <ol className="student-coding-list">
            {rows.map((row) => {
              const meta = [
                `${row.taskCount} ${row.taskCount === 1 ? 'task' : 'tasks'}`,
                row.solvedCount > 0 ? `${row.solvedCount} solved` : null,
              ]
                .filter(Boolean)
                .join(' · ');

              const primary =
                row.solvedCount > 0
                  ? `${row.progress}%`
                  : row.attemptedCount > 0
                    ? 'In progress'
                    : 'Not started';

              return (
                <li key={row.title}>
                  <button
                    type="button"
                    className="student-coding-row"
                    onClick={() => openTechnology(row.title)}
                  >
                    <span className="student-coding-row-main">
                      <span className="student-coding-row-title">{row.title}</span>
                      <span className="student-coding-row-meta">{meta}</span>
                    </span>
                    <span className="student-coding-row-side">
                      <span
                        className={`student-coding-row-score${
                          primary === 'Not started' ? ' is-idle' : ''
                        }`}
                      >
                        {primary}
                      </span>
                    </span>
                    <ArrowIcon />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
