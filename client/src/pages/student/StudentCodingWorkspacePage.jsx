import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import {
  createCodingSubmission,
  getCodingTask,
  listCodingSubmissions,
} from '../../services/coding-practice.service.js';
import {
  CODING_DIFFICULTY_BADGE_CLASS,
  CODING_LEVEL_BADGE_CLASS,
  EDITOR_LABEL,
  JUDGED_SUBMISSION_STATUSES,
  OUTPUT_PLACEHOLDER,
  OUTPUT_TITLE,
  RUN_BUTTON_LABEL,
  RUN_EMPTY_MESSAGE,
  SUBMIT_EMPTY_MESSAGE,
  checksKind,
  formatCheckLabel,
  formatDateTime,
  isPlaceholderCode,
  requirementsBullets,
  resolveEditorLanguage,
  submissionBadgeStatus,
  submissionBorderColor,
  submissionStatusLabel,
  topicSearchUrl,
  workspaceVariant,
} from './codingPracticeUi.js';

const CodeEditor = lazy(() => import('../../components/common/CodeEditor.jsx'));

const splitGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
  gap: 'var(--space-4)',
  alignItems: 'start',
};

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

const bulletList = {
  display: 'grid',
  gap: 'var(--space-2)',
  margin: 0,
  paddingLeft: 'var(--space-5)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-sm)',
};

