import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import SelectMenu from '../../components/common/SelectMenu.jsx';
import { getTeacherLeaderboard } from '../../services/teacher.service.js';

const RULES = [
  {
    title: 'Progress',
    desc: 'Correct answers as a share of every published practice question in scope.',
  },
  {
    title: 'Ties',
    desc: 'Equal scores are ordered alphabetically by student name.',
  },
  {
    title: 'No attempts',
    desc: 'Students without a submitted attempt sit at the bottom on 0%.',
  },
];

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-IN');

const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`;

const medalClass = (rank) => {
  if (rank === 1) return 'is-gold';
  if (rank === 2) return 'is-silver';
  if (rank === 3) return 'is-bronze';
  return '';
};

function LeaderboardSkeleton() {
  return (
    <div className="teacher-leaderboard-skeleton" role="status">
      <span className="sr-only">Loading leaderboard…</span>
      <div className="teacher-leaderboard-skeleton-panel" aria-hidden="true">
        <div className="teacher-leaderboard-skeleton-head">
          <span className="skeleton teacher-leaderboard-skeleton-title" />
          <span className="skeleton teacher-leaderboard-skeleton-count" />
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="teacher-leaderboard-skeleton-row" key={row}>
            <span className="skeleton teacher-leaderboard-skeleton-rank" />
            <div className="teacher-leaderboard-skeleton-copy">
              <span className="skeleton teacher-leaderboard-skeleton-line" />
              <span className="skeleton teacher-leaderboard-skeleton-meta" />
            </div>
            <span className="skeleton teacher-leaderboard-skeleton-score" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherLeaderboardPage() {
  const [courseId, setCourseId] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = courseId && courseId !== 'all' ? { courseId } : {};
      const response = await getTeacherLeaderboard(params);
      setData(response.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const courses = data?.courses || [];
  const allRows = useMemo(() => data?.leaderboard || [], [data]);

  const query = search.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!query) return allRows;
    return allRows.filter((row) =>
      `${row.studentName} ${row.mobileNumber || ''}`.toLowerCase().includes(query)
    );
  }, [allRows, query]);

  const rankById = useMemo(
    () => new Map(allRows.map((row, index) => [row.studentId, index + 1])),
    [allRows]
  );

  const totalStudents = allRows.length;
  const attemptedStudents = allRows.filter((row) => row.attemptedCourseCount > 0).length;
  const averageProgress =
    totalStudents > 0
      ? allRows.reduce((sum, row) => sum + (Number(row.progress) || 0), 0) / totalStudents
      : 0;
  const topScore =
    totalStudents > 0 ? Math.max(...allRows.map((row) => Number(row.progress) || 0)) : 0;

  const showSkeleton = loading && !data;

  const rowMeta = (row) => {
    const total = Number(row.totalQuestions) || 0;
    const correct = Number(row.correctAnswers) || 0;
    const parts = [];

    if (courseId === 'all' && row.courseCount > 1) {
      parts.push(`${row.courseCount} courses`);
    }

    if (total === 0) {
      parts.push('No published questions');
    } else if (!row.attemptedCourseCount) {
      parts.push(`No attempts · ${formatNumber(total)} questions`);
    } else {
      parts.push(`${formatNumber(correct)} of ${formatNumber(total)} correct`);
    }

    return parts.join(' · ');
  };

  return (
    <div className="teacher-leaderboard fade-in">
      <header className="teacher-leaderboard-masthead">
        <div className="teacher-leaderboard-head">
          <h1 className="teacher-leaderboard-title" id="teacher-leaderboard-heading">
            Leaderboard
          </h1>

          {showSkeleton ? (
            <span className="skeleton teacher-leaderboard-switch-skeleton" aria-hidden="true" />
          ) : error || courses.length === 0 ? null : (
            <div className="teacher-leaderboard-scope">
              {courses.length > 1 ? (
                <SelectMenu
                  className="teacher-leaderboard-switch"
                  ariaLabel="Course"
                  value={courseId}
                  onChange={setCourseId}
                  options={[
                    { value: 'all', label: 'All courses' },
                    ...courses.map((course) => ({ value: course.id, label: course.title })),
                  ]}
                />
              ) : (
                <p className="teacher-leaderboard-course-title">{courses[0].title}</p>
              )}

              <label className="teacher-leaderboard-search">
                <span className="sr-only">Search students</span>
                <input
                  className="input teacher-leaderboard-search-input"
                  type="search"
                  placeholder="Search students"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="teacher-leaderboard-stat">
          <span className="teacher-leaderboard-stat-label">Average progress</span>
          {showSkeleton ? (
            <span className="skeleton teacher-leaderboard-stat-skeleton" aria-hidden="true" />
          ) : error ? (
            <span className="teacher-leaderboard-stat-value">—</span>
          ) : courses.length === 0 ? (
            <>
              <span className="teacher-leaderboard-stat-value">—</span>
              <span className="teacher-leaderboard-stat-caption">No courses yet</span>
            </>
          ) : totalStudents === 0 ? (
            <>
              <span className="teacher-leaderboard-stat-value">—</span>
              <span className="teacher-leaderboard-stat-caption">No students yet</span>
            </>
          ) : (
            <>
              <span className="teacher-leaderboard-stat-value">{formatPercent(averageProgress)}</span>
              <span className="teacher-leaderboard-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.max(0, averageProgress))}%` }} />
              </span>
              <span className="teacher-leaderboard-stat-caption">
                Best {formatPercent(topScore)} · {formatNumber(totalStudents)}{' '}
                {totalStudents === 1 ? 'student' : 'students'}
                {attemptedStudents === 0 ? ' · no attempts yet' : ''}
              </span>
            </>
          )}
        </div>
      </header>

      {error ? (
        <div className="teacher-leaderboard-state">
          <ErrorState message={error} onRetry={loadLeaderboard} />
        </div>
      ) : showSkeleton ? (
        <LeaderboardSkeleton />
      ) : courses.length === 0 ? (
        <div className="teacher-leaderboard-state">
          <EmptyState
            title="No courses yet"
            message="The leaderboard fills once a course has enrolled students."
          />
        </div>
      ) : totalStudents === 0 ? (
        <div className="teacher-leaderboard-state">
          <EmptyState
            title="No students ranked yet"
            message={
              courseId === 'all'
                ? 'Students appear here once they are enrolled in one of your courses.'
                : 'Students appear here once they are enrolled in this course.'
            }
          />
        </div>
      ) : (
        <>
          <section className="teacher-leaderboard-panel" aria-labelledby="teacher-rankings-heading">
            <header className="teacher-leaderboard-panel-head">
              <h2 id="teacher-rankings-heading">Rankings</h2>
              <span className="teacher-leaderboard-panel-count">
                {query
                  ? `${formatNumber(rows.length)} of ${formatNumber(totalStudents)}`
                  : `${formatNumber(totalStudents)} ${
                      totalStudents === 1 ? 'student' : 'students'
                    }`}
              </span>
            </header>

            {rows.length === 0 ? (
              <p className="teacher-leaderboard-empty">No matches.</p>
            ) : (
              <ol className="teacher-leaderboard-list" aria-label="Rankings">
                {rows.map((row) => {
                  const rank = rankById.get(row.studentId) || 0;
                  const medal = medalClass(rank);
                  return (
                    <li key={row.studentId}>
                      <div
                        className={`teacher-leaderboard-row${medal ? ` ${medal}` : ''}`}
                      >
                        <span
                          className={`teacher-leaderboard-rank${rank <= 3 ? ' is-top' : ''}`}
                        >
                          {rank}
                        </span>
                        <span className="teacher-leaderboard-row-main">
                          <span className="teacher-leaderboard-row-title">
                            {row.studentName}
                          </span>
                          <span className="teacher-leaderboard-row-meta">{rowMeta(row)}</span>
                        </span>
                        <span
                          className={`teacher-leaderboard-score${
                            row.attemptedCourseCount > 0 ? '' : ' is-idle'
                          }`}
                        >
                          {formatPercent(row.progress)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="teacher-leaderboard-panel" aria-labelledby="teacher-rules-heading">
            <header className="teacher-leaderboard-panel-head">
              <h2 id="teacher-rules-heading">How ranking works</h2>
              <span className="teacher-leaderboard-panel-count">{RULES.length} rules</span>
            </header>

            <ol className="teacher-leaderboard-list">
              {RULES.map((rule) => (
                <li key={rule.title}>
                  <div className="teacher-leaderboard-rule">
                    <span className="teacher-leaderboard-rule-title">{rule.title}</span>
                    <span className="teacher-leaderboard-rule-meta">{rule.desc}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
