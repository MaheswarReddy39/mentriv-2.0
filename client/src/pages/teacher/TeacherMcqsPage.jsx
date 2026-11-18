import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getTeacherMcqs } from '../../services/teacher.service.js';
import { decodeDescription, levelRank } from '../../utils/practiceLevels.js';

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-IN');

const relativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const statusLabel = (status) => {
  if (status === 'published') return 'Published';
  if (status === 'draft') return 'Draft';
  if (status === 'archived') return 'Archived';
  return 'Draft';
};

const questionCountLabel = (count) =>
  count === 1 ? '1 question' : `${formatNumber(count || 0)} questions`;

const setMeta = (set, scope) => {
  const parts = [];

  if (scope === 'all') {
    const titles = set.courseTitles || [];
    if (titles.length > 1) parts.push(`${titles.length} courses`);
    else if (titles[0]) parts.push(titles[0]);
  }

  if (set.level) parts.push(set.level);
  if (set.topic) parts.push(set.topic);
  parts.push(questionCountLabel(set.questionCount));
  parts.push(Number(set.duration) > 0 ? `${formatNumber(set.duration)} min` : 'No time limit');

  return parts.join(' · ');
};

function CaretIcon() {
  return (
    <svg
      className="teacher-mcqs-caret"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="teacher-mcqs-arrow"
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

function McqsSkeleton() {
  return (
    <div className="teacher-mcqs-skeleton" role="status">
      <span className="sr-only">Loading practice sets…</span>
      <div className="teacher-mcqs-skeleton-panel" aria-hidden="true">
        <div className="teacher-mcqs-skeleton-head">
          <span className="skeleton teacher-mcqs-skeleton-title" />
          <span className="skeleton teacher-mcqs-skeleton-count" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div className="teacher-mcqs-skeleton-row" key={row}>
            <div className="teacher-mcqs-skeleton-row-main">
              <span className="skeleton teacher-mcqs-skeleton-line" />
              <span className="skeleton teacher-mcqs-skeleton-meta" />
            </div>
            <span className="skeleton teacher-mcqs-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherMcqsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState('all');

  const load = useCallback(async (scopedId) => {
    setLoading(true);
    setError(null);
    try {
      const params = scopedId && scopedId !== 'all' ? { courseId: scopedId } : {};
      const response = await getTeacherMcqs(params);
      setData(response.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load practice sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(scope);
  }, [load, scope]);

  const courses = data?.courses || [];
  const sets = useMemo(
    () =>
      (data?.mcqTests || [])
        .map((test) => {
          const { level, topic } = decodeDescription(test.description);
          return { ...test, level, topic };
        })
        .sort(
          (a, b) => levelRank(a.level) - levelRank(b.level) || a.title.localeCompare(b.title)
        ),
    [data]
  );

  const scopeCourse = courses.find((course) => course.id === scope) || null;
  const scopeTitle = scope === 'all' ? 'All courses' : scopeCourse?.title || '';

  const totalSets = data?.totalMcqTests ?? sets.length;
  const publishedSets = data?.publishedMcqTests ?? 0;
  const draftSets = Math.max(0, totalSets - publishedSets);
  const publishedPct = totalSets > 0 ? (publishedSets / totalSets) * 100 : 0;

  const showSkeleton = loading && !data;

  return (
    <div className="teacher-mcqs fade-in">
      <header className="teacher-mcqs-masthead">
        <div className="teacher-mcqs-head">
          <h1 className="teacher-mcqs-title" id="teacher-mcqs-heading">
            MCQs / Practice
          </h1>
          {showSkeleton ? (
            <span className="skeleton teacher-mcqs-switch-skeleton" aria-hidden="true" />
          ) : courses.length > 0 ? (
            <label className="teacher-mcqs-switch">
              <span className="teacher-mcqs-switch-label" aria-hidden="true">
                <span>{scopeTitle}</span>
                <CaretIcon />
              </span>
              <select
                className="teacher-mcqs-switch-select"
                aria-label="Course"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="all">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="teacher-mcqs-stat">
          <span className="teacher-mcqs-stat-label">Published</span>
          {showSkeleton ? (
            <span className="skeleton teacher-mcqs-stat-skeleton" aria-hidden="true" />
          ) : error ? (
            <span className="teacher-mcqs-stat-value">—</span>
          ) : courses.length === 0 ? (
            <>
              <span className="teacher-mcqs-stat-value">—</span>
              <span className="teacher-mcqs-stat-caption">No courses yet</span>
            </>
          ) : (
            <>
              <span className="teacher-mcqs-stat-value">
                {formatNumber(publishedSets)}
                <span className="teacher-mcqs-stat-total"> of {formatNumber(totalSets)}</span>
              </span>
              {totalSets > 0 ? (
                <>
                  <span className="teacher-mcqs-bar" aria-hidden="true">
                    <span style={{ width: `${publishedPct}%` }} />
                  </span>
                  <span className="teacher-mcqs-stat-caption">
                    {draftSets > 0
                      ? `${formatNumber(draftSets)} ${draftSets === 1 ? 'draft' : 'drafts'}`
                      : 'All published'}
                  </span>
                </>
              ) : (
                <span className="teacher-mcqs-stat-caption">Nothing created yet</span>
              )}
            </>
          )}
        </div>
      </header>

      {error ? (
        <div className="teacher-mcqs-state">
          <ErrorState message={error} onRetry={() => load(scope)} />
        </div>
      ) : showSkeleton ? (
        <McqsSkeleton />
      ) : courses.length === 0 ? (
        <div className="teacher-mcqs-state">
          <EmptyState
            title="No courses yet"
            message="Practice sets can be created once a course exists."
          />
        </div>
      ) : (
        <section className="teacher-mcqs-panel" aria-labelledby="teacher-mcqs-list-heading">
          <header className="teacher-mcqs-panel-head">
            <h2 id="teacher-mcqs-list-heading">Practice sets</h2>
            <div className="teacher-mcqs-panel-side">
              <button
                type="button"
                className="teacher-mcqs-action"
                onClick={() => navigate('/teacher/mcqs/new')}
              >
                New practice set
              </button>
              <span className="teacher-mcqs-panel-count">
                {formatNumber(totalSets)} {totalSets === 1 ? 'set' : 'sets'}
              </span>
            </div>
          </header>

          {sets.length === 0 ? (
            <p className="teacher-mcqs-empty">
              {scope === 'all'
                ? 'No practice sets yet.'
                : 'No practice sets in this course yet.'}
            </p>
          ) : (
            <ol className="teacher-mcqs-list">
              {sets.map((set) => (
                <li key={set.id}>
                  <button
                    type="button"
                    className="teacher-mcqs-row"
                    onClick={() => navigate(`/teacher/mcqs/${set.id}`)}
                  >
                    <span className="teacher-mcqs-row-main">
                      <span className="teacher-mcqs-row-title">{set.title}</span>
                      <span className="teacher-mcqs-row-meta">{setMeta(set, scope)}</span>
                    </span>
                    <span className="teacher-mcqs-row-side">
                      <span className={`teacher-mcqs-status is-${set.status || 'draft'}`}>
                        {statusLabel(set.status)}
                      </span>
                      <time dateTime={set.createdAt || undefined}>
                        {relativeTime(set.createdAt)}
                      </time>
                    </span>
                    <ArrowIcon />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
