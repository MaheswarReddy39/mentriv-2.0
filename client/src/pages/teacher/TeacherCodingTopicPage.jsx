import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import {
  listCodingTasks,
  updateCodingTask,
} from '../../services/coding-practice.service.js';
import { CODING_LEVEL_BADGE_CLASS, DIFFICULTIES, LEVELS } from './codingPractice.js';

const DIFFICULTY_BADGE_CLASS = {
  Easy: 'badge-success',
  Medium: 'badge-warning',
  Hard: 'badge-danger',
};

export default function TeacherCodingTopicPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const courseId = searchParams.get('courseId') || '';
  const level = searchParams.get('level') || '';
  const topic = searchParams.get('topic') || '';
  const paramsValid = Boolean(courseId && topic) && LEVELS.includes(level);

  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(paramsValid);
  const [loadError, setLoadError] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const load = useCallback(async () => {
    if (!paramsValid) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [tasksResponse, coursesResponse] = await Promise.all([
        listCodingTasks({ courseId, level, topic }),
        getTeacherDashboard(),
      ]);
      setTasks(tasksResponse?.data?.tasks || []);
      setCourses(coursesResponse?.data?.courses || []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load this topic.');
    } finally {
      setLoading(false);
    }
  }, [paramsValid, courseId, level, topic]);

  useEffect(() => {
    load();
  }, [load]);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await updateCodingTask(archiveTarget.id, { status: 'archived' });
      setTasks((current) =>
        current.map((task) =>
          task.id === archiveTarget.id ? { ...task, status: 'archived' } : task
        )
      );
      toast.success(`"${archiveTarget.title}" archived.`);
      setArchiveTarget(null);
    } catch (err) {
      toast.error(err.message || 'Could not archive this task.');
      setArchiveTarget(null);
    }
  };

  const headingId = 'teacher-coding-topic-heading';
  const courseTitle = courses.find((course) => course.id === courseId)?.title || '';

  const addTaskUrl = paramsValid
    ? `/teacher/coding-practice/new?${new URLSearchParams({
        courseId,
        level,
        topic,
      }).toString()}`
    : '/teacher/coding-practice/new';

  const pageHead = (
    <div className="page-head">
      <div>
        <p className="text-caption">Teacher</p>
        <h1 id={headingId}>{paramsValid ? topic : 'Coding Practice'}</h1>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 'var(--space-2)',
          }}
        >
          <span className={`badge ${CODING_LEVEL_BADGE_CLASS[level] || 'badge-neutral'}`}>
            {level || 'Level'}
          </span>
          {courseTitle ? <span className="text-meta">{courseTitle}</span> : null}
          {!loading && !loadError && paramsValid ? (
            <span className="text-meta">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/teacher/coding-practice')}
        >
          Back to topics
        </Button>
        <Button type="button" onClick={() => navigate(addTaskUrl)}>
          + Add Task
        </Button>
      </div>
    </div>
  );

  if (!paramsValid) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        {pageHead}
        <EmptyState
          title="Topic not found"
          message="This topic may have been removed, or the link is incomplete."
          action={
            <Button type="button" onClick={() => navigate('/teacher/coding-practice')}>
              Back to topics
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
      {pageHead}

      {loadError ? (
        <ErrorState title="Failed to load this topic" message={loadError} onRetry={load} />
      ) : loading ? (
        <Loading label="Loading topic tasks..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks in this topic"
          message="Add a task to this topic to see it here."
          action={
            <Button type="button" onClick={() => navigate(addTaskUrl)}>
              + Add Task
            </Button>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Difficulty</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td data-label="Order">{task.taskOrder}</td>
                  <td data-label="Title">{task.title}</td>
                  <td data-label="Type">{task.taskType}</td>
                  <td data-label="Difficulty">
                    <span
                      className={`badge ${DIFFICULTY_BADGE_CLASS[task.difficulty] || 'badge-neutral'}`}
                    >
                      {task.difficulty}
                    </span>
                  </td>
                  <td data-label="Status">
                    <Badge status={task.status} />
                  </td>
                  <td data-label="Actions">
                    <div className="admin-table-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher/coding-practice/${task.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(`/teacher/coding-practice/${task.id}/edit`)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={task.status === 'archived'}
                        onClick={() => setArchiveTarget(task)}
                      >
                        Archive
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this task?"
        message={`"${archiveTarget?.title || ''}" will no longer be shown to students. You can keep it in archived status.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        danger
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </section>
  );
}
