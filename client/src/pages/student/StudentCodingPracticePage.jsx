import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { listCodingTasks } from '../../services/coding-practice.service.js';

// ONE card per teacher-entered title — the title IS the technology/category
// (HTML, CSS, JavaScript, React, ...). The per-task `topic` field is a detail
// description and never becomes a card. Cards follow the backend task order
// (first appearance); titles from several courses/levels merge into one card
// and each task is counted exactly once.
const mergeTechnologyCards = (tasks) => {
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
        ? Math.round((entry.solvedCount / entry.taskCount) * 1000) / 10
        : 0,
  }));
};

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

  const cards = mergeTechnologyCards(tasks);

  const openTechnology = (title) => {
    const params = new URLSearchParams({ title });
    navigate(`/coding-practice/topic?${params.toString()}`);
  };

  return (
    <div className="admin-dashboard student-practice-page fade-in">
      <header className="admin-dashboard-header">
        <div>
          <h1>Coding Practice</h1>
          <p className="admin-welcome">
            Practice coding, build your skills, and track your progress.
          </p>
        </div>
      </header>

      {error ? (
        <ErrorState title="Failed to load coding practice" message={error} onRetry={load} />
      ) : loading ? (
        <Loading label="Loading coding practice..." />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No Coding Practice Tasks Yet"
          message="Coding challenges will appear here once they are published."
        />
      ) : (
        <div className="student-classes-grid">
          {cards.map((card) => (
            <Card key={card.title} variant="student-class-card card-interactive">
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <h3>{card.title}</h3>
                <p className="text-meta" style={{ margin: 0 }}>
                  Practice {card.title} coding tasks
                </p>
                <p className="text-meta" style={{ margin: 0 }}>
                  {card.taskCount} {card.taskCount === 1 ? 'Task' : 'Tasks'}
                </p>
                <p className="text-meta" style={{ margin: 0 }}>
                  {card.solvedCount} Solved &middot; {card.attemptedCount} Attempted
                </p>
                <ProgressBar label="Progress" value={card.progress} />
              </div>

              <div className="student-class-actions">
                <Button size="sm" onClick={() => openTechnology(card.title)}>
                  Open Practice →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
