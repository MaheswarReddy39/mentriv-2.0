import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { listCodingTasks } from '../../services/coding-practice.service.js';
import {
  CODING_DIFFICULTY_BADGE_CLASS,
  STUDENT_STATUS_LABEL,
  TASK_ACTION_LABEL,
  TASK_STATUS_BADGE_CLASS,
  levelDisplayLabel,
  resolveAccessibleCourseId,
} from './codingPracticeUi.js';

const ACTIVE_ENROLLMENT_STATUSES = ['approved', 'completed'];
const enrollmentCourseId = (enrollment) =>
  enrollment?.course?.id || enrollment?.course?._id || null;

export default function StudentCodingTopicPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The URL carries the teacher-entered title / technology (e.g. ?title=HTML)
  // — the same key the home cards are grouped by. Older ?topic= links are
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

  const backLink = (
    <Link to="/coding-practice" className="back-link">
      Back to Coding Practice
    </Link>
  );

  if (!paramsValid) {
    return (
      <>
        {backLink}
        <EmptyState
          title="Topic not found"
          message="This topic may have been removed, or the link is incomplete."
          action={
            <Button type="button" onClick={() => navigate('/coding-practice')}>
              Back to Coding Practice
            </Button>
          }
        />
      </>
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
  const LEVEL_SECTION_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };
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
  const attemptedCount = technologyTasks.filter((task) => task.studentStatus !== 'not_started').length;
  const progress =
    taskCount > 0 ? Math.round((solvedCount / taskCount) * 1000) / 10 : 0;

  return (
    <>
      {backLink}

      <section className="asg-head fade-in" aria-labelledby="coding-topic-heading">
        <h1 id="coding-topic-heading">{technology}</h1>
        <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
          Practice {technology} coding tasks and improve your skills.
        </p>

        {error ? null : loading ? null : (
          <div style={{ marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-2)' }}>
            <ProgressBar label="Overall topic progress" value={progress} />
            <p className="text-meta" style={{ margin: 0 }}>
              {solvedCount} of {taskCount} tasks solved &middot; {attemptedCount} attempted
            </p>
          </div>
        )}
      </section>

      <section
        className="student-assignment-list fade-in"
        style={{ marginTop: 'var(--space-5)' }}
        aria-label={`${technology} tasks`}
      >
        {error ? (
          <ErrorState title="Failed to load this topic" message={error} onRetry={load} />
        ) : loading ? (
          <Loading label="Loading tasks..." />
        ) : technologyTasks.length === 0 ? (
          <EmptyState
            title="No tasks in this topic yet"
            message="Tasks published for this topic will appear here."
            action={
              <Button type="button" onClick={() => navigate('/coding-practice')}>
                Back to Coding Practice
              </Button>
            }
          />
        ) : (
          sections.map((section) => (
            <div key={section.level}>
              <h2
                className="student-classes-heading"
                style={{ marginBottom: 'var(--space-3)' }}
              >
                {levelDisplayLabel(section.level)}
              </h2>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Task Title</th>
                      <th scope="col">Difficulty</th>
                      <th scope="col">Task Type</th>
                      <th scope="col">Status</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.tasks.map((task, index) => {
                      const statusLabel =
                        STUDENT_STATUS_LABEL[task.studentStatus] || 'Not Started';
                      const number = section.startIndex + index + 1;
                      return (
                        <tr key={task.id}>
                          <td data-label="#">{number}</td>
                          <td data-label="Task Title">{task.title}</td>
                          <td data-label="Difficulty">
                            <span
                              className={`badge ${CODING_DIFFICULTY_BADGE_CLASS[task.difficulty] || 'badge-neutral'}`}
                            >
                              {task.difficulty}
                            </span>
                          </td>
                          <td data-label="Task Type">{task.taskType}</td>
                          <td data-label="Status">
                            <span
                              className={`badge ${TASK_STATUS_BADGE_CLASS[statusLabel] || 'badge-neutral'}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td data-label="Action">
                            <div className="admin-table-actions">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openTask(task)}
                              >
                                {TASK_ACTION_LABEL[statusLabel] || 'Solve'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
