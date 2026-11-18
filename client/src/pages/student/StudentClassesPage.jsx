import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { listCourseClasses } from '../../services/class.service.js';
import { completeLesson, getCourseProgress } from '../../services/progress.service.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';

const ACTIVE_STATUSES = ['approved', 'completed'];

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const getNotesUrl = (recordedClass) => {
  const notes = (recordedClass.resources || []).find((resource) =>
    String(resource.title || '').toLowerCase().includes('note')
  );
  return notes?.url || recordedClass.resources?.[0]?.url || '';
};

const openExternalLink = (url) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const lessonMeta = (recordedClass) => {
  const parts = [];
  if (recordedClass.duration > 0) parts.push(`${recordedClass.duration} min`);
  const resourceCount = recordedClass.resources?.length || 0;
  if (resourceCount > 0) {
    parts.push(`${resourceCount} ${resourceCount === 1 ? 'resource' : 'resources'}`);
  }
  return parts.join(' · ');
};

const groupByModule = (lessons) => {
  const groups = new Map();
  lessons.forEach((lesson) => {
    const name = (lesson.module || '').trim() || 'General';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(lesson);
  });
  return Array.from(groups, ([title, items]) => ({ title, items }));
};

function CaretIcon() {
  return (
    <svg
      className="student-classes-course-caret"
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

function ClassesSkeleton() {
  return (
    <div className="student-classes-skeleton" role="status">
      <span className="sr-only">Loading classes…</span>
      {[0, 1].map((panel) => (
        <div className="student-classes-skeleton-panel" key={panel} aria-hidden="true">
          <div className="student-classes-skeleton-head">
            <span className="skeleton student-classes-skeleton-title" />
            <span className="skeleton student-classes-skeleton-count" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div className="student-classes-skeleton-row" key={row}>
              <span className="skeleton student-classes-skeleton-line" />
              <span className="skeleton student-classes-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function StudentClassesPage() {
  const toast = useToast();
  const [bootLoading, setBootLoading] = useState(true);
  const [enrollError, setEnrollError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [classes, setClasses] = useState([]);
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [progressAvailable, setProgressAvailable] = useState(true);
  const [completingId, setCompletingId] = useState(null);

  const loadEnrollments = useCallback(async () => {
    setBootLoading(true);
    setEnrollError(null);
    try {
      const res = await getMyEnrollments({ limit: 50 });
      const items = (res?.data?.enrollments || []).filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );
      setEnrollments(items);
      setSelectedCourseId((current) => {
        if (current && items.some((item) => getCourseId(item) === current)) return current;
        return items.length > 0 ? getCourseId(items[0]) : null;
      });
    } catch (err) {
      setEnrollError(err.message || 'Failed to load your courses.');
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  useEffect(() => {
    if (!selectedCourseId) {
      setClasses([]);
      setCompletedIds(new Set());
      setCourseLoading(false);
      return undefined;
    }

    let alive = true;
    setCourseLoading(true);
    setCourseError(null);
    setClasses([]);
    setCompletedIds(new Set());
    setProgressAvailable(true);

    Promise.allSettled([
      listCourseClasses(selectedCourseId),
      getCourseProgress(selectedCourseId),
    ]).then(([classesResult, progressResult]) => {
      if (!alive) return;

      if (classesResult.status === 'fulfilled') {
        setClasses(classesResult.value?.data?.lessons || []);
      } else {
        setCourseError(classesResult.reason?.message || 'Failed to load classes.');
      }

      if (progressResult.status === 'fulfilled') {
        const entries = progressResult.value?.data?.progress?.completedLessons || [];
        setCompletedIds(new Set(entries.map((entry) => entry.lessonId)));
      } else {
        setProgressAvailable(false);
      }

      setCourseLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [selectedCourseId, reloadToken]);

  const selectedEnrollment = enrollments.find(
    (enrollment) => getCourseId(enrollment) === selectedCourseId
  );
  const courseTitle = selectedEnrollment?.course?.title || '';

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [classes]
  );

  const modules = useMemo(() => groupByModule(sortedClasses), [sortedClasses]);

  const nextLessonId = useMemo(() => {
    if (!progressAvailable) return null;
    const upcoming = sortedClasses.find((lesson) => !completedIds.has(lesson.id));
    return upcoming?.id || null;
  }, [sortedClasses, completedIds, progressAvailable]);

  const totalClasses = sortedClasses.length;
  const completedClasses = sortedClasses.filter((lesson) => completedIds.has(lesson.id)).length;
  const completionPct =
    progressAvailable && totalClasses > 0
      ? Math.round((completedClasses / totalClasses) * 100)
      : 0;

  const handleWatch = (recordedClass) => {
    openExternalLink(recordedClass.videoUrl);
    if (!progressAvailable || completedIds.has(recordedClass.id) || completingId) return;

    setCompletingId(recordedClass.id);
    completeLesson(selectedCourseId, recordedClass.id)
      .then((res) => {
        setCompletedIds((current) => new Set(current).add(recordedClass.id));
        if (res?.data?.alreadyCompleted === false) {
          toast.success('Class complete.');
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Could not update class progress.');
      })
      .finally(() => setCompletingId(null));
  };

  const retryCourse = () => setReloadToken((token) => token + 1);
  const showSkeleton = bootLoading || (courseLoading && !courseError);
  const showStats = Boolean(selectedCourseId) && !courseLoading && !courseError;

  const statValue = showStats && progressAvailable ? completedClasses : '—';
  const statTotal = showStats ? totalClasses : '—';

  return (
    <div className="student-classes fade-in">
      <header className="student-classes-masthead">
        <div className="student-classes-head">
          <h1 className="student-classes-title">Classes</h1>
          {bootLoading ? (
            <span className="skeleton student-classes-course-skeleton" aria-hidden="true" />
          ) : enrollments.length > 1 ? (
            <label className="student-classes-course">
              <span className="student-classes-course-value" aria-hidden="true">
                <span>{courseTitle}</span>
                <CaretIcon />
              </span>
              <select
                className="student-classes-course-select"
                aria-label="Course"
                value={selectedCourseId || ''}
                onChange={(event) => setSelectedCourseId(event.target.value)}
              >
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
          ) : courseTitle ? (
            <p className="student-classes-course-title">{courseTitle}</p>
          ) : null}
        </div>

        <div className="student-classes-stat">
          <span className="student-classes-stat-label">Classes complete</span>
          {bootLoading ? (
            <span className="skeleton student-classes-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-classes-stat-value">
              {statValue}
              <span className="student-classes-stat-total"> / {statTotal}</span>
            </span>
          )}
          <span className="student-classes-bar" aria-hidden="true">
            <span style={{ width: `${completionPct}%` }} />
          </span>
        </div>
      </header>

      {enrollError ? (
        <div className="student-classes-state">
          <ErrorState message={enrollError} onRetry={loadEnrollments} />
        </div>
      ) : showSkeleton ? (
        <ClassesSkeleton />
      ) : enrollments.length === 0 ? (
        <div className="student-classes-state">
          <EmptyState
            title="No active courses"
            message="Classes appear here once your enrollment is approved."
            action={
              <Link to="/courses" className="btn btn-outline btn-sm">
                Browse courses
              </Link>
            }
          />
        </div>
      ) : courseError ? (
        <div className="student-classes-state">
          <ErrorState message={courseError} onRetry={retryCourse} />
        </div>
      ) : modules.length === 0 ? (
        <div className="student-classes-state">
          <EmptyState
            title="No classes yet"
            message="Classes appear here once your instructor publishes them."
          />
        </div>
      ) : (
        <div className="student-classes-modules">
          {modules.map((module, moduleIndex) => {
            const moduleCompleted = module.items.filter((lesson) =>
              completedIds.has(lesson.id)
            ).length;

            return (
              <section
                className="student-classes-module"
                key={`${module.title}-${moduleIndex}`}
                aria-labelledby={`student-module-${moduleIndex}`}
              >
                <header className="student-classes-module-head">
                  <h2 id={`student-module-${moduleIndex}`}>{module.title}</h2>
                  {progressAvailable ? (
                    <span className="student-classes-module-count">
                      {moduleCompleted} / {module.items.length}
                    </span>
                  ) : null}
                </header>

                <ol className="student-classes-list">
                  {module.items.map((recordedClass) => {
                    const notesUrl = getNotesUrl(recordedClass);
                    const isComplete = completedIds.has(recordedClass.id);
                    const isNext = recordedClass.id === nextLessonId;
                    const meta = lessonMeta(recordedClass);

                    return (
                      <li
                        className={`student-classes-lesson${isComplete ? ' is-complete' : ''}${
                          isNext ? ' is-next' : ''
                        }`}
                        key={recordedClass.id}
                      >
                        <div className="student-classes-lesson-main">
                          <h3 className="student-classes-lesson-title">
                            {recordedClass.title}
                          </h3>
                          {meta ? (
                            <p className="student-classes-lesson-meta">{meta}</p>
                          ) : null}
                        </div>

                        <div className="student-classes-lesson-side">
                          {isComplete ? (
                            <span className="student-classes-lesson-state is-complete">
                              Completed
                            </span>
                          ) : isNext ? (
                            <span className="student-classes-lesson-state is-next">
                              Up next
                            </span>
                          ) : null}

                          <div className="student-classes-lesson-actions">
                            <button
                              type="button"
                              className="student-classes-action"
                              disabled={!notesUrl}
                              onClick={() => openExternalLink(notesUrl)}
                              aria-label={`Open notes for ${recordedClass.title}`}
                            >
                              Notes
                            </button>
                            <button
                              type="button"
                              className="student-classes-action is-watch"
                              disabled={!recordedClass.videoUrl || completingId === recordedClass.id}
                              onClick={() => handleWatch(recordedClass)}
                              aria-label={`Watch ${recordedClass.title}`}
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
      )}
    </div>
  );
}
