import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getProgressOverview } from '../../services/progress.service.js';
import useAuth from '../../hooks/useAuth.js';
import LearningStreakSection from './LearningStreakSection.jsx';

const ACTIVITY_STATUS = {
  completed: { label: 'Completed', tone: 'done' },
  submitted: { label: 'Submitted', tone: 'done' },
  passed: { label: 'Passed', tone: 'done' },
  failed: { label: 'Not passed', tone: 'missed' },
};

const relativeTime = (value) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '';

  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const continueMeta = (item) => {
  if (item.type === 'class') return item.module ? `Class · ${item.module}` : 'Class';
  if (item.type === 'assignment') return 'Assignment';
  return 'Practice';
};

const continueTarget = (item) => {
  if (!item) return null;
  if (item.type === 'class') return { to: `/classes/${item.id}` };
  if (item.type === 'assignment') return { to: `/assignments/${item.id}` };
  return { to: '/mcqs', state: { retryTestId: item.id } };
};

function ArrowIcon() {
  return (
    <svg
      className="student-home-arrow"
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

function DashboardSkeleton() {
  return (
    <div className="student-home-skeleton" role="status">
      <span className="sr-only">Loading dashboard…</span>
      <div className="student-home-skeleton-strip" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div className="skeleton student-home-skeleton-cell" key={item} />
        ))}
      </div>
      <div className="skeleton student-home-skeleton-focus" aria-hidden="true" />
      <div className="student-home-skeleton-columns" aria-hidden="true">
        <div className="skeleton student-home-skeleton-panel" />
        <div className="skeleton student-home-skeleton-panel" />
      </div>
      <div className="skeleton student-home-skeleton-streak" aria-hidden="true" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProgressOverview();
      setOverview(result?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overall = overview?.overall || null;
  const courses = overview?.courses || [];
  const continueLearning = overview?.continueLearning || null;
  const recentActivity = (overview?.recentActivity || []).slice(0, 5);
  const firstName = (user?.name || '').trim().split(/\s+/)[0];

  const assignmentsPending = courses.reduce(
    (total, course) =>
      total + course.assignments.items.filter((item) => !item.completed).length,
    0
  );

  const snapshot = overall
    ? [
        {
          label: 'Overall',
          value: `${overall.pct}%`,
          note: `${overall.completedActivities} of ${overall.totalActivities} complete`,
          pct: overall.pct,
          accent: true,
        },
        {
          label: 'Classes',
          value: `${overall.classes.completed} / ${overall.classes.total}`,
          note: `${overall.classes.total - overall.classes.completed} left`,
          pct: overall.classes.pct,
        },
        {
          label: 'Assignments',
          value: `${overall.assignments.completed} / ${overall.assignments.total}`,
          note: assignmentsPending > 0 ? `${assignmentsPending} to submit` : 'All submitted',
          pct: overall.assignments.pct,
        },
        {
          label: 'Practice',
          value: `${overall.mcq.attempted} / ${overall.mcq.total}`,
          note: `${overall.mcq.total - overall.mcq.attempted} to try`,
          pct: overall.mcq.pct,
        },
      ]
    : [];

  const continueLink = continueTarget(continueLearning);
  const continueCourse = continueLearning
    ? courses.find((course) => course.id === continueLearning.courseId)
    : null;

  return (
    <div className="student-home fade-in">
      <header className="student-home-masthead">
        <div>
          <h1 className="student-home-title">
            Welcome back{firstName ? `, ${firstName}` : ''}.
          </h1>
          {overall ? (
            <p className="student-home-lede">
              {overall.completedActivities} of {overall.totalActivities} activities complete
              {courses.length > 0
                ? ` across ${courses.length} ${courses.length === 1 ? 'course' : 'courses'}.`
                : '.'}
            </p>
          ) : null}
        </div>
        <Link to="/progress" className="student-home-masthead-link">
          Full progress
          <ArrowIcon />
        </Link>
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="student-home-error">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : (
        <>
          {overall ? (
            <section className="student-home-snapshot" aria-label="Progress snapshot">
              {snapshot.map((item) => (
                <article
                  className={`student-home-snapshot-cell${item.accent ? ' is-accent' : ''}`}
                  key={item.label}
                >
                  <p className="student-home-snapshot-label">{item.label}</p>
                  <p className="student-home-snapshot-value">{item.value}</p>
                  <span className="student-home-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, item.pct || 0)}%` }} />
                  </span>
                  <p className="student-home-snapshot-note">{item.note}</p>
                </article>
              ))}
            </section>
          ) : null}

          {continueLearning && continueLink ? (
            <section className="student-home-focus" aria-labelledby="continue-heading">
              <div className="student-home-focus-head">
                <span className="student-home-eyebrow">Continue learning</span>
                <span className="student-home-focus-course">{continueLearning.courseTitle}</span>
              </div>
              <div className="student-home-focus-main">
                <div className="student-home-focus-copy">
                  <h2 id="continue-heading">{continueLearning.title}</h2>
                  <p className="student-home-focus-meta">{continueMeta(continueLearning)}</p>
                  <Link
                    to={continueLink.to}
                    state={continueLink.state}
                    className="student-home-focus-cta"
                  >
                    Resume
                    <ArrowIcon />
                  </Link>
                </div>
                <div className="student-home-focus-meter">
                  <p className="student-home-focus-pct">
                    {Math.round(continueLearning.pct || 0)}%
                  </p>
                  <span className="student-home-bar" aria-hidden="true">
                    <span
                      style={{ width: `${Math.min(100, continueLearning.pct || 0)}%` }}
                    />
                  </span>
                  <p className="student-home-focus-caption">
                    Course progress
                    {continueCourse
                      ? ` · ${continueCourse.classes.completed} of ${continueCourse.classes.total} classes`
                      : ''}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <section className="student-home-focus is-empty" aria-labelledby="continue-heading">
              <div className="student-home-focus-head">
                <span className="student-home-eyebrow">Continue learning</span>
              </div>
              <div className="student-home-focus-main">
                <div className="student-home-focus-copy">
                  <h2 id="continue-heading">Nothing to resume.</h2>
                  <p className="student-home-focus-meta">
                    New classes, assignments, and practice sets will appear here.
                  </p>
                  <Link to="/classes" className="student-home-focus-cta">
                    Browse classes
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </section>
          )}

          <div className="student-home-columns">
            <section className="student-home-panel" aria-labelledby="courses-heading">
              <header className="student-home-panel-head">
                <h2 id="courses-heading">Your courses</h2>
                <Link to="/my-courses" className="student-home-panel-link">
                  All courses
                  <ArrowIcon />
                </Link>
              </header>

              {courses.length === 0 ? (
                <EmptyState
                  title="No active courses"
                  message="Courses appear here once your enrollment is approved."
                />
              ) : (
                <ul className="student-home-course-list">
                  {courses.map((course) => {
                    const nextClass = course.classes.items.find((item) => !item.completed);
                    return (
                      <li key={course.id}>
                        <Link
                          to={`/courses/${course.id}/learn`}
                          className="student-home-course"
                        >
                          <div className="student-home-course-main">
                            <h3>{course.title}</h3>
                            <p>
                              {course.classes.total} classes · {course.assignments.total}{' '}
                              assignments · {course.mcq.total} practice
                            </p>
                            {nextClass ? (
                              <p className="student-home-course-next">
                                Next: <span>{nextClass.title}</span>
                              </p>
                            ) : null}
                          </div>
                          <div className="student-home-course-meter">
                            <span className="student-home-course-pct">
                              {Math.round(course.overallPct || 0)}%
                            </span>
                            <span className="student-home-bar" aria-hidden="true">
                              <span
                                style={{
                                  width: `${Math.min(100, course.overallPct || 0)}%`,
                                }}
                              />
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="student-home-panel" aria-labelledby="activity-heading">
              <header className="student-home-panel-head">
                <h2 id="activity-heading">Recent activity</h2>
                <Link to="/progress" className="student-home-panel-link">
                  All activity
                  <ArrowIcon />
                </Link>
              </header>

              {recentActivity.length === 0 ? (
                <EmptyState
                  title="Nothing yet"
                  message="Completed classes, submissions, and practice attempts show up here."
                />
              ) : (
                <ol className="student-home-activity-list">
                  {recentActivity.map((item) => {
                    const status = ACTIVITY_STATUS[item.status] || {
                      label: item.kind || 'Activity',
                      tone: 'neutral',
                    };
                    return (
                      <li className="student-home-activity" key={item.id}>
                        <div className="student-home-activity-main">
                          <h3>{item.title}</h3>
                          <p>{item.desc}</p>
                        </div>
                        <div className="student-home-activity-side">
                          <span className={`student-home-status is-${status.tone}`}>
                            {status.label}
                          </span>
                          <time dateTime={item.at || undefined}>{relativeTime(item.at)}</time>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          <LearningStreakSection />
        </>
      )}
    </div>
  );
}
