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
  CODING_LEVEL_BADGE_CLASS,
  STUDENT_STATUS_LABEL,
  TASK_ACTION_LABEL,
  TASK_STATUS_BADGE_CLASS,
  resolveAccessibleCourseId,
} from './codingPracticeUi.js';

const ACTIVE_ENROLLMENT_STATUSES = ['approved', 'completed'];
const enrollmentCourseId = (enrollment) =>
  enrollment?.course?.id || enrollment?.course?._id || null;

export default function StudentCodingTopicPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseId = searchParams.get('courseId') || '';
  const level = searchParams.get('level') || '';
  const topic = searchParams.get('topic') || '';
  const paramsValid = Boolean(courseId && level && topic);

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
        listCodingTasks({ courseId, level, topic }),
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
  }, [paramsValid, courseId, level, topic]);

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

  const taskCount = tasks.length;
  const solvedCount = tasks.filter((task) => task.studentStatus === 'solved').length;
  const attemptedCount = tasks.filter((task) => task.studentStatus !== 'not_started').length;
  const progress =
    taskCount > 0 ? Math.round((solvedCount / taskCount) * 1000) / 10 : 0;
  const courseTitle = [...new Set(tasks.map((task) => task.courseTitle).filter(Boolean))].join(' · ');

  return (
    <>
      {backLink}

      <section className="asg-head fade-in" aria-labelledby="coding-topic-heading">
        <div className="student-assignment-meta" style={{ marginBottom: 'var(--space-3)' }}>
          <span className={`badge ${CODING_LEVEL_BADGE_CLASS[level] || 'badge-neutral'}`}>
            {level}
          </span>
          {courseTitle ? <span>{courseTitle}</span> : null}
        </div>

        <h1 id="coding-topic-heading">{topic}</h1>

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
        aria-label={`${topic} tasks`}
      >
        {error ? (
          <ErrorState title="Failed to load this topic" message={error} onRetry={load} />
        ) : loading ? (
          <Loading label="Loading tasks..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No published tasks in this topic"
            message="Tasks published by your teacher for this topic will appear here."
            action={
              <Button type="button" onClick={() => navigate('/coding-practice')}>
                Back to Coding Practice
              </Button>
            }
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Title</th>
                  <th scope="col">Difficulty</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => {
                  const statusLabel =
                    STUDENT_STATUS_LABEL[task.studentStatus] || 'Not Started';
                  return (
                    <tr key={task.id}>
                      <td data-label="#">{index + 1}</td>
                      <td data-label="Title">{task.title}</td>
                      <td data-label="Difficulty">
                        <span
                          className={`badge ${CODING_DIFFICULTY_BADGE_CLASS[task.difficulty] || 'badge-neutral'}`}
                        >
                          {task.difficulty}
                        </span>
                      </td>
                      <td data-label="Type">{task.taskType}</td>
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
        )}
      </section>
    </>
  );
}
