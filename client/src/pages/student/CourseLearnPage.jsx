import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { completeLesson, getCourseProgress } from '../../services/progress.service.js';
import { listCourseClasses } from '../../services/class.service.js';
import { listCourseAssignments } from '../../services/assignment.service.js';
import { listCourseMcqTests } from '../../services/mcq.service.js';
import { getMySubmissions } from '../../services/submission.service.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';

const TABS = ['Overview', 'Classes', 'Assignments', 'MCQs', 'Progress'];

const ACCESS_STATUSES = ['approved', 'completed'];

const SUBMISSION_LABELS = {
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  returned: 'Returned',
  late: 'Late',
};

const capitalize = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getNotesResource = (lesson) => {
  const resources = lesson.resources || [];
  const notes = resources.find((resource) =>
    String(resource.title || '').toLowerCase().includes('note')
  );
  return notes || resources[0] || null;
};

const lessonMeta = (lesson) => {
  const parts = [];
  if (lesson.duration > 0) parts.push(`${lesson.duration} min`);
  const resourceCount = lesson.resources?.length || 0;
  if (resourceCount > 0) {
    parts.push(`${resourceCount} ${resourceCount === 1 ? 'resource' : 'resources'}`);
  }
  return parts.join(' · ');
};

function ArrowIcon() {
  return (
    <svg
      className="student-learn-arrow"
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

function LearnSkeleton() {
  return (
    <div className="student-learn-skeleton" role="status">
      <span className="sr-only">Loading your course…</span>
      {[0, 1].map((panel) => (
        <div className="student-learn-skeleton-panel" key={panel} aria-hidden="true">
          <div className="student-learn-skeleton-head">
            <span className="skeleton student-learn-skeleton-title" />
            <span className="skeleton student-learn-skeleton-count" />
          </div>
          {[0, 1, 2].map((row) => (
            <div className="student-learn-skeleton-row" key={row}>
              <span className="skeleton student-learn-skeleton-line" />
              <span className="skeleton student-learn-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PanelNote({ children }) {
  return <p className="student-learn-panel-note">{children}</p>;
}

export default function CourseLearnPage() {
  const { courseId } = useParams();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Classes');

  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState(null);
  const [progressAvailable, setProgressAvailable] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [classesError, setClassesError] = useState(null);
  const [assignments, setAssignments] = useState(undefined); // undefined = loading, null = failed
  const [submissionByAssignment, setSubmissionByAssignment] = useState({});
  const [mcqTests, setMcqTests] = useState(undefined);
  const [completingId, setCompletingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setForbidden(false);
      setClassesError(null);
      setProgress(null);
      setProgressAvailable(false);
      setLessons([]);
      setAssignments(undefined);
      setSubmissionByAssignment({});
      setMcqTests(undefined);

      try {
        const enrRes = await getMyEnrollments({ limit: 50 });
        const match = (enrRes?.data?.enrollments || []).find(
          (item) => item.course?.id === courseId
        );
        if (!match) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (cancelled) return;
        setEnrollment(match);

        const [classesRes, progressRes, assignmentsRes, submissionsRes, mcqsRes] =
          await Promise.allSettled([
            listCourseClasses(courseId),
            getCourseProgress(courseId),
            listCourseAssignments(courseId),
            getMySubmissions({ limit: 50 }),
            listCourseMcqTests(courseId),
          ]);
        if (cancelled) return;

        if (classesRes.status === 'fulfilled') {
          setLessons(classesRes.value?.data?.lessons || []);
        } else {
          setClassesError(classesRes.reason?.message || 'Failed to load classes.');
        }

        if (progressRes.status === 'fulfilled') {
          setProgress(progressRes.value?.data?.progress || null);
          setProgressAvailable(true);
        }

        if (assignmentsRes.status === 'fulfilled') {
          const list = assignmentsRes.value?.data?.assignments || [];
          setAssignments(list);

          if (submissionsRes.status === 'fulfilled') {
            const byAssignment = {};
            for (const submission of submissionsRes.value?.data?.submissions || []) {
              const key = submission.assignment?.id;
              if (key && !byAssignment[key]) byAssignment[key] = submission;
            }
            setSubmissionByAssignment(byAssignment);
          }
        } else {
          setAssignments(null);
        }

        setMcqTests(
          mcqsRes.status === 'fulfilled' ? mcqsRes.value?.data?.mcqTests || [] : null
        );
      } catch (err) {
        if (!cancelled) {
          if (err.statusCode === 403) setForbidden(true);
          else setError(err.message || 'Failed to load this course.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const completedLessonIds = useMemo(
    () => new Set((progress?.completedLessons || []).map((item) => item.lessonId)),
    [progress]
  );

  const modules = useMemo(() => {
    const map = new Map();
    [...lessons]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((lesson) => {
        const key = (lesson.module || '').trim() || 'General';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(lesson);
      });
    return Array.from(map.entries());
  }, [lessons]);

  const nextLesson = useMemo(
    () => lessons.find((lesson) => !completedLessonIds.has(lesson.id)) || null,
    [lessons, completedLessonIds]
  );

  const refreshProgress = useCallback(() => {
    return getCourseProgress(courseId)
      .then((res) => setProgress(res?.data?.progress || null))
      .catch(() => {});
  }, [courseId]);

  const handleWatchLesson = (lesson) => {
    if (!lesson.videoUrl) return;
    window.open(lesson.videoUrl, '_blank', 'noopener,noreferrer');
    if (!progressAvailable || completedLessonIds.has(lesson.id) || completingId) return;

    setCompletingId(lesson.id);
    completeLesson(courseId, lesson.id)
      .then((res) => {
        if (res?.data?.alreadyCompleted === false) {
          toast.success('Class complete.');
        }
        return refreshProgress();
      })
      .catch((err) => toast.error(err.message || 'Could not update class progress.'))
      .finally(() => setCompletingId(null));
  };

  if (loading) return <LearnSkeleton />;

  if (forbidden) {
    return (
      <div className="student-learn-state-block">
        <ErrorState
          title="No active access"
          message="An approved enrollment is required to open this course."
          onRetry={() => window.location.assign('/my-courses')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-learn-state-block">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const pct = progressAvailable && Number.isFinite(progress?.overallPercentage)
    ? Math.round(progress.overallPercentage)
    : null;
  const completedCount = completedLessonIds.size;
  const courseTitle = enrollment?.course?.title || 'Your course';
  const isCompleted = enrollment?.status === 'completed';
  const statusTone = isCompleted || enrollment?.status === 'approved' ? 'done' : 'pending';

  const statusLabel = isCompleted ? 'Completed' : capitalize(enrollment?.status || 'Enrolled');
  const metaParts = [statusLabel];
  if (lessons.length) {
    metaParts.push(`${lessons.length} ${lessons.length === 1 ? 'class' : 'classes'}`);
  }
  if (Array.isArray(assignments) && assignments.length) {
    metaParts.push(`${assignments.length} ${assignments.length === 1 ? 'assignment' : 'assignments'}`);
  }
  if (Array.isArray(mcqTests) && mcqTests.length) {
    metaParts.push(`${mcqTests.length} ${mcqTests.length === 1 ? 'practice set' : 'practice sets'}`);
  }

  const submittedAssignments = Array.isArray(assignments)
    ? assignments.filter((assignment) => submissionByAssignment[assignment.id]).length
    : null;

  const renderClasses = () => {
    if (classesError) {
      return (
        <div className="student-learn-panel">
          <PanelNote>{classesError}</PanelNote>
        </div>
      );
    }
    if (lessons.length === 0) {
      return (
        <div className="student-learn-state-block">
          <EmptyState
            title="No classes yet"
            message="Classes appear here once your instructor publishes them."
          />
        </div>
      );
    }

    return (
      <div className="student-learn-modules">
        {modules.map(([moduleName, moduleLessons], moduleIndex) => {
          const moduleDone = moduleLessons.filter((lesson) =>
            completedLessonIds.has(lesson.id)
          ).length;

          return (
            <section
              className="student-learn-panel"
              key={`${moduleName}-${moduleIndex}`}
              aria-labelledby={`student-learn-module-${moduleIndex}`}
            >
              <header className="student-learn-panel-head">
                <h2 id={`student-learn-module-${moduleIndex}`}>{moduleName}</h2>
                <span className="student-learn-count">
                  {progressAvailable
                    ? `${moduleDone} / ${moduleLessons.length}`
                    : `${moduleLessons.length} classes`}
                </span>
              </header>

              <ol className="student-learn-list">
                {moduleLessons.map((lesson) => {
                  const isDone = completedLessonIds.has(lesson.id);
                  const isNext = nextLesson?.id === lesson.id;
                  const notes = getNotesResource(lesson);
                  const meta = lessonMeta(lesson);

                  return (
                    <li
                      className={`student-learn-lesson${isDone ? ' is-complete' : ''}${
                        isNext ? ' is-next' : ''
                      }`}
                      key={lesson.id}
                    >
                      <div className="student-learn-lesson-main">
                        <h3 className="student-learn-lesson-title">
                          <Link to={`/classes/${lesson.id}`}>{lesson.title}</Link>
                        </h3>
                        {meta ? <p className="student-learn-row-meta">{meta}</p> : null}
                      </div>

                      <div className="student-learn-lesson-side">
                        {isDone ? (
                          <span className="student-learn-state is-done">Completed</span>
                        ) : isNext ? (
                          <span className="student-learn-state is-pending">Up next</span>
                        ) : null}

                        <div className="student-learn-lesson-actions">
                          <button
                            type="button"
                            className="student-learn-action"
                            disabled={!notes}
                            onClick={() =>
                              notes && window.open(notes.url, '_blank', 'noopener,noreferrer')
                            }
                            aria-label={`Open notes for ${lesson.title}`}
                          >
                            Notes
                          </button>
                          <button
                            type="button"
                            className="student-learn-action is-watch"
                            disabled={!lesson.videoUrl || completingId === lesson.id}
                            onClick={() => handleWatchLesson(lesson)}
                            aria-label={`Watch ${lesson.title}`}
                          >
                            Watch
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    );
  };

  const renderAssignments = () => {
    if (assignments === undefined) {
      return <LearnSkeleton />;
    }
    if (assignments === null) {
      return (
        <div className="student-learn-panel">
          <PanelNote>Couldn&rsquo;t load assignments for this course.</PanelNote>
        </div>
      );
    }
    if (assignments.length === 0) {
      return (
        <div className="student-learn-state-block">
          <EmptyState
            title="No assignments yet"
            message="Published assignments will appear here."
          />
        </div>
      );
    }

    return (
      <section className="student-learn-panel" aria-labelledby="student-learn-assignments-heading">
        <header className="student-learn-panel-head">
          <h2 id="student-learn-assignments-heading">Assignments</h2>
          <span className="student-learn-count">
            {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
          </span>
        </header>

        <ol className="student-learn-list">
          {assignments.map((assignment) => {
            const submission = submissionByAssignment[assignment.id];
            const dueDate = toDate(assignment.dueDate);
            const isOverdue = Boolean(
              dueDate && dueDate.getTime() < Date.now() && !submission
            );

            let tone = 'open';
            let label = 'Open';
            if (submission) {
              const raw = String(submission.status || '').toLowerCase();
              label = SUBMISSION_LABELS[raw] || capitalize(raw);
              tone = raw === 'late' || raw === 'returned' ? 'pending' : 'done';
            } else if (isOverdue) {
              tone = 'pending';
              label = 'Overdue';
            } else if (assignment.status && assignment.status !== 'published') {
              tone = 'idle';
              label = 'Closed';
            }

            const metaLine = [
              `Max ${assignment.maxMarks} marks`,
              assignment.duration ? `${assignment.duration} min` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={assignment.id}>
                <Link to={`/assignments/${assignment.id}`} className="student-learn-row">
                  <div className="student-learn-row-main">
                    <h3 className="student-learn-row-title">{assignment.title}</h3>
                    <p className="student-learn-row-meta">{metaLine}</p>
                  </div>

                  <p className={`student-learn-row-due${isOverdue ? ' is-overdue' : ''}`}>
                    {dueDate ? `Due ${formatDate(assignment.dueDate)}` : 'No due date'}
                  </p>

                  <div className="student-learn-row-status">
                    <span className={`student-learn-state is-${tone}`}>{label}</span>
                    {submission?.marks !== null && submission?.marks !== undefined ? (
                      <span className="student-learn-marks">
                        {submission.marks} / {assignment.maxMarks}
                      </span>
                    ) : null}
                  </div>

                  <ArrowIcon />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    );
  };

  const renderMcqs = () => {
    if (mcqTests === undefined) {
      return <LearnSkeleton />;
    }
    if (mcqTests === null) {
      return (
        <div className="student-learn-panel">
          <PanelNote>Couldn&rsquo;t load practice sets for this course.</PanelNote>
        </div>
      );
    }
    if (mcqTests.length === 0) {
      return (
        <div className="student-learn-state-block">
          <EmptyState
            title="No practice sets yet"
            message="Published practice sets will appear here."
          />
        </div>
      );
    }

    return (
      <section className="student-learn-panel" aria-labelledby="student-learn-mcqs-heading">
        <header className="student-learn-panel-head">
          <h2 id="student-learn-mcqs-heading">Practice sets</h2>
          <span className="student-learn-count">
            {mcqTests.length} {mcqTests.length === 1 ? 'set' : 'sets'}
          </span>
        </header>

        <ol className="student-learn-list">
          {mcqTests.map((test) => {
            const questionCount = test.questions?.length || 0;
            const metaLine = [
              `${questionCount} ${questionCount === 1 ? 'question' : 'questions'}`,
              test.duration ? `${test.duration} min` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={test.id}>
                <Link to={`/mcq-tests/${test.id}`} className="student-learn-mcq">
                  <div className="student-learn-row-main">
                    <h3 className="student-learn-row-title">{test.title}</h3>
                    <p className="student-learn-row-meta">{metaLine}</p>
                  </div>
                  <span className="student-learn-mcq-pass">
                    Pass {test.passingScore}%
                  </span>
                  <ArrowIcon />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    );
  };

  const renderOverview = () => {
    const nextNotes = nextLesson ? getNotesResource(nextLesson) : null;
    const nextMeta = nextLesson
      ? [nextLesson.module || 'General', lessonMeta(nextLesson)].filter(Boolean).join(' · ')
      : '';

    return (
      <div className="student-learn-stack">
        <section className="student-learn-panel" aria-labelledby="student-learn-next-heading">
          <header className="student-learn-panel-head">
            <h2 id="student-learn-next-heading">Up next</h2>
            {nextLesson ? (
              <span className="student-learn-count">{nextLesson.module || 'General'}</span>
            ) : null}
          </header>

          {nextLesson ? (
            <div className="student-learn-next">
              <h3 className="student-learn-next-title">{nextLesson.title}</h3>
              {nextMeta ? <p className="student-learn-row-meta">{nextMeta}</p> : null}
              <div className="student-learn-next-actions">
                <Link to={`/classes/${nextLesson.id}`} className="student-learn-cta">
                  Open class
                  <ArrowIcon />
                </Link>
                {nextNotes ? (
                  <a
                    href={nextNotes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="student-learn-link"
                  >
                    Notes
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="student-learn-next">
              <p className="student-learn-panel-note">
                {lessons.length
                  ? 'All classes in this course are complete.'
                  : 'No classes published yet.'}
              </p>
            </div>
          )}
        </section>

        <section className="student-learn-panel" aria-labelledby="student-learn-glance-heading">
          <header className="student-learn-panel-head">
            <h2 id="student-learn-glance-heading">At a glance</h2>
          </header>

          <dl className="student-learn-facts">
            <div>
              <dt>Classes</dt>
              <dd>{progressAvailable ? `${completedCount} of ${lessons.length}` : '—'}</dd>
            </div>
            <div>
              <dt>Assignments</dt>
              <dd>
                {submittedAssignments === null
                  ? '—'
                  : `${submittedAssignments} of ${assignments.length}`}
              </dd>
            </div>
            <div>
              <dt>Practice sets</dt>
              <dd>{Array.isArray(mcqTests) ? mcqTests.length : '—'}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{formatDate(progress?.lastCompletedAt) || '—'}</dd>
            </div>
          </dl>
        </section>
      </div>
    );
  };

  const renderProgress = () => {
    const lastActivity = formatDate(progress?.lastCompletedAt);

    return (
      <div className="student-learn-stack">
        <section className="student-learn-panel" aria-labelledby="student-learn-progress-heading">
          <header className="student-learn-panel-head">
            <h2 id="student-learn-progress-heading">Overall progress</h2>
          </header>

          <div className="student-learn-overall">
            <span className="student-learn-overall-value">
              {pct === null ? '—' : `${pct}%`}
            </span>
            <span className="student-learn-meter" aria-hidden="true">
              <span style={{ width: `${pct || 0}%` }} />
            </span>
            <p className="student-learn-panel-note">
              {progressAvailable
                ? `${completedCount} of ${lessons.length} classes complete${
                    lastActivity ? ` · last activity ${lastActivity}` : ''
                  }`
                : 'Progress is unavailable right now.'}
            </p>
          </div>

          <dl className="student-learn-facts">
            <div>
              <dt>Classes</dt>
              <dd>{progressAvailable ? `${completedCount} of ${lessons.length}` : '—'}</dd>
            </div>
            <div>
              <dt>Assignments submitted</dt>
              <dd>
                {submittedAssignments === null
                  ? '—'
                  : `${submittedAssignments} of ${assignments.length}`}
              </dd>
            </div>
            <div>
              <dt>Practice sets</dt>
              <dd>{Array.isArray(mcqTests) ? mcqTests.length : '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="student-learn-panel" aria-labelledby="student-learn-modules-heading">
          <header className="student-learn-panel-head">
            <h2 id="student-learn-modules-heading">By module</h2>
            <span className="student-learn-count">
              {modules.length} {modules.length === 1 ? 'module' : 'modules'}
            </span>
          </header>

          {modules.length === 0 ? (
            <PanelNote>No modules published yet.</PanelNote>
          ) : (
            <ol className="student-learn-list">
              {modules.map(([moduleName, moduleLessons], index) => {
                const moduleDone = moduleLessons.filter((lesson) =>
                  completedLessonIds.has(lesson.id)
                ).length;
                const modulePct = moduleLessons.length
                  ? Math.round((moduleDone / moduleLessons.length) * 100)
                  : 0;

                return (
                  <li className="student-learn-module-row" key={`${moduleName}-${index}`}>
                    <div className="student-learn-row-main">
                      <h3 className="student-learn-row-title">{moduleName}</h3>
                      <p className="student-learn-row-meta">
                        {progressAvailable
                          ? `${moduleDone} of ${moduleLessons.length} classes`
                          : `${moduleLessons.length} classes`}
                      </p>
                    </div>

                    <div className="student-learn-module-meter">
                      <span className="student-learn-module-pct">
                        {progressAvailable ? `${modulePct}%` : '—'}
                      </span>
                      <span className="student-learn-meter" aria-hidden="true">
                        <span style={{ width: `${modulePct}%` }} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="student-learn fade-in">
      <Link to="/my-courses" className="student-learn-back">
        My Courses
      </Link>

      <header className="student-learn-masthead">
        <div className="student-learn-head">
          <h1 className="student-learn-title">{courseTitle}</h1>
          <p className="student-learn-meta">
            <span className={`student-learn-meta-status is-${statusTone}`}>{statusLabel}</span>
            {metaParts.slice(1).map((part) => (
              <span key={part}>
                <span className="student-learn-dot" aria-hidden="true">
                  ·
                </span>
                {part}
              </span>
            ))}
          </p>
        </div>

        <div className="student-learn-stat">
          <span className="student-learn-stat-label">Course progress</span>
          <span className="student-learn-stat-value">
            {pct === null ? '—' : `${pct}%`}
          </span>
          <span className="student-learn-bar" aria-hidden="true">
            <span style={{ width: `${pct || 0}%` }} />
          </span>
          <span className="student-learn-stat-caption">
            {progressAvailable
              ? `${completedCount} of ${lessons.length} classes`
              : 'Progress unavailable'}
          </span>
        </div>
      </header>

      <div className="student-learn-tabs" role="tablist" aria-label="Course sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`student-learn-tab-${tab.toLowerCase()}`}
            aria-selected={activeTab === tab}
            aria-controls="student-learn-panel"
            className={`student-learn-tab${activeTab === tab ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        className="student-learn-panel-body"
        id="student-learn-panel"
        role="tabpanel"
        aria-labelledby={`student-learn-tab-${activeTab.toLowerCase()}`}
        tabIndex={-1}
      >
        {activeTab === 'Overview' ? renderOverview() : null}
        {activeTab === 'Classes' ? renderClasses() : null}
        {activeTab === 'Assignments' ? renderAssignments() : null}
        {activeTab === 'MCQs' ? renderMcqs() : null}
        {activeTab === 'Progress' ? renderProgress() : null}
      </div>
    </div>
  );
}
