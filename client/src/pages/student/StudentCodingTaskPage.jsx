import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getCodingTask } from '../../services/coding-practice.service.js';
import {
  STUDENT_STATUS_LABEL,
  constraintsList,
  examplesForTask,
  levelDisplayLabel,
  requirementsBullets,
  topicSearchUrl,
  workspaceVariant,
} from './codingPracticeUi.js';

function DetailSkeleton() {
  return (
    <div className="student-coding-skeleton" role="status">
      <span className="sr-only">Loading task…</span>
      <div className="student-coding-skeleton-panel" aria-hidden="true">
        <span className="skeleton student-coding-skeleton-meta" />
        <span
          className="skeleton"
          style={{ display: 'block', width: 'min(360px, 70%)', height: '2rem', marginTop: 12 }}
        />
        <div style={{ display: 'grid', gap: 10, marginTop: 28 }}>
          <span className="skeleton" style={{ display: 'block', height: '0.85rem' }} />
          <span className="skeleton" style={{ display: 'block', height: '0.85rem' }} />
          <span
            className="skeleton"
            style={{ display: 'block', width: '60%', height: '0.85rem' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function StudentCodingTaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Accessible course context preserved from the topic list; the backend still
  // validates it on every submission/history call.
  const courseId = searchParams.get('courseId') || '';

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await getCodingTask(taskId);
      const loaded = response?.data?.codingTask;
      if (!loaded) throw new Error('Coding task not found.');
      setTask(loaded);
    } catch (err) {
      if (err.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(err.message || 'Failed to load this task.');
      }
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const backToPractice = (
    <button
      type="button"
      className="student-coding-back"
      onClick={() => navigate('/coding-practice')}
    >
      <span aria-hidden="true">&larr;</span> Back to coding practice
    </button>
  );

  if (loading) {
    return (
      <div className="student-coding fade-in">
        {backToPractice}
        <DetailSkeleton />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="student-coding fade-in">
        {backToPractice}
        <div className="student-coding-state">
          <EmptyState
            title="Task not found"
            message="This coding task may have been removed or is not available to you."
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

  if (error) {
    return (
      <div className="student-coding fade-in">
        {backToPractice}
        <div className="student-coding-state">
          <ErrorState title="Failed to load this task" message={error} onRetry={load} />
        </div>
      </div>
    );
  }

  const requirements = requirementsBullets(task);
  const examples = examplesForTask(task);
  const constraints = constraintsList(task);
  const statusLabel = STUDENT_STATUS_LABEL[task.studentStatus] || 'Not Started';
  const isFrontendTask = workspaceVariant(task.taskType) === 'frontend';
  const showLanguage = Boolean(task.language) && !isFrontendTask;
  const starterContent = String(task.starterCode || task.starterFiles || '').trim();
  const heading = String(task.topic || '').trim() || task.title;
  const backToTopicUrl = topicSearchUrl(task, courseId);

  return (
    <div className="student-coding fade-in">
      <button
        type="button"
        className="student-coding-back"
        onClick={() => navigate(backToTopicUrl)}
      >
        <span aria-hidden="true">&larr;</span> Back to {task.title}
      </button>

      <section className="student-coding-detail" aria-labelledby="student-coding-task-heading">
        <p className="student-coding-eyebrow">
          {[task.title, levelDisplayLabel(task.level)].filter(Boolean).join(' · ')}
        </p>
        <h1 id="student-coding-task-heading">{heading}</h1>

        <dl className="student-coding-facts">
          <div>
            <dt>Course</dt>
            <dd>{task.courseTitle || '—'}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{task.difficulty || '—'}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{task.taskType || '—'}</dd>
          </div>
          {showLanguage ? (
            <div>
              <dt>Language</dt>
              <dd>
                {String(task.language).replace(/^./, (character) => character.toUpperCase())}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Status</dt>
            <dd>{statusLabel}</dd>
          </div>
        </dl>

        <div className="student-coding-detail-body">
          <p className="student-coding-lead">
            {task.description || 'No description provided.'}
          </p>

          {requirements.length > 0 ? (
            <div>
              <p className="student-coding-section-title">Requirements</p>
              <ul className="student-coding-bullets">
                {requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {task.inputFormat ? (
            <div>
              <p className="student-coding-section-title">Input format</p>
              <pre className="student-coding-code">{task.inputFormat}</pre>
            </div>
          ) : null}

          {task.outputFormat ? (
            <div>
              <p className="student-coding-section-title">Output format</p>
              <pre className="student-coding-code">{task.outputFormat}</pre>
            </div>
          ) : null}

          {examples.length > 0 ? (
            <div>
              <p className="student-coding-section-title">Examples</p>
              <div className="student-coding-examples">
                {examples.map((example, index) => (
                  <div className="student-coding-example" key={`${task.id}-example-${index}`}>
                    <div>
                      <p className="student-coding-example-label">Input {index + 1}</p>
                      <pre className="student-coding-code">{example.input}</pre>
                    </div>
                    <div>
                      <p className="student-coding-example-label">Output {index + 1}</p>
                      <pre className="student-coding-code">{example.output}</pre>
                    </div>
                    {example.note ? (
                      <p className="student-coding-row-meta">{example.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {constraints.length > 0 ? (
            <div>
              <p className="student-coding-section-title">Constraints</p>
              <ul className="student-coding-bullets">
                {constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {starterContent ? (
            <div>
              <p className="student-coding-section-title">Starter files</p>
              <pre className="student-coding-code">{starterContent}</pre>
            </div>
          ) : null}
        </div>

        <div className="student-coding-actions">
          <Button
            type="button"
            onClick={() =>
              navigate(
                `/coding-practice/tasks/${task.id}/solve${
                  courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
                }`
              )
            }
          >
            Start Task
          </Button>
        </div>
      </section>
    </div>
  );
}
