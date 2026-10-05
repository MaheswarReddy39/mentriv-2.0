import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { listCodingTaskGroups } from '../../services/coding-practice.service.js';

// The backend returns one group per (level, topic) so a technology can appear
// several times (once per level/course combination). These merge them into
// exactly ONE card per topic — counts are summed, never double counted,
// because every task belongs to a single level+topic group.
const mergeTopics = (groups) => {
  const byTopic = new Map();

  groups.forEach((group) => {
    const topic = String(group?.topic || '').trim();
    const taskCount = Number(group?.taskCount) || 0;
    if (!topic || taskCount <= 0) return;

    const entry = byTopic.get(topic) || {
      topic,
      taskCount: 0,
      solvedCount: 0,
      attemptedCount: 0,
    };
    entry.taskCount += taskCount;
    entry.solvedCount += Number(group?.solvedCount) || 0;
    entry.attemptedCount += Number(group?.attemptedCount) || 0;
    byTopic.set(topic, entry);
  });

  return [...byTopic.values()]
    .map((entry) => ({
      ...entry,
      progress:
        entry.taskCount > 0
          ? Math.round((entry.solvedCount / entry.taskCount) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
};

export default function StudentCodingPracticePage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listCodingTaskGroups();
      setGroups(response?.data?.groups || []);
    } catch (err) {
      setError(err.message || 'Failed to load coding practice.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const topics = mergeTopics(groups);

  const openTopic = (topic) => {
    const params = new URLSearchParams({ topic });
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
      ) : topics.length === 0 ? (
        <EmptyState
          title="No Coding Practice Tasks Yet"
          message="Coding challenges will appear here once they are published."
        />
      ) : (
        <div className="student-classes-grid">
          {topics.map((topic) => (
            <Card key={topic.topic} variant="student-class-card card-interactive">
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <h3>{topic.topic}</h3>
                <p className="text-meta" style={{ margin: 0 }}>
                  Practice {topic.topic} coding tasks
                </p>
                <p className="text-meta" style={{ margin: 0 }}>
                  {topic.taskCount} {topic.taskCount === 1 ? 'Task' : 'Tasks'}
                </p>
                <p className="text-meta" style={{ margin: 0 }}>
                  {topic.solvedCount} Solved &middot; {topic.attemptedCount} Attempted
                </p>
                <ProgressBar label="Progress" value={topic.progress} />
              </div>

              <div className="student-class-actions">
                <Button size="sm" onClick={() => openTopic(topic.topic)}>
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