function ChecksList({ checks, kind, summary }) {
  if (!checks || checks.length === 0) return null;
  const title = kind === 'test_cases' ? 'Test Cases' : 'Requirements';
  return (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <p className="text-caption" style={{ margin: 0 }}>
        {title}
      </p>
      <p className="text-meta" style={{ margin: '0 0 var(--space-2)' }}>
        {summary} Passed
      </p>
      <ul
        style={{
          display: 'grid',
          gap: 'var(--space-2)',
          margin: 0,
          paddingLeft: 0,
          listStyle: 'none',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        {checks.map((check, index) => (
          <li key={`${check.label}-${index}`}>
            <span style={{ color: check.passed ? 'var(--teal)' : 'var(--coral-dark)' }}>
              {check.passed ? '✓' : '✗'} {formatCheckLabel(check, kind)}
            </span>
            {!check.passed && check.detail ? (
              <p className="text-meta" style={{ margin: '2px 0 0 var(--space-4)' }}>
                {check.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StudentCodingWorkspacePage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const [searchParams] = useSearchParams();
  // Course context from the task details page: scopes submissions and history
  // to one course so Course A attempts never mix with Course B attempts.
  const courseId = searchParams.get('courseId') || '';

  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [taskError, setTaskError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [code, setCode] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewedSubmission, setViewedSubmission] = useState(null);

  const loadTask = useCallback(async () => {
    setLoadingTask(true);
    setTaskError(null);
    setNotFound(false);
    try {
      const response = await getCodingTask(taskId);
      const loaded = response?.data?.codingTask;
      if (!loaded) throw new Error('Coding task not found.');
      setTask(loaded);
      setCode(loaded.starterCode || loaded.starterFiles || '');
      setPreviewHtml('');
      setSubmissions([]);
    } catch (err) {
      if (err.statusCode === 404) {
        setNotFound(true);
      } else {
        setTaskError(err.message || 'Failed to load this task.');
      }
    } finally {
      setLoadingTask(false);
    }
  }, [taskId]);

  const loadSubmissions = useCallback(async (id, courseContext) => {
    setLoadingSubmissions(true);
    try {
      const response = await listCodingSubmissions(id, courseContext);
      setSubmissions(response?.data?.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (task?.id) {
      loadSubmissions(task.id, courseId);
    }
  }, [task?.id, courseId, loadSubmissions]);

  const handleRun = () => {
    if (variant === 'frontend') {
      if (!code.trim()) {
        toast.error(RUN_EMPTY_MESSAGE);
        return;
      }
      setPreviewHtml(code);
      return;
    }
    toast.info('Code execution is not available yet. This is a placeholder until the judge is implemented.');
  };

  const handleSubmit = async () => {
    if (!task || submitting) return;
    const trimmed = code.trim();
    if (isPlaceholderCode(task, trimmed)) {
      toast.error(SUBMIT_EMPTY_MESSAGE);
      return;
    }
    setSubmitting(true);
    try {
      const response = await createCodingSubmission(task.id, {
        code: trimmed,
        ...(courseId ? { courseId } : {}),
      });
      const created = response?.data?.submission;
      if (created) {
        if (created.status === 'accepted') {
          toast.success('Submission evaluated — Accepted.');
        } else if (created.status === 'submitted') {
          toast.info('Submission recorded.');
        } else {
          const summary =
            created.passedTests !== null && created.totalTests !== null
              ? ` (${created.passedTests}/${created.totalTests} passed)`
              : '';
          toast.warning(
            `Submission evaluated — ${submissionStatusLabel(created.status)}${summary}.`
          );
        }
        await loadSubmissions(task.id, courseId);
      }
    } catch (err) {
      toast.error(err.message || 'Could not record this submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      editorContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const backToPractice = (
    <Link to="/coding-practice" className="back-link">
      Back to Coding Practice
    </Link>
  );

  if (loadingTask) {
    return (
      <div className="admin-dashboard fade-in">
        {backToPractice}
        <Loading label="Loading task..." />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="admin-dashboard fade-in">
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
      </div>
    );
  }

  if (taskError) {
    return (
      <div className="admin-dashboard fade-in">
        {backToPractice}
        <ErrorState title="Failed to load this task" message={taskError} onRetry={loadTask} />
      </div>
    );
  }

  const variant = workspaceVariant(task.taskType);
  const editorLanguage = resolveEditorLanguage(task);
  const kind = checksKind(task);
  const requirements = requirementsBullets(task);
  const latestJudged =
    submissions.find((submission) => JUDGED_SUBMISSION_STATUSES.includes(submission.status)) ||
    null;

  const resultScore = latestJudged && latestJudged.score !== null ? latestJudged.score : '—';
  const resultPassed =
    latestJudged && latestJudged.passedTests !== null && latestJudged.totalTests !== null
      ? `${latestJudged.passedTests}/${latestJudged.totalTests}`
      : '—';
  const resultFailed =
    latestJudged &&
    latestJudged.passedTests !== null &&
    latestJudged.totalTests !== null
      ? latestJudged.totalTests - latestJudged.passedTests
      : '—';

  return (
    <div className="admin-dashboard fade-in" aria-label={`${task.title} workspace`}>
      <Link
        to={`/coding-practice/tasks/${task.id}${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`}
        className="back-link"
      >
        Back to instructions
      </Link>

      <section className="asg-head" aria-labelledby="coding-workspace-heading">
        <div className="student-assignment-meta" style={{ marginBottom: 'var(--space-3)' }}>
          <span className={`badge ${CODING_LEVEL_BADGE_CLASS[task.level] || 'badge-neutral'}`}>
            {task.level}
          </span>
          <span
            className={`badge ${CODING_DIFFICULTY_BADGE_CLASS[task.difficulty] || 'badge-neutral'}`}
          >
            {task.difficulty}
          </span>
          <span>{task.topic}</span>
          <span>{task.taskType}</span>
        </div>
        <h1 id="coding-workspace-heading">{task.title}</h1>
        <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
          {task.courseTitle}
        </p>
      </section>

      <div style={splitGrid}>
        <Card>
          <h3>{variant === 'coding' ? 'Problem description' : 'Requirements'}</h3>
          <p
            style={{
              margin: 'var(--space-2) 0 var(--space-4)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {task.description || 'No description provided.'}
          </p>
          {requirements.length > 0 ? (
            <ul style={bulletList}>
              {requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <p className="text-caption" style={{ margin: '0 0 var(--space-2)' }}>
            {EDITOR_LABEL[variant]}
          </p>
          <div ref={editorContainerRef} style={{ width: '100%' }}>
            <Suspense
              fallback={
                <div
                  className="skeleton"
                  style={{ width: '100%', height: '320px', borderRadius: 'var(--radius-md)' }}
                />
              }
            >
              <CodeEditor
                language={editorLanguage}
                value={code}
                onChange={setCode}
                label={EDITOR_LABEL[variant]}
                height="320px"
                onMount={(instance) => {
                  editorRef.current = instance;
                }}
              />
            </Suspense>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
              marginTop: 'var(--space-4)',
            }}
          >
            <Button type="button" variant="outline" onClick={handleRun}>
              {RUN_BUTTON_LABEL[variant]}
            </Button>
            <Button type="button" onClick={handleSubmit} loading={submitting} disabled={submitting}>
              Submit
            </Button>
          </div>
        </Card>
      </div>

      {Array.isArray(task.sampleTestCases) && task.sampleTestCases.length > 0 ? (
        <Card>
          <h3>Sample Test Cases</h3>
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-3)',
            }}
          >
            {task.sampleTestCases.map((testCase, index) => (
              <div
                key={`sample-${index}`}
                style={{
                  display: 'grid',
                  gap: 'var(--space-2)',
                  borderLeft: '3px solid var(--color-border, #e2e8f0)',
                  paddingLeft: 'var(--space-4)',
                }}
              >
                <p className="text-caption" style={{ margin: 0 }}>
                  Test Case {index + 1}
                </p>
                <div>
                  <p className="text-meta" style={{ margin: '0 0 var(--space-1)' }}>
                    Input
                  </p>
                  <pre style={codeBlock}>{testCase.input}</pre>
                </div>
                <div>
                  <p className="text-meta" style={{ margin: '0 0 var(--space-1)' }}>
                    Expected Output
                  </p>
                  <pre style={codeBlock}>{testCase.expected}</pre>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <h3>{OUTPUT_TITLE[variant]}</h3>
        {variant === 'frontend' && previewHtml ? (
          <iframe
            title="Live preview"
            sandbox=""
            srcDoc={previewHtml}
            style={{
              display: 'block',
              width: '100%',
              minHeight: '320px',
              marginTop: 'var(--space-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
            }}
          />
        ) : (
          <p className="text-meta" style={{ margin: 'var(--space-3) 0 0' }}>
            {OUTPUT_PLACEHOLDER[variant]}
          </p>
        )}
      </Card>

      {latestJudged ? (
        <div
          className="card"
          style={{ borderLeft: `3px solid ${submissionBorderColor(latestJudged.status)}` }}
          role="status"
          aria-live="polite"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Badge status={submissionBadgeStatus(latestJudged.status)}>
                {submissionStatusLabel(latestJudged.status)}
              </Badge>
              <span className="text-meta">
                {latestJudged.executionDetails || 'No evaluation details for this attempt.'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline' }}>
              <span className="text-caption">Score</span>
              <strong style={{ fontSize: '1.4rem' }}>
                {typeof resultScore === 'number' ? `${resultScore}%` : '—'}
              </strong>
            </div>
          </div>

          <dl className="meta-grid" style={{ marginTop: 'var(--space-4)' }}>
            <div>
              <dt>Score</dt>
              <dd>{typeof resultScore === 'number' ? `${resultScore}%` : '—'}</dd>
            </div>
            <div>
              <dt>Passed</dt>
              <dd>{resultPassed}</dd>
            </div>
            <div>
              <dt>Failed</dt>
              <dd>{resultFailed}</dd>
            </div>
            <div>
              <dt>Attempt</dt>
              <dd>#{latestJudged.attemptNumber}</dd>
            </div>
          </dl>

          <ChecksList checks={latestJudged.checks} kind={kind} summary={resultPassed} />

          {latestJudged.executionDetails ? (
            <>
              <p className="text-caption" style={{ margin: 'var(--space-4) 0 var(--space-2)' }}>
                Execution details
              </p>
              <pre style={codeBlock}>{latestJudged.executionDetails}</pre>
            </>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
              marginTop: 'var(--space-4)',
            }}
          >
            <Button type="button" variant="outline" onClick={handleTryAgain}>
              Try Again
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setViewedSubmission(latestJudged)}
            >
              View Submission
            </Button>
          </div>
        </div>
      ) : null}

      <section aria-labelledby="submission-history-heading">
        <h2 id="submission-history-heading" className="student-classes-heading">
          Submission History
        </h2>

        {loadingSubmissions ? (
          <Loading label="Loading submissions..." />
        ) : submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            message="Submit your code to record an attempt."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Attempt #</th>
                  <th scope="col">Status</th>
                  <th scope="col">Score</th>
                  <th scope="col">Date / Time</th>
                  <th scope="col">Submission</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td data-label="Attempt #">{submission.attemptNumber}</td>
                    <td data-label="Status">
                      <Badge status={submissionBadgeStatus(submission.status)}>
                        {submissionStatusLabel(submission.status)}
                      </Badge>
                    </td>
                    <td data-label="Score">
                      {submission.score !== null && submission.score !== undefined
                        ? `${submission.score}%`
                        : '—'}
                    </td>
                    <td data-label="Date / Time">{formatDateTime(submission.createdAt)}</td>
                    <td data-label="Submission">
                      <div className="admin-table-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setViewedSubmission(submission)}
                        >
                          View submission
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(viewedSubmission)}
        onClose={() => setViewedSubmission(null)}
        title={viewedSubmission ? `Submission #${viewedSubmission.attemptNumber}` : 'Submission'}
        footer={
          <Button type="button" onClick={() => setViewedSubmission(null)}>
            Close
          </Button>
        }
      >
        {viewedSubmission ? (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="student-assignment-meta">
              <Badge status={submissionBadgeStatus(viewedSubmission.status)}>
                {submissionStatusLabel(viewedSubmission.status)}
              </Badge>
              <span>Attempt #{viewedSubmission.attemptNumber}</span>
            </div>

            <dl className="meta-grid" style={{ marginTop: 0 }}>
              <div>
                <dt>Score</dt>
                <dd>
                  {viewedSubmission.score !== null && viewedSubmission.score !== undefined
                    ? `${viewedSubmission.score}%`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Passed tests</dt>
                <dd>
                  {viewedSubmission.passedTests !== null &&
                  viewedSubmission.passedTests !== undefined &&
                  viewedSubmission.totalTests !== null &&
                  viewedSubmission.totalTests !== undefined
                    ? `${viewedSubmission.passedTests}/${viewedSubmission.totalTests}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDateTime(viewedSubmission.createdAt)}</dd>
              </div>
            </dl>

            <ChecksList
              checks={viewedSubmission.checks}
              kind={kind}
              summary={
                viewedSubmission.passedTests !== null && viewedSubmission.totalTests !== null
                  ? `${viewedSubmission.passedTests}/${viewedSubmission.totalTests}`
                  : '—'
              }
            />

            {viewedSubmission.executionDetails ? (
              <div>
                <p className="text-caption" style={{ margin: '0 0 var(--space-2)' }}>
                  Execution details
                </p>
                <pre style={codeBlock}>{viewedSubmission.executionDetails}</pre>
              </div>
            ) : null}

            {viewedSubmission.code ? (
              <div>
                <p className="text-caption" style={{ margin: '0 0 var(--space-2)' }}>
                  Code
                </p>
                <pre style={codeBlock}>{viewedSubmission.code}</pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
