import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import { listCodingTasks } from '../../services/coding-practice.service.js';
import { LEVELS } from './codingPractice.js';

const statusLabel = (status) => {
  if (status === 'published') return 'Published';
  if (status === 'draft') return 'Draft';
  if (status === 'archived') return 'Archived';
  return 'Draft';
};

const plural = (count, singular) => `${count} ${count === 1 ? singular : `${singular}s`}`;

const rowMeta = (task) =>
  [task.taskType, task.difficulty, task.language].filter(Boolean).join(' · ');

function ArrowIcon() {
  return (
    <svg
      className="teacher-coding-arrow"
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

function TopicSkeleton() {
  return (
    <div className="teacher-coding-skeleton" role="status">
      <span className="sr-only">Loading topic tasks.</span>
      <div className="teacher-coding-skeleton-panel" aria-hidden="true">
        <div className="teacher-coding-skeleton-head">
          <span className="skeleton teacher-coding-skeleton-title" />
          <span className="skeleton teacher-coding-skeleton-count" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div className="teacher-coding-skeleton-row" key={row}>
            <div className="teacher-coding-skeleton-copy">
              <span className="skeleton teacher-coding-skeleton-line" />
              <span className="skeleton teacher-coding-skeleton-meta" />
            </div>
            <span className="skeleton teacher-coding-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherCodingTopicPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseId = searchParams.get('courseId') || '';
  const level = searchParams.get('level') || '';
  const topic = searchParams.get('topic') || '';
  const paramsValid = Boolean(courseId && topic) && LEVELS.includes(level);

  const [tasks, setTasks] = useState(null);
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(paramsValid);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!paramsValid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    const [tasksResult, coursesResult] = await Promise.allSettled([
      listCodingTasks({ courseId, level, topic }),
      getTeacherDashboard(),
    ]);

    if (tasksResult.status === 'fulfilled') {
      setTasks(tasksResult.value?.data?.tasks || []);
    } else {
      setTasks(null);
      setLoadError(tasksResult.reason?.message || 'Failed to load this topic.');
    }

    setCourses(
      coursesResult.status === 'fulfilled'
        ? coursesResult.value?.data?.courses || []
        : null
    );

    setLoading(false);
  }, [paramsValid, courseId, level, topic]);

  useEffect(() => {
    load();
  }, [load]);

  const headingId = 'teacher-coding-topic-heading';
  const courseTitle =
    courses?.find((course) => course.id === courseId)?.title || '';

  const addTaskUrl = paramsValid
    ? `/teacher/coding-practice/new?${new URLSearchParams({
        courseId,
        level,
        topic,
      }).toString()}`
    : '/teacher/coding-practice/new';

  const stats = useMemo(() => {
    const rows = tasks || [];
    const published = rows.filter((task) => task.status === 'published').length;
    const drafts = rows.filter((task) => task.status === 'draft').length;
    const archived = rows.filter((task) => task.status === 'archived').length;
    return { total: rows.length, published, drafts, archived };
  }, [tasks]);

  const publishedPct =
    stats.total > 0 ? (stats.published / stats.total) * 100 : 0;

  const statCaption = () => {
    if (tasks === null) return null;
    if (stats.total === 0) return 'No tasks yet';
    if (stats.drafts === 0 && stats.archived === 0) return 'All tasks published';
    return [
      stats.drafts > 0 ? `${stats.drafts} ${stats.drafts === 1 ? 'draft' : 'drafts'}` : null,
      stats.archived > 0 ? `${stats.archived} archived` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const masthead = (
    <header className="teacher-coding-masthead">
      <div className="teacher-coding-head">
        <button
          type="button"
          className="teacher-coding-topic-back"
          onClick={() => navigate('/teacher/coding-practice')}
        >
          ← Coding Practice
        </button>
        {paramsValid ? (
          <p className="teacher-coding-topic-eyebrow">
            {[level, courseTitle].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <h1 className="teacher-coding-title" id={headingId}>
          {paramsValid ? topic : 'Coding Practice'}
        </h1>
      </div>

      <div className="teacher-coding-stat">
        <span className="teacher-coding-stat-label">Published tasks</span>
        {loading && tasks === null ? (
          <span className="skeleton teacher-coding-stat-skeleton" aria-hidden="true" />
        ) : loadError || !paramsValid ? (
          <span className="teacher-coding-stat-value">—</span>
        ) : (
          <span className="teacher-coding-stat-value">
            {stats.published}
            <span className="teacher-coding-stat-total"> of {stats.total}</span>
          </span>
        )}

        {stats.total > 0 && !loadError ? (
          <span className="teacher-coding-bar" aria-hidden="true">
            <span style={{ width: `${publishedPct}%` }} />
          </span>
        ) : null}

        {statCaption() ? (
          <span className="teacher-coding-stat-caption">{statCaption()}</span>
        ) : null}

        {paramsValid ? (
          <div className="teacher-coding-actions">
            <Button type="button" size="sm" onClick={() => navigate(addTaskUrl)}>
              Add task
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );

  if (!paramsValid) {
    return (
      <div className="teacher-coding fade-in" aria-labelledby={headingId}>
        {masthead}
        <div className="teacher-coding-state">
          <EmptyState
            title="Topic not found"
            message="This topic may have been removed, or the link is incomplete."
            action={
              <Button type="button" onClick={() => navigate('/teacher/coding-practice')}>
                Back to coding practice
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-coding fade-in" aria-labelledby={headingId}>
      {masthead}

      {loadError ? (
        <div className="teacher-coding-state">
          <ErrorState
            title="Failed to load this topic"
            message={loadError}
            onRetry={load}
          />
        </div>
      ) : loading && tasks === null ? (
        <TopicSkeleton />
      ) : tasks.length === 0 ? (
        <div className="teacher-coding-state">
          <EmptyState
            title="No tasks in this topic"
            message="Add the first task to this topic to see it here."
            action={
              <Button type="button" onClick={() => navigate(addTaskUrl)}>
                Add task
              </Button>
            }
          />
        </div>
      ) : (
        <section className="teacher-coding-panel" aria-labelledby="teacher-coding-topic-list">
          <header className="teacher-coding-panel-head">
            <h2 id="teacher-coding-topic-list">Tasks</h2>
            <span className="teacher-coding-panel-count">{plural(stats.total, 'task')}</span>
          </header>

          <ol className="teacher-coding-list">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="teacher-coding-row"
                  onClick={() => navigate(`/teacher/coding-practice/${task.id}`)}
                >
                  <span className="teacher-coding-row-main">
                    <span className="teacher-coding-row-title">{task.title}</span>
                    <span className="teacher-coding-row-meta">{rowMeta(task)}</span>
                  </span>
                  <span className="teacher-coding-row-side">
                    <span className={`teacher-coding-status is-${task.status || 'draft'}`}>
                      {statusLabel(task.status)}
                    </span>
                  </span>
                  <ArrowIcon />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
