import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getLeaderboard } from '../../services/progress.service.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const TIME_OPTIONS = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

const POINT_RULES = [
  {
    title: 'Finish a class',
    desc: 'Each published class counts once.',
  },
  {
    title: 'Submit an assignment',
    desc: 'Counts once, however often you resubmit.',
  },
  {
    title: 'Complete a practice',
    desc: 'One attempt is enough to earn the points.',
  },
  {
    title: 'Score well',
    desc: 'Strong latest scores in assignments and practices add a bonus.',
  },
];

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const formatPoints = (points) => Number(points || 0).toLocaleString('en-IN');

const medalClass = (rank) => {
  if (rank === 1) return 'is-gold';
  if (rank === 2) return 'is-silver';
  if (rank === 3) return 'is-bronze';
  return '';
};

const formatRankChange = (change) => {
  if (change === null || change === undefined) return '—';
  if (change > 0) return `↑ ${change}`;
  if (change < 0) return `↓ ${Math.abs(change)}`;
  return 'No change';
};

const EMPTY_LEADERBOARD = {
  scope: null,
  participants: 0,
  topStudents: [],
  rows: [],
  me: null,
};

const clampPct = (value) => Math.min(100, Math.max(0, Number(value) || 0));

function CaretIcon() {
  return (
    <svg
      className="student-leaderboard-caret"
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

function LeaderboardSkeleton() {
  return (
    <div className="student-leaderboard-skeleton" role="status">
      <span className="sr-only">Loading leaderboard…</span>
      <div className="student-leaderboard-skeleton-panel" aria-hidden="true">
        <div className="student-leaderboard-skeleton-head">
          <span className="skeleton student-leaderboard-skeleton-title" />
          <span className="skeleton student-leaderboard-skeleton-count" />
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="student-leaderboard-skeleton-row" key={row}>
            <span className="skeleton student-leaderboard-skeleton-rank" />
            <div className="student-leaderboard-skeleton-copy">
              <span className="skeleton student-leaderboard-skeleton-line" />
              <span className="skeleton student-leaderboard-skeleton-meta" />
            </div>
            <span className="skeleton student-leaderboard-skeleton-points" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsReady, setEnrollmentsReady] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [timeFilter, setTimeFilter] = useState('week');

  // Load the student's active courses once (plus on explicit retry).
  useEffect(() => {
    let cancelled = false;

    setEnrollmentsReady(false);
    setLoadError(null);

    (async () => {
      try {
        const res = await getMyEnrollments({ limit: 50 });
        if (cancelled) return;
        const list = (res?.data?.enrollments || []).filter(
          (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
        );
        setEnrollments(list);
        setEnrollmentsReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load your courses');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Refetch the leaderboard whenever the course or period changes.
  // Existing data stays visible while the next payload loads.
  useEffect(() => {
    if (!enrollmentsReady) return undefined;
    let cancelled = false;

    setLoadError(null);

    (async () => {
      try {
        const params = { timeFilter };
        if (selectedCourseId) params.courseId = selectedCourseId;
        const res = await getLeaderboard(params);
        if (!cancelled) setLeaderboard(res?.data || EMPTY_LEADERBOARD);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load the leaderboard');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enrollmentsReady, selectedCourseId, timeFilter, reloadKey]);

  const retryLoad = useCallback(() => {
    setLeaderboard(null);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const selectCourse = (value) => {
    setSelectedCourseId(value);
  };

  const me = leaderboard?.me || null;
  const rows = leaderboard?.rows || [];
  const participants = leaderboard?.participants || 0;
  const timeLabel =
    TIME_OPTIONS.find((option) => option.id === timeFilter)?.label || 'This week';
  const selectedCourse = enrollments.find(
    (enrollment) => getCourseId(enrollment) === selectedCourseId
  );
  const courseLabel = selectedCourse?.course?.title || 'All courses';

  const percentile = me && me.percentile !== null && me.percentile !== undefined
    ? clampPct(me.percentile)
    : null;
  const topPercent = percentile !== null ? Math.max(1, 100 - percentile) : null;

  const statValue = me && me.rank !== null && me.rank !== undefined
    ? `#${me.rank}`
    : '—';

  const facts = [
    { label: 'Points', value: me ? formatPoints(me.totalPoints) : '—' },
    { label: 'Rank change', value: me ? formatRankChange(me.rankChange) : '—' },
    {
      label: 'Percentile',
      value: topPercent !== null ? `Top ${topPercent}%` : '—',
    },
    {
      label: 'Classes completed',
      value: me ? String(me.classesCompleted ?? 0) : '—',
    },
    {
      label: 'Assignments completed',
      value: me ? String(me.assignmentsCompleted ?? 0) : '—',
    },
    { label: 'MCQs attempted', value: me ? String(me.mcqsAttempted ?? 0) : '—' },
    {
      label: 'Average score',
      value:
        me && me.averageScore !== null && me.averageScore !== undefined
          ? `${me.averageScore}%`
          : '—',
    },
  ];

  const scope = (
    <div className="student-leaderboard-scope">
      {!enrollmentsReady && !loadError ? (
        <span className="skeleton student-leaderboard-switch-skeleton" aria-hidden="true" />
      ) : enrollments.length > 1 ? (
        <label className="student-leaderboard-switch">
          <span className="student-leaderboard-switch-label" aria-hidden="true">
            <span>{courseLabel}</span>
            <CaretIcon />
          </span>
          <select
            className="student-leaderboard-switch-select"
            aria-label="Course"
            value={selectedCourseId}
            onChange={(event) => selectCourse(event.target.value)}
          >
            <option value="">All courses</option>
            {enrollments.map((enrollment) => {
              const id = getCourseId(enrollment);
              return (
                <option key={id} value={id}>
                  {enrollment.course?.title || 'Untitled course'}
                </option>
              );
            })}
          </select>
        </label>
      ) : enrollments.length === 1 ? (
        <p className="student-leaderboard-course-title">{courseLabel}</p>
      ) : null}

      <label className="student-leaderboard-switch">
        <span className="student-leaderboard-switch-label" aria-hidden="true">
          <span>{timeLabel}</span>
          <CaretIcon />
        </span>
        <select
          className="student-leaderboard-switch-select"
          aria-label="Period"
          value={timeFilter}
          onChange={(event) => setTimeFilter(event.target.value)}
        >
          {TIME_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <div className="student-leaderboard fade-in">
      <header className="student-leaderboard-masthead">
        <div className="student-leaderboard-head">
          <h1 className="student-leaderboard-title">Leaderboard</h1>
          {scope}
        </div>

        <div className="student-leaderboard-stat">
          <span className="student-leaderboard-stat-label">Your rank</span>
          {leaderboard === null && !loadError ? (
            <span className="skeleton student-leaderboard-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-leaderboard-stat-value">
              {statValue}
              {me && me.rank !== null && participants > 0 ? (
                <span className="student-leaderboard-stat-total"> of {participants}</span>
              ) : null}
            </span>
          )}
          {percentile !== null ? (
            <>
              <span className="student-leaderboard-bar" aria-hidden="true">
                <span style={{ width: `${percentile}%` }} />
              </span>
              <span className="student-leaderboard-stat-caption">
                {topPercent === 1 ? 'Top student' : `Top ${topPercent}%`}
                {me ? ` · ${formatPoints(me.totalPoints)} points` : ''}
              </span>
            </>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className="student-leaderboard-state">
          <ErrorState
            title="Failed to load the leaderboard"
            message={loadError}
            onRetry={retryLoad}
          />
        </div>
      ) : leaderboard === null ? (
        <LeaderboardSkeleton />
      ) : participants === 0 ? (
        <div className="student-leaderboard-state">
          <EmptyState
            title="No one on this leaderboard yet"
            message={
              selectedCourseId
                ? 'Points appear here once students finish classes, assignments or practice sets in this course.'
                : 'Join a course to appear on the leaderboard.'
            }
          />
        </div>
      ) : (
        <>
          <section className="student-leaderboard-panel" aria-labelledby="leaderboard-standing">
            <header className="student-leaderboard-panel-head">
              <h2 id="leaderboard-standing">Your standing</h2>
              <span className="student-leaderboard-panel-count">
                {timeLabel}
                {selectedCourseId ? ' · Course' : ''}
              </span>
            </header>

            <dl className="student-leaderboard-facts">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="student-leaderboard-panel" aria-labelledby="leaderboard-rankings">
            <header className="student-leaderboard-panel-head">
              <h2 id="leaderboard-rankings">Rankings</h2>
              <span className="student-leaderboard-panel-count">
                {participants} {participants === 1 ? 'student' : 'students'}
              </span>
            </header>

            <ol className="student-leaderboard-list" aria-label="Rankings">
              {rows.map((row) => (
                <li key={row.studentId}>
                  <div
                    className={`student-leaderboard-row${row.isMe ? ' is-me' : ''}${
                      medalClass(row.rank) ? ` ${medalClass(row.rank)}` : ''
                    }`}
                  >
                    <span
                      className={`student-leaderboard-rank${
                        row.rank <= 3 ? ' is-top' : ''
                      }`}
                    >
                      {row.rank}
                    </span>

                    <span className="student-leaderboard-row-main">
                      <span className="student-leaderboard-row-title">
                        {row.name}
                        {row.isMe ? (
                          <span className="student-leaderboard-you">You</span>
                        ) : null}
                      </span>
                      <span className="student-leaderboard-row-meta">
                        {row.classesCompleted} classes · {row.assignmentsCompleted} assignments
                        {' · '}
                        {row.mcqsAttempted} MCQs
                      </span>
                    </span>

                    <span className="student-leaderboard-points">
                      {formatPoints(row.points)}
                      <span className="student-leaderboard-points-unit">pts</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="student-leaderboard-panel" aria-labelledby="leaderboard-points">
            <header className="student-leaderboard-panel-head">
              <h2 id="leaderboard-points">How points work</h2>
              <span className="student-leaderboard-panel-count">{POINT_RULES.length} ways</span>
            </header>

            <ol className="student-leaderboard-list">
              {POINT_RULES.map((rule) => (
                <li key={rule.title}>
                  <div className="student-leaderboard-rule">
                    <span className="student-leaderboard-rule-title">{rule.title}</span>
                    <span className="student-leaderboard-rule-meta">{rule.desc}</span>
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
