import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { listCourseAssignments } from '../../services/assignment.service.js';
import { getProgressOverview } from '../../services/progress.service.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To submit' },
  { id: 'submitted', label: 'Submitted' },
];

const STATUS = {
  completed: { label: 'Submitted', tone: 'submitted' },
  pending: { label: 'Pending', tone: 'pending' },
  overdue: { label: 'Overdue', tone: 'overdue' },
  open: { label: 'Open', tone: 'open' },
};

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const formatDue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const options = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  return date.toLocaleDateString('en-IN', options);
};

const marksLabel = (row) => {
  const maxMarks = row.info?.maxMarks ?? row.maxMarks;
  if (row.info?.marks !== null && row.info?.marks !== undefined) {
    return `${row.info.marks} / ${maxMarks}`;
  }
  if (row.state === 'completed') return 'Not graded';
  return maxMarks ? `${maxMarks} marks` : null;
};

function ArrowIcon() {
  return (
    <svg
      className="student-assignments-arrow"
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

function CaretIcon() {
  return (
    <svg
      className="student-assignments-course-caret"
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

function AssignmentsSkeleton() {
  return (
    <div className="student-assignments-skeleton" role="status">
      <span className="sr-only">Loading assignments…</span>
      <div className="student-assignments-skeleton-toolbar" aria-hidden="true">
        {[0, 1, 2].map((chip) => (
          <span className="skeleton student-assignments-skeleton-chip" key={chip} />
        ))}
      </div>
      <div className="student-assignments-skeleton-panel" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="student-assignments-skeleton-row" key={row}>
            <div className="student-assignments-skeleton-copy">
              <span className="skeleton student-assignments-skeleton-title" />
              <span className="skeleton student-assignments-skeleton-meta" />
            </div>
            <span className="skeleton student-assignments-skeleton-date" />
            <span className="skeleton student-assignments-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CourseAssignmentsPage() {
  const { courseId: routeCourseId } = useParams();
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [progressAvailable, setProgressAvailable] = useState(true);
  const [courseFilter, setCourseFilter] = useState(routeCourseId || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [enrollmentRes, overviewRes] = await Promise.all([
        getMyEnrollments({ limit: 50 }),
        getProgressOverview().catch(() => null),
      ]);

      const active = (enrollmentRes?.data?.enrollments || []).filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );
      setEnrollments(active);

      const scoped = routeCourseId
        ? active.filter((enrollment) => getCourseId(enrollment) === routeCourseId)
        : active;

      const infoById = new Map();
      (overviewRes?.data?.courses || []).forEach((course) => {
        (course.assignments?.items || []).forEach((item) => infoById.set(item.id, item));
      });
      setProgressAvailable(Boolean(overviewRes));

      const results = await Promise.all(
        scoped.map((enrollment) =>
          listCourseAssignments(getCourseId(enrollment))
            .then((res) => ({ enrollment, items: res?.data?.assignments || [] }))
            .catch(() => null)
        )
      );

      if (scoped.length > 0 && results.every((result) => result === null)) {
        throw new Error('Failed to load assignments.');
      }

      // A shared assignment can come back from several enrolled courses — keep one row.
      const byId = new Map();
      results.filter(Boolean).forEach(({ enrollment, items }) => {
        const courseId = getCourseId(enrollment);
        const courseTitle = enrollment?.course?.title || '';
        items.forEach((assignment) => {
          if (byId.has(assignment.id)) return;
          byId.set(assignment.id, {
            ...assignment,
            courseId,
            courseTitle,
            info: infoById.get(assignment.id) || null,
          });
        });
      });

      setAssignments([...byId.values()]);
    } catch (err) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [routeCourseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCourseFilter(routeCourseId || 'all');
    setStatusFilter('all');
  }, [routeCourseId]);

  const courseOptions = useMemo(
    () => [
      { id: 'all', title: 'All courses' },
      ...enrollments.map((enrollment) => ({
        id: getCourseId(enrollment),
        title: enrollment.course?.title || 'Untitled course',
      })),
    ],
    [enrollments]
  );

  const visibleRows = useMemo(() => {
    const scoped =
      courseFilter === 'all'
        ? assignments
        : assignments.filter((assignment) => assignment.courseId === courseFilter);

    return scoped
      .map((assignment) => {
        const state = assignment.info?.status || 'open';
        return {
          ...assignment,
          state,
          completed: state === 'completed',
        };
      })
      .sort((a, b) => {
        // Actionable work first (soonest due), then submitted work (most recent first).
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return a.completed ? bDue - aDue : aDue - bDue || a.title.localeCompare(b.title);
      });
  }, [assignments, courseFilter]);

  const counts = useMemo(
    () => ({
      all: visibleRows.length,
      todo: visibleRows.filter((row) => row.state === 'pending' || row.state === 'overdue').length,
      submitted: visibleRows.filter((row) => row.state === 'completed').length,
    }),
    [visibleRows]
  );

  const activeRows = useMemo(() => {
    if (statusFilter === 'todo') {
      return visibleRows.filter((row) => row.state === 'pending' || row.state === 'overdue');
    }
    if (statusFilter === 'submitted') {
      return visibleRows.filter((row) => row.state === 'completed');
    }
    return visibleRows;
  }, [visibleRows, statusFilter]);

  const routeEnrollment = routeCourseId
    ? enrollments.find((enrollment) => getCourseId(enrollment) === routeCourseId)
    : null;
  const singleCourseTitle = enrollments[0]?.course?.title || '';
  const showCourseSelect = !routeCourseId && enrollments.length > 1;
  const courseTitle = routeEnrollment?.course?.title || singleCourseTitle;
  const courseFilterLabel =
    courseOptions.find((option) => option.id === courseFilter)?.title || 'All courses';

  const showStats = !loading && !error && enrollments.length > 0;
  const statValue = showStats && progressAvailable ? counts.submitted : '—';
  const statTotal = showStats ? visibleRows.length : '—';
  const completionPct =
    progressAvailable && visibleRows.length > 0
      ? Math.round((counts.submitted / visibleRows.length) * 100)
      : 0;

  const emptyTitle =
    statusFilter === 'submitted' ? 'Nothing submitted yet' : 'All caught up';
  const emptyMessage =
    statusFilter === 'submitted'
      ? 'Submitted assignments will appear here.'
      : 'Nothing is waiting on you in this view.';

  return (
    <div className="student-assignments fade-in">
      <header className="student-assignments-masthead">
        <div className="student-assignments-head">
          <h1 className="student-assignments-title">Assignments</h1>
          {loading ? (
            <span className="skeleton student-assignments-course-skeleton" aria-hidden="true" />
          ) : showCourseSelect ? (
            <label className="student-assignments-course">
              <span className="student-assignments-course-value" aria-hidden="true">
                <span>{courseFilterLabel}</span>
                <CaretIcon />
              </span>
              <select
                className="student-assignments-course-select"
                aria-label="Course"
                value={courseFilter}
                onChange={(event) => {
                  setCourseFilter(event.target.value);
                  setStatusFilter('all');
                }}
              >
                {courseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
          ) : courseTitle ? (
            <p className="student-assignments-course-title">{courseTitle}</p>
          ) : null}
        </div>

        <div className="student-assignments-stat">
          <span className="student-assignments-stat-label">Submitted</span>
          {loading ? (
            <span className="skeleton student-assignments-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-assignments-stat-value">
              {statValue}
              <span className="student-assignments-stat-total"> / {statTotal}</span>
            </span>
          )}
          <span className="student-assignments-bar" aria-hidden="true">
            <span style={{ width: `${completionPct}%` }} />
          </span>
        </div>
      </header>

      {error ? (
        <div className="student-assignments-state">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : loading ? (
        <AssignmentsSkeleton />
      ) : enrollments.length === 0 ? (
        <div className="student-assignments-state">
          <EmptyState
            title="No active courses"
            message="Assignments appear here once your enrollment is approved."
            action={
              <Link to="/courses" className="btn btn-outline btn-sm">
                Browse courses
              </Link>
            }
          />
        </div>
      ) : routeCourseId && !routeEnrollment ? (
        <div className="student-assignments-state">
          <EmptyState
            title="Course unavailable"
            message="This course isn’t part of your active enrollments."
          />
        </div>
      ) : assignments.length === 0 ? (
        <div className="student-assignments-state">
          <EmptyState
            title="No assignments yet"
            message="Assignments appear here once your instructor publishes them."
          />
        </div>
      ) : (
        <>
          {progressAvailable ? (
            <div className="student-assignments-toolbar">
              <div
                className="student-assignments-filters"
                role="group"
                aria-label="Filter assignments"
              >
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`student-assignments-filter${
                      statusFilter === filter.id ? ' is-active' : ''
                    }`}
                    aria-pressed={statusFilter === filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                    <span className="student-assignments-filter-count">
                      {counts[filter.id]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <section className="student-assignments-panel" aria-label="Assignments">
            {activeRows.length === 0 ? (
              <div className="student-assignments-empty">
                <EmptyState title={emptyTitle} message={emptyMessage} />
              </div>
            ) : (
              <>
                <div className="student-assignments-columns" aria-hidden="true">
                  <span>Assignment</span>
                  <span>Due</span>
                  <span>Status</span>
                  <span />
                </div>

                <ol className="student-assignments-list">
                  {activeRows.map((assignment) => {
                    const status = STATUS[assignment.state] || STATUS.open;
                    const due = assignment.dueDate ? formatDue(assignment.dueDate) : null;
                    const meta = [assignment.courseTitle, assignment.duration ? `${assignment.duration} min` : null]
                      .filter(Boolean)
                      .join(' · ');
                    const marks = marksLabel(assignment, assignment.info);

                    return (
                      <li key={assignment.id}>
                        <Link
                          to={`/assignments/${assignment.id}`}
                          className="student-assignments-row"
                        >
                          <div className="student-assignments-row-main">
                            <h3 className="student-assignments-row-title">
                              {assignment.title}
                            </h3>
                            {meta ? (
                              <p className="student-assignments-row-meta">{meta}</p>
                            ) : null}
                          </div>

                          <p
                            className={`student-assignments-row-due${
                              assignment.state === 'overdue' ? ' is-overdue' : ''
                            }`}
                          >
                            {due ? (
                              <>
                                Due <time dateTime={assignment.dueDate}>{due}</time>
                              </>
                            ) : (
                              'No due date'
                            )}
                          </p>

                          <div className="student-assignments-row-status">
                            <span className={`student-assignments-state-label is-${status.tone}`}>
                              {status.label}
                            </span>
                            {marks ? (
                              <span className="student-assignments-marks">{marks}</span>
                            ) : null}
                          </div>

                          <ArrowIcon />
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
