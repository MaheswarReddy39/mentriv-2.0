import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { listCodingTaskGroups } from '../../services/coding-practice.service.js';
import { CODING_LEVEL_BADGE_CLASS } from './codingPracticeUi.js';

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

  const openTopic = (group) => {
    const params = new URLSearchParams({
      courseId: group.courseId,
      level: group.level,
      topic: group.topic,
    });
    navigate(`/coding-practice/topic?${params.toString()}`);
  };

  // Levels are derived from whatever the backend returned (backend-sorted),
  // so nothing here is hardcoded and empty levels never render.
  const levels = groups.reduce((list, group) => {
    if (group.level && !list.includes(group.level)) list.push(group.level);
    return list;
  }, []);

  const groupCourseTitles = (group) => {
    const titles = Array.isArray(group.courseTitles) ? group.courseTitles.filter(Boolean) : [];
    if (titles.length > 0) return titles.join(' · ');
    return group.courseTitle || '';
  };

  const header = (
    <header className="admin-dashboard-header">
      <div>
        <h1>Coding Practice</h1>
        <p className="admin-welcome">
          Pick a topic, solve tasks and track your progress.
        </p>
      </div>
    </header>
  );

  return (
    <div className="admin-dashboard student-practice-page fade-in">
      {header}

      {error ? (
        <ErrorState title="Failed to load coding practice" message={error} onRetry={load} />
      ) : loading ? (
        <Loading label="Loading coding practice..." />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No coding practice yet"
          message="Coding tasks published for your enrolled courses will appear here."
        />
      ) : (
        levels.map((level) => {
          const levelGroups = groups.filter((group) => group.level === level);
          if (levelGroups.length === 0) return null;
          const levelAnchor = level.replace(/\s+/g, '-');

          return (
            <section key={level} aria-labelledby={`coding-level-${levelAnchor}`}>
              <h2 id={`coding-level-${levelAnchor}`} className="student-classes-heading">
                {level}
              </h2>

              <div className="student-classes-grid">
                {levelGroups.map((group) => {
                  const taskCount = Number(group.taskCount) || 0;
                  const solvedCount = Number(group.solvedCount) || 0;
                  const attemptedCount = Number(group.attemptedCount) || 0;
                  const progress = Number(group.progress) || 0;
                  const courseTitles = groupCourseTitles(group);

                  return (
                    <Card key={group.id} variant="student-class-card">
                      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                        <div className="student-assignment-meta">
                          <span className={`badge ${CODING_LEVEL_BADGE_CLASS[group.level] || 'badge-neutral'}`}>
                            {group.level}
                          </span>
                        </div>
                        <h3>{group.topic}</h3>
                        {courseTitles ? (
                          <p className="text-meta" style={{ margin: 0 }}>
                            {courseTitles}
                          </p>
                        ) : null}
                        <p className="text-meta" style={{ margin: 0 }}>
                          {taskCount} {taskCount === 1 ? 'task' : 'tasks'} &middot; {solvedCount}{' '}
                          solved &middot; {attemptedCount} attempted
                        </p>
                        <ProgressBar value={progress} />
                      </div>

                      <div className="student-class-actions">
                        <Button size="sm" onClick={() => openTopic(group)}>
                          Open Practice
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
