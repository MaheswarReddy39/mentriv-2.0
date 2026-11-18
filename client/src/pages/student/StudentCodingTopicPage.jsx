import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { listCodingTasks } from '../../services/coding-practice.service.js';
import {
  levelDisplayLabel,
  resolveAccessibleCourseId,
} from './codingPracticeUi.js';

const ACTIVE_ENROLLMENT_STATUSES = ['approved', 'completed'];
const enrollmentCourseId = (enrollment) =>
  enrollment?.course?.id || enrollment?.course?._id || null;

const LEVEL_SECTION_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };

function ArrowIcon() {
  return (
    <svg
      className="student-coding-arrow"
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

function TaskListSkeleton() {
  return (
    <div className="student-coding-skeleton" role="status">
      <span className="sr-only">Loading tasks…</span>
      {[0, 1].map((panel) => (
        <div className="student-coding-skeleton-panel" key={panel} aria-hidden="true">
          <div className="student-coding-skeleton-head">
            <span className="skeleton student-coding-skeleton-title" />
            <span className="skeleton student-coding-skeleton-count" />
          </div>
          {[0, 1, 2].map((row) => (
            <div className="student-coding-skeleton-row" key={row}>
              <div className="student-coding-skeleton-copy">
                <span className="skeleton student-coding-skeleton-line" />
                <span className="skeleton student-coding-skeleton-meta" />
              </div>
              <span className="skeleton student-coding-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function StudentCodingTopicPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The URL carries the teacher-entered title / technology (e.g. ?title=HTML)
  // — the same key the home rows are grouped by. Older ?topic= links are
  // accepted as a fallback. courseId stays optional: it only remembers the
  // course context a task was opened from. The list itself is server-scoped
  // to the student's enrolled courses and contains EVERY level of this title.
  const courseId = searchParams.get('courseId') || '';
  const technology = String(
    searchParams.get('title') || searchParams.get('topic') || ''
  ).trim();
  const paramsValid = Boolean(technology);

  const [tasks, setTasks] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loading, setLoading] = useState(paramsValid);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!paramsValid) return;
    setLoading(true);
    setError(null);
    try {
      // Tasks are already scoped server-side to this student's enrolled courses.
      // Enrollments are only used to pick the right course context per task.
      const [response, enrollmentRes] = await Promise.all([
        listCodingTasks({}),
        getMyEnrollments({ limit: 50 }).catch(() => null),
      ]);
      setTasks(response?.data?.tasks || []);
      setEnrolledCourseIds(
        (enrollmentRes?.data?.enrollments || [])
          .filter((enrollment) => ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status))
          .map(enrollmentCourseId)
          .filter(Boolean)
      );
    } catch (err) {
      setError(err.message || 'Failed to load this topic.');
    } finally {
      setLoading(false);
    }
  }, [paramsValid, technology]);

  useEffect(() => {
    load();
  }, [load]);

  const openTask = (task) => {
    const taskCourseId = resolveAccessibleCourseId(task, courseId, enrolledCourseIds);
    const params = new URLSearchParams();
    if (taskCourseId) params.set('courseId', taskCourseId);
    const qs = params.toString();
    navigate(`/coding-practice/tasks/${task.id}${qs ? `?${qs}` : ''}`);
  };

  const backToPractice = (
    <button
      type="button"
      className="student-coding-back"
      onClick={() => navigate('/coding-practice')}
    >
      <span aria-hidden="true">&larr;</span> Back to coding practice
    </button>
  );

  if (!paramsValid) {
    return (
      <div className="student-coding fade-in">
        {backToPractice}
        <div className="student-coding-state">
          <EmptyState
            title="Topic not found"
            message="This topic may have been removed, or the link is incomplete."
            action={
              <Button type="button" onClick={() => navigate('/coding-practice')}>
                Back to Coding Practice
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Every accessible task of this title, across all topics, levels and
  // courses. Filtering never reorders: the backend order is preserved.
  const technologyTasks = tasks.filter(
    (task) => String(task?.title || '').trim() === technology
  );

  // Visual level sections inside the ONE technology page (Basic/Medium/
  // Advanced). Backend level order first, unknown levels after; tasks inside
  // a section keep the backend order. Numbers continue across sections.
  const sections = [];
  const sectionByLevel = new Map();
  technologyTasks.forEach((task) => {
    const level = String(task.level || '').trim() || 'Other';
    let section = sectionByLevel.get(level);
    if (!section) {
      section = { level, tasks: [] };
      sectionByLevel.set(level, section);
      sections.push(section);
    }
    section.tasks.push(task);
  });
  sections.sort(
    (a, b) =>
      (LEVEL_SECTION_RANK[a.level] ?? 99) - (LEVEL_SECTION_RANK[b.level] ?? 99)
  );
  let sectionOffset = 0;
  sections.forEach((section) => {
    section.startIndex = sectionOffset;
    sectionOffset += section.tasks.length;
  });

  const taskCount = technologyTasks.length;
  const solvedCount = technologyTasks.filter((task) => task.studentStatus === 'solved').length;
  const solvedPct = taskCount > 0 ? Math.round((solvedCount / taskCount) * 100) : 0;

  const statusOf = (task) => {
    const status = task.studentStatus || 'not_started';
    if (status === 'solved') {
      return { label: 'Solved', className: 'student-coding-row-status is-solved' };
    }
    if (status === 'attempted') {
      return { label: 'Attempted', className: 'student-coding-row-status' };
    }
    return { label: 'Not started', className: 'student-coding-row-status is-idle' };
  };

  return (
    <div className="student-coding fade-in">
      {backToPractice}

      <header className="student-coding-masthead">
        <div className="student-coding-head">
          <h1 className="student-coding-title">{technology}</h1>
        </div>

        <div className="student-coding-stat">
          <span className="student-coding-stat-label">Solved</span>
          {loading ? (
            <span className="skeleton student-coding-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-coding-stat-value">
              {error ? '—' : solvedCount}
              <span className="student-coding-stat-total"> / {error ? '—' : taskCount}</span>
            </span>
          )}
          <span className="student-coding-bar" aria-hidden="true">
            <span style={{ width: `${loading || error ? 0 : solvedPct}%` }} />
          </span>
        </div>
      </header>

      {error ? (
        <div className="student-coding-state">
          <ErrorState title="Failed to load this topic" message={error} onRetry={load} />
        </div>
      ) : loading ? (
        <TaskListSkeleton />
      ) : technologyTasks.length === 0 ? (
        <div className="student-coding-state">
          <EmptyState
            title="No tasks in this topic yet"
            message="Tasks published for this topic will appear here."
            action={
              <Button type="button" onClick={() => navigate('/coding-practice')}>
                Back to Coding Practice
              </Button>
            }
          />
        </div>
      ) : (
        <div className="student-coding-panels">
          {sections.map((section, sectionIndex) => (
            <section
              className="student-coding-panel"
              key={section.level}
              aria-labelledby={`student-coding-level-${sectionIndex}`}
            >
              <header className="student-coding-panel-head">
                <h2 id={`student-coding-level-${sectionIndex}`}>
                  {levelDisplayLabel(section.level)}
                </h2>
                <span className="student-coding-panel-count">
                  {section.tasks.length} {section.tasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </header>

              <ol className="student-coding-list">
                {section.tasks.map((task, index) => {
                  const status = statusOf(task);
                  const number = section.startIndex + index + 1;
                  const label = String(task.topic || '').trim() || task.title || 'Untitled task';
                  const meta = [task.taskType, task.difficulty].filter(Boolean).join(' · ');

                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        className="student-coding-row student-coding-task-row"
                        onClick={() => openTask(task)}
                      >
                        <span className="student-coding-row-index" aria-hidden="true">
                          {number}
                        </span>
                        <span className="student-coding-row-main">
                          <span className="student-coding-row-title">{label}</span>
                          {meta ? <span className="student-coding-row-meta">{meta}</span> : null}
                        </span>
                        <span className="student-coding-row-side">
                          <span className={status.className}>{status.label}</span>
                        </span>
                        <ArrowIcon />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
