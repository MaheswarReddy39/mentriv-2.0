import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import { listCodingTaskGroups } from '../../services/coding-practice.service.js';
import { CODING_LEVEL_BADGE_CLASS, LEVELS } from './codingPractice.js';

export default function TeacherCodingPracticePage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listCodingTaskGroups();
      setGroups(response?.data?.groups || []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load coding tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const levelsWithGroups = useMemo(
    () =>
      LEVELS.map((level) => ({
        level,
        groups: groups.filter((group) => group.level === level),
      })).filter((section) => section.groups.length > 0),
    [groups]
  );

  const openTopic = (group) => {
    const params = new URLSearchParams({
      courseId: group.courseId,
      level: group.level,
      topic: group.topic,
    });
    navigate(`/teacher/coding-practice/topic?${params.toString()}`);
  };

  return (
    <section
      className="teacher-classes-page fade-in"
      aria-labelledby="teacher-coding-practice-heading"
    >
      <div className="page-head">
        <div>
          <p className="text-caption">Teacher</p>
          <h1 id="teacher-coding-practice-heading">Coding Practice</h1>
          <p className="admin-welcome">
            Create and manage coding challenges for your students
          </p>
        </div>
        <Button type="button" onClick={() => navigate('/teacher/coding-practice/new')}>
          + Create Task
        </Button>
      </div>

      {loadError ? (
        <ErrorState
          title="Failed to load coding tasks"
          message={loadError}
          onRetry={load}
        />
      ) : loading ? (
        <Loading label="Loading coding tasks..." />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No coding tasks yet"
          message="Create your first coding task. Tasks are grouped by course, level and topic automatically."
          action={
            <Button
              type="button"
              onClick={() => navigate('/teacher/coding-practice/new')}
            >
              + Create Task
            </Button>
          }
        />
      ) : (
        levelsWithGroups.map((section) => (
          <section
            key={section.level}
            aria-labelledby={`coding-level-${section.level}`}
          >
            <h2 id={`coding-level-${section.level}`} className="student-classes-heading">
              {section.level}
            </h2>

            <div className="student-classes-grid">
              {section.groups.map((group) => (
                <Card key={group.id} variant="student-class-card">
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <h3>{group.topic}</h3>
                    <p className="text-meta" style={{ margin: 0 }}>
                      {group.courseTitle}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        className={`badge ${CODING_LEVEL_BADGE_CLASS[group.level] || 'badge-neutral'}`}
                      >
                        {group.level}
                      </span>
                      <span className="badge badge-neutral">
                        {group.taskCount} {group.taskCount === 1 ? 'task' : 'tasks'}
                      </span>
                      <span
                        className={`badge ${group.publishedCount > 0 ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {group.publishedCount} published
                      </span>
                    </div>
                  </div>

                  <div className="student-class-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openTopic(group)}
                    >
                      Manage
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
