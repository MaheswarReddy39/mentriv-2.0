import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import SelectMenu from '../../components/common/SelectMenu.jsx';
import { getTeacherSubmissions } from '../../services/teacher.service.js';

const LEVELS = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const TIMING_TONES = {
  submitted: 'is-done',
  reviewed: 'is-done',
  evaluated: 'is-done',
  pending: 'is-pending',
  late: 'is-pending',
};

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-IN');

const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`;

const levelLabel = (value) =>
  LEVELS.find((level) => level.value === String(value || '').toLowerCase())?.label || '';

const formatStamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const timingStatus = (row) => {
  if (row.isLate) return { label: 'Late', tone: 'is-pending' };
  const key = String(row.status || 'pending').toLowerCase();
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return { label, tone: TIMING_TONES[key] || 'is-idle' };
};

function SubmissionsSkeleton() {
  return (
    <div className="teacher-submissions-skeleton" role="status">
      <span className="sr-only">Loading submissions…</span>
      {[0, 1].map((panel) => (
        <div className="teacher-submissions-skeleton-panel" aria-hidden="true" key={panel}>
          <div className="teacher-submissions-skeleton-head">
            <span className="skeleton teacher-submissions-skeleton-title" />
            <span className="skeleton teacher-submissions-skeleton-count" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div className="teacher-submissions-skeleton-row" key={row}>
              <div className="teacher-submissions-skeleton-row-main">
                <span className="skeleton teacher-submissions-skeleton-line" />
                <span className="skeleton teacher-submissions-skeleton-meta" />
              </div>
              <span className="skeleton teacher-submissions-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TeacherSubmissionsPage() {
  const [courseId, setCourseId] = useState('all');
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTeacherSubmissions({ courseId, level });
      setData(response.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [courseId, level]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const courses = useMemo(() => data?.courses || [], [data]);
  const allRows = useMemo(() => data?.submissions || [], [data]);
  const allTiming = useMemo(() => data?.timing || [], [data]);

  const query = search.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!query) return allRows;
    return allRows.filter((row) =>
      [row.studentName, row.courseTitle, levelLabel(row.level)]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [allRows, query]);

  const timing = useMemo(() => {
    if (!query) return allTiming;
    return allTiming.filter((row) =>
      [row.studentName, row.assignmentTitle, row.courseTitle]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [allTiming, query]);

  const submittedCount = allRows.filter((row) => row.status === 'submitted').length;
  const notSubmittedCount = allRows.length - submittedCount;
  const submittedPct = allRows.length > 0 ? (submittedCount / allRows.length) * 100 : 0;

  const showSkeleton = loading && !data;

  return (
    <div className="teacher-submissions fade-in">
      <header className="teacher-submissions-masthead">
        <div className="teacher-submissions-head">
          <h1 className="teacher-submissions-title">Submissions</h1>

          {showSkeleton ? (
            <span className="skeleton teacher-submissions-switch-skeleton" aria-hidden="true" />
          ) : error || courses.length === 0 ? null : (
            <div className="teacher-submissions-scope">
              {courses.length > 1 ? (
                <SelectMenu
                  className="teacher-submissions-switch"
                  ariaLabel="Course"
                  value={courseId}
                  onChange={setCourseId}
                  options={[
                    { value: 'all', label: 'All courses' },
                    ...courses.map((course) => ({ value: course.id, label: course.title })),
                  ]}
                />
              ) : (
                <p className="teacher-submissions-course-title">{courses[0].title}</p>
              )}

              <SelectMenu
                className="teacher-submissions-switch"
                ariaLabel="Level"
                value={level}
                onChange={setLevel}
                options={LEVELS.map((item) => ({ value: item.value, label: item.label }))}
              />

              <label className="teacher-submissions-search">
                <span className="sr-only">Search students, courses or assignments</span>
                <input
                  className="input teacher-submissions-search-input"
                  type="search"
                  placeholder="Search students"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="teacher-submissions-stat">
          <span className="teacher-submissions-stat-label">Submitted</span>
          {showSkeleton ? (
            <span className="skeleton teacher-submissions-stat-skeleton" aria-hidden="true" />
          ) : error ? (
            <span className="teacher-submissions-stat-value">—</span>
          ) : courses.length === 0 ? (
            <>
              <span className="teacher-submissions-stat-value">—</span>
              <span className="teacher-submissions-stat-caption">No courses yet</span>
            </>
          ) : (
            <>
              <span className="teacher-submissions-stat-value">
                {formatNumber(submittedCount)}
                <span className="teacher-submissions-stat-total">
                  {' '}
                  of {formatNumber(allRows.length)}
                </span>
              </span>
              {allRows.length > 0 ? (
                <>
                  <span className="teacher-submissions-bar" aria-hidden="true">
                    <span style={{ width: `${submittedPct}%` }} />
                  </span>
                  <span className="teacher-submissions-stat-caption">
                    {notSubmittedCount > 0
                      ? `${formatNumber(notSubmittedCount)} not submitted`
                      : 'All students submitted'}
                  </span>
                </>
              ) : (
                <span className="teacher-submissions-stat-caption">No students yet</span>
              )}
            </>
          )}
        </div>
      </header>

      {error ? (
        <div className="teacher-submissions-state">
          <ErrorState message={error} onRetry={loadOverview} />
        </div>
      ) : showSkeleton ? (
        <SubmissionsSkeleton />
      ) : courses.length === 0 ? (
        <div className="teacher-submissions-state">
          <EmptyState
            title="No courses yet"
            message="Submissions appear once a course has enrolled students."
          />
        </div>
      ) : rows.length === 0 && timing.length === 0 ? (
        <div className="teacher-submissions-state">
          <EmptyState
            title={
              query
                ? 'No matches'
                : courseId !== 'all' || level !== 'all'
                  ? 'Nothing in this scope'
                  : 'No submissions yet'
            }
            message={
              query || courseId !== 'all' || level !== 'all'
                ? 'Try a different search or filter.'
                : 'Student work appears here as it is handed in.'
            }
          />
        </div>
      ) : (
        <>
          <section
            className="teacher-submissions-panel"
            aria-labelledby="teacher-progress-heading"
          >
            <header className="teacher-submissions-panel-head">
              <h2 id="teacher-progress-heading">Practice progress</h2>
              <span className="teacher-submissions-panel-count">
                {formatNumber(rows.length)} {rows.length === 1 ? 'student' : 'students'}
              </span>
            </header>

            {rows.length === 0 ? (
              <p className="teacher-submissions-note">No enrolled students in this scope.</p>
            ) : (
              <ol className="teacher-submissions-list">
                {rows.map((row) => {
                  const meta = [
                    row.courseTitle,
                    levelLabel(row.level),
                    Number(row.totalQuestions) > 0
                      ? `${formatNumber(row.correctAnswers)} of ${formatNumber(
                          row.totalQuestions
                        )} correct`
                      : 'No practice sets',
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <li className="teacher-submissions-row" key={row.id}>
                      <span className="teacher-submissions-row-main">
                        <span className="teacher-submissions-row-title">{row.studentName}</span>
                        <span className="teacher-submissions-row-meta">{meta}</span>
                      </span>
                      <span className="teacher-submissions-row-side">
                        <span className="teacher-submissions-row-value">
                          {formatPercent(row.progress)}
                        </span>
                        <span
                          className={`teacher-submissions-status ${
                            row.status === 'submitted' ? 'is-done' : 'is-pending'
                          }`}
                        >
                          {row.status === 'submitted' ? 'Submitted' : 'Not submitted'}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section
            className="teacher-submissions-panel"
            aria-labelledby="teacher-timing-heading"
          >
            <header className="teacher-submissions-panel-head">
              <h2 id="teacher-timing-heading">Submission timing</h2>
              <span className="teacher-submissions-panel-count">
                {formatNumber(timing.length)} {timing.length === 1 ? 'submission' : 'submissions'}
              </span>
            </header>

            {timing.length === 0 ? (
              <p className="teacher-submissions-note">No submissions in this scope.</p>
            ) : (
              <ol className="teacher-submissions-list">
                {timing.map((row) => {
                  const status = timingStatus(row);
                  const meta = [
                    row.studentName,
                    row.courseTitle,
                    row.attemptNumber > 1 ? `Attempt ${row.attemptNumber}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const span = [
                    row.startedAt ? `Started ${formatStamp(row.startedAt)}` : null,
                    row.submittedAt ? `Submitted ${formatStamp(row.submittedAt)}` : null,
                    row.duration > 0 ? `${row.duration} min limit` : 'No limit',
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <li className="teacher-submissions-row" key={row.id}>
                      <span className="teacher-submissions-row-main">
                        <span className="teacher-submissions-row-title">
                          {row.assignmentTitle}
                        </span>
                        <span className="teacher-submissions-row-meta">{meta}</span>
                        <span className="teacher-submissions-row-sub">{span}</span>
                      </span>
                      <span className="teacher-submissions-row-side">
                        <span className="teacher-submissions-row-value">
                          {row.timeTakenMinutes !== null && row.timeTakenMinutes !== undefined
                            ? `${formatNumber(row.timeTakenMinutes)} min`
                            : '—'}
                        </span>
                        <span className={`teacher-submissions-status ${status.tone}`}>
                          {status.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
