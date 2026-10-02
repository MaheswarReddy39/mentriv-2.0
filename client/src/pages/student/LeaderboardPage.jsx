import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getLeaderboard } from '../../services/progress.service.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const TIME_OPTIONS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

const POINT_EXAMPLES = [
  {
    title: 'Complete a class',
    desc: 'Watch a published class once to earn points for it.',
  },
  {
    title: 'Submit an assignment',
    desc: 'Each assignment counts one time, no matter how often you resubmit.',
  },
  {
    title: 'Complete a practice',
    desc: 'Attempt a practice set once to earn points for it.',
  },
  {
    title: 'Good scores',
    desc: 'Strong latest scores in assignments and practices add a bonus.',
  },
];

const PODIUM_BADGE = { 1: 'badge-warning', 2: 'badge-neutral', 3: 'badge-accent' };

const PODIUM_AVATAR = {
  1: { background: 'var(--amber)', color: '#fff' },
  2: { background: 'var(--border)', color: 'var(--text)' },
  3: { background: 'var(--coral)', color: '#fff' },
};

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const initialsOf = (name) =>
  String(name || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const formatPoints = (points) => Number(points || 0).toLocaleString('en-IN');

const EMPTY_LEADERBOARD = {
  scope: null,
  participants: 0,
  topStudents: [],
  rows: [],
  me: null,
};

const formatRankChange = (change) => {
  if (change === null || change === undefined) return '—';
  if (change > 0) return `↑ ${change}`;
  if (change < 0) return `↓ ${Math.abs(change)}`;
  return '0';
};

const podiumCardStyle = (rank) => ({
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-3)',
  minHeight: rank === 1 ? '260px' : '228px',
  ...(rank === 1
    ? {
        border: '2px solid var(--amber)',
        background:
          'linear-gradient(150deg, rgba(245, 165, 36, 0.16), rgba(79, 70, 229, 0.07) 55%, var(--surface))',
        boxShadow: 'var(--shadow-md)',
      }
    : {}),
});

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

  // Refetch the leaderboard whenever the course or time filter changes.
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

  const courseOptions = enrollments.map((enrollment) => ({
    id: getCourseId(enrollment),
    title: enrollment?.course?.title || 'Course',
  }));

  const me = leaderboard?.me || null;
  const rows = leaderboard?.rows || [];
  const topStudents = leaderboard?.topStudents || [];
  const participants = leaderboard?.participants || 0;

  const rankLabel = me && me.rank !== null ? `#${me.rank}` : '#—';
  const percentileLabel =
    me && me.percentile !== null && me.percentile !== undefined
      ? ` · Top ${Math.max(1, 100 - me.percentile)}%`
      : '';

  const scoreLine = [
    `${formatPoints(me?.totalPoints)} total points`,
    me && me.rankChange !== null && me.rankChange !== undefined
      ? `${formatRankChange(me.rankChange)} positions`
      : null,
    `${me?.totalParticipants ?? participants} participants`,
  ]
    .filter(Boolean)
    .join(' · ');

  const performanceStats = [
    { label: 'Classes Completed', value: String(me?.classesCompleted ?? 0), className: 'stat-teal' },
    {
      label: 'Assignments Completed',
      value: String(me?.assignmentsCompleted ?? 0),
      className: 'stat-indigo',
    },
    { label: 'MCQs Attempted', value: String(me?.mcqsAttempted ?? 0), className: 'stat-amber' },
    {
      label: 'Average Score',
      value: me && me.averageScore !== null && me.averageScore !== undefined
        ? `${me.averageScore}%`
        : '—',
      className: 'stat-coral',
    },
    { label: 'Current Rank', value: rankLabel, className: 'stat-teal' },
  ];

  return (
    <div className="admin-dashboard fade-in">
      <header className="admin-dashboard-header">
        <div>
          <h1>Leaderboard</h1>
          <p className="admin-welcome">See how you rank among other students</p>
        </div>
      </header>

      <section
        aria-label="Leaderboard filters"
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          maxWidth: '620px',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <Select
            label="Course"
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
          >
            <option value="">All Courses</option>
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select
            label="Time"
            value={timeFilter}
            onChange={(event) => setTimeFilter(event.target.value)}
          >
            {TIME_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {loadError ? (
        <ErrorState
          title="Failed to load the leaderboard"
          message={loadError}
          onRetry={retryLoad}
        />
      ) : leaderboard === null ? (
        <Loading label="Loading leaderboard…" />
      ) : participants === 0 ? (
        <EmptyState
          title="No leaderboard data yet"
          message={
            selectedCourseId
              ? 'No students are on this course leaderboard yet. Join a course to get started.'
              : 'Enroll in a course to appear on the leaderboard.'
          }
        />
      ) : (
        <>
          {/* My Rank */}
          <section
            className="result-hero result-pass"
            aria-label="My rank"
            style={{ padding: 'var(--space-7) var(--space-6)' }}
          >
            <p className="text-meta uppercase">Your Rank</p>
            <p className="result-percentage">{rankLabel}</p>
            <p className="result-score">
              {scoreLine}
              {percentileLabel}
            </p>

            <div className="student-mcq-result-summary" style={{ marginTop: 'var(--space-5)' }}>
              <div>
                <p className="admin-stat-value stat-indigo">{formatPoints(me?.totalPoints)}</p>
                <p className="admin-stat-label">Total Points</p>
              </div>
              <div>
                <p className="admin-stat-value stat-teal">{formatRankChange(me?.rankChange)}</p>
                <p className="admin-stat-label">Rank Change</p>
              </div>
              <div>
                <p className="admin-stat-value stat-amber">
                  {me?.totalParticipants ?? participants}
                </p>
                <p className="admin-stat-label">Total Participants</p>
              </div>
            </div>
          </section>

          {/* Top 3 Podium */}
          {topStudents.length > 0 ? (
            <section className="admin-quick-actions" aria-labelledby="podium-heading">
              <div className="section-head">
                <div>
                  <h2 id="podium-heading">Top 3 Podium</h2>
                </div>
              </div>

              <div className="student-classes-grid" style={{ alignItems: 'end' }}>
                {topStudents.map((entry) => (
                  <div key={entry.studentId} className="card" style={podiumCardStyle(entry.rank)}>
                    <span className={`badge ${PODIUM_BADGE[entry.rank]}`}>#{entry.rank}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        ...PODIUM_AVATAR[entry.rank],
                      }}
                    >
                      {initialsOf(entry.name)}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-h4)' }}>{entry.name}</h3>
                    <div>
                      <p
                        className="admin-stat-value stat-teal"
                        style={{ margin: 0, fontSize: '1.5rem' }}
                      >
                        {formatPoints(entry.points)}
                      </p>
                      <p className="admin-stat-label" style={{ margin: 0 }}>
                        Points
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Leaderboard Table */}
          <section className="admin-quick-actions" aria-labelledby="rankings-heading">
            <div className="section-head">
              <div>
                <h2 id="rankings-heading">Rankings</h2>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Student</th>
                    <th scope="col">Points</th>
                    <th scope="col">Classes</th>
                    <th scope="col">Assignments</th>
                    <th scope="col">MCQs</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.studentId}
                      style={
                        row.isMe
                          ? { background: 'rgba(79, 70, 229, 0.10)', fontWeight: 600 }
                          : undefined
                      }
                    >
                      <td data-label="Rank">
                        <span className="teacher-leaderboard-rank">{row.rank}</span>
                      </td>
                      <td data-label="Student">
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              background: row.isMe ? 'var(--indigo)' : 'var(--color-surface-muted)',
                              color: row.isMe ? '#fff' : 'var(--text-secondary)',
                            }}
                          >
                            {initialsOf(row.name)}
                          </span>
                          {row.name}
                          {row.isMe ? <span className="badge badge-info">You</span> : null}
                        </span>
                      </td>
                      <td data-label="Points">{formatPoints(row.points)}</td>
                      <td data-label="Classes">{row.classesCompleted}</td>
                      <td data-label="Assignments">{row.assignmentsCompleted}</td>
                      <td data-label="MCQs">{row.mcqsAttempted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* My Performance */}
          <section aria-labelledby="performance-heading">
            <div className="section-head">
              <div>
                <h2 id="performance-heading">My Performance</h2>
              </div>
            </div>

            <div className="admin-stat-grid admin-stat-grid-five">
              {performanceStats.map((item) => (
                <Card key={item.label}>
                  <p className={`admin-stat-value ${item.className}`}>{item.value}</p>
                  <p className="admin-stat-label">{item.label}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* How Points Work */}
          <section className="admin-quick-actions" aria-labelledby="points-heading">
            <div className="section-head">
              <div>
                <h2 id="points-heading">How Points Work</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {POINT_EXAMPLES.map((item) => (
                <Card key={item.title}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span className="badge badge-accent">Points</span>
                    <div>
                      <h3 className="text-h4" style={{ margin: '0 0 var(--space-1)' }}>
                        {item.title}
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)', margin: 0 }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
