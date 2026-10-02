import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import { getCodingTask } from '../../services/coding-practice.service.js';
import {
  CODING_DIFFICULTY_BADGE_CLASS,
  CODING_LEVEL_BADGE_CLASS,
  STUDENT_STATUS_LABEL,
  constraintsList,
  examplesForTask,
  requirementsBullets,
  topicSearchUrl,
  workspaceVariant,
} from './codingPracticeUi.js';

const codeBlock = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 'var(--font-size-sm)',
  background: 'var(--color-surface-muted)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3) var(--space-4)',
  margin: 0,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const sectionTitle = {
  margin: 'var(--space-5) 0 var(--space-3)',
  fontSize: 'var(--font-size-sm)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-tertiary)',
};

const bulletList = {
  display: 'grid',
  gap: 'var(--space-2)',
  margin: 0,
  paddingLeft: 'var(--space-5)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-sm)',
};

export default function StudentCodingTaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();

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
    <Link to="/coding-practice" className="back-link">
      Back to Coding Practice
    </Link>
  );

  if (loading) {
    return (
      <>
        {backToPractice}
        <Loading label="Loading task..." />
      </>
    );
  }

  if (notFound || !task) {
    return (
      <>
        {backToPractice}
        <EmptyState
          title="Task not found"
          message="This coding task may have been removed or is not available to you."
          action={
            <Button type="button" onClick={() => navigate('/coding-practice')}>
              Back to Coding Practice
            </Button>
          }
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        {backToPractice}
        <ErrorState title="Failed to load this task" message={error} onRetry={load} />
      </>
    );
  }

  const requirements = requirementsBullets(task);
  const examples = examplesForTask(task);
  const constraints = constraintsList(task);
  const statusLabel = STUDENT_STATUS_LABEL[task.studentStatus] || 'Not Started';
  const isFrontendTask = workspaceVariant(task.taskType) === 'frontend';
  const showLanguage = Boolean(task.language) && !isFrontendTask;
  const starterContent = String(task.starterCode || task.starterFiles || '').trim();

  return (
    <>
      <Link to={topicSearchUrl(task)} className="back-link">
        Back to {task.topic}
      </Link>

      <section className="asg-head fade-in" aria-labelledby="coding-task-heading">
        <div className="student-assignment-meta" style={{ marginBottom: 'var(--space-3)' }}>
          <span className={`badge ${CODING_LEVEL_BADGE_CLASS[task.level] || 'badge-neutral'}`}>
            {task.level}
          </span>
          <span
            className={`badge ${CODING_DIFFICULTY_BADGE_CLASS[task.difficulty] || 'badge-neutral'}`}
          >
            {task.difficulty}
          </span>
          <span>{task.taskType}</span>
        </div>

        <h1 id="coding-task-heading">{task.title}</h1>

        <dl className="meta-grid">
          <div>
            <dt>Course</dt>
            <dd>{task.courseTitle || '—'}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{task.level}</dd>
          </div>
          <div>
            <dt>Topic</dt>
            <dd>{task.topic}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{task.difficulty}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{task.taskType}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{statusLabel}</dd>
          </div>
        </dl>
      </section>

      <div style={{ marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-5)' }}>
        <Card>
          <h3>Description</h3>
          <p
            style={{
              margin: 'var(--space-2) 0 0',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {task.description || 'No description provided.'}
          </p>

          {requirements.length > 0 ? (
            <>
              <p style={sectionTitle}>Requirements</p>
              <ul style={bulletList}>
                {requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </>
          ) : null}

          {showLanguage ? (
            <>
              <p style={sectionTitle}>Language</p>
              <pre style={codeBlock}>{task.language}</pre>
            </>
          ) : null}

          {task.inputFormat ? (
            <>
              <p style={sectionTitle}>Input format</p>
              <pre style={codeBlock}>{task.inputFormat}</pre>
            </>
          ) : null}

          {task.outputFormat ? (
            <>
              <p style={sectionTitle}>Output format</p>
              <pre style={codeBlock}>{task.outputFormat}</pre>
            </>
          ) : null}

          {examples.length > 0 ? (
            <>
              <p style={sectionTitle}>Examples</p>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {examples.map((example, index) => (
                  <div
                    key={`${task.id}-example-${index}`}
                    style={{
                      display: 'grid',
                      gap: 'var(--space-3)',
                      borderLeft: '3px solid var(--color-border, #e2e8f0)',
                      paddingLeft: 'var(--space-4)',
                    }}
                  >
                    <div>
                      <p className="text-caption" style={{ margin: '0 0 var(--space-1)' }}>
                        Input {index + 1}
                      </p>
                      <pre style={codeBlock}>{example.input}</pre>
                    </div>
                    <div>
                      <p className="text-caption" style={{ margin: '0 0 var(--space-1)' }}>
                        Output {index + 1}
                      </p>
                      <pre style={codeBlock}>{example.output}</pre>
                    </div>
                    {example.note ? (
                      <p className="text-meta" style={{ margin: 0 }}>
                        {example.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {constraints.length > 0 ? (
            <>
              <p style={sectionTitle}>Constraints</p>
              <ul style={bulletList}>
                {constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </>
          ) : null}

          {starterContent ? (
            <>
              <p style={sectionTitle}>Starter files</p>
              <pre style={codeBlock}>{starterContent}</pre>
            </>
          ) : null}
        </Card>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button type="button" onClick={() => navigate(`/coding-practice/tasks/${task.id}/solve`)}>
            Start Task
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(topicSearchUrl(task))}>
            Back to Topic
          </Button>
        </div>
      </div>
    </>
  );
}
