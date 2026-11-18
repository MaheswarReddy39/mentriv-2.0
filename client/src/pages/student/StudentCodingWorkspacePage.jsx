import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import {
  createCodingSubmission,
  getCodingTask,
  listCodingSubmissions,
} from '../../services/coding-practice.service.js';
import {
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
  levelDisplayLabel,
  requirementsBullets,
  resolveEditorLanguage,
  submissionBadgeStatus,
  submissionStatusLabel,
  workspaceVariant,
} from './codingPracticeUi.js';

const CodeEditor = lazy(() => import('../../components/common/CodeEditor.jsx'));

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

function ChecksList({ checks, kind }) {
  if (!checks || checks.length === 0) return null;
  const title = kind === 'test_cases' ? 'Test cases' : 'Requirements';
  return (
    <div className="student-coding-checks">
      <p className="student-coding-section-title">{title}</p>
      <ul>
        {checks.map((check, index) => (
          <li
            key={`${check.label}-${index}`}
            className={check.passed ? 'is-passed' : 'is-failed'}
          >
            <span className="student-coding-check-line">
              <span aria-hidden="true">{check.passed ? '✓' : '✗'}</span>{' '}
              {formatCheckLabel(check, kind)}
            </span>
            {!check.passed && check.detail ? (
              <p className="student-coding-check-detail">{check.detail}</p>
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

  const backLink = (
    <button
      type="button"
      className="student-coding-back"
      onClick={() => navigate('/coding-practice')}
    >
      <span aria-hidden="true">&larr;</span> Back to coding practice
    </button>
  );

  if (loadingTask) {
    return (
      <div className="student-coding fade-in">
        {backLink}
        <div className="student-coding-skeleton" role="status">
          <span className="sr-only">Loading task…</span>
          <div className="student-coding-skeleton-panel" aria-hidden="true">
            <span className="skeleton student-coding-skeleton-title" />
            <div className="student-coding-skeleton-row">
              <div className="student-coding-skeleton-copy">
                <span className="skeleton student-coding-skeleton-line" />
                <span className="skeleton student-coding-skeleton-meta" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="student-coding fade-in">
        {backLink}
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

  if (taskError) {
    return (
      <div className="student-coding fade-in">
        {backLink}
        <div className="student-coding-state">
          <ErrorState title="Failed to load this task" message={taskError} onRetry={loadTask} />
        </div>
      </div>
    );
  }

  const variant = workspaceVariant(task.taskType);
  const editorLanguage = resolveEditorLanguage(task);
  const kind = checksKind(task);
  const requirements = requirementsBullets(task);
  const heading = String(task.topic || '').trim() || task.title;
  const latestJudged =
    submissions.find((submission) => JUDGED_SUBMISSION_STATUSES.includes(submission.status)) ||
    null;

  const resultScore = latestJudged && latestJudged.score !== null ? latestJudged.score : null;
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
    <div className="student-coding fade-in" aria-label={`${task.title} workspace`}>
      <button
        type="button"
        className="student-coding-back"
        onClick={() =>
          navigate(
            `/coding-practice/tasks/${task.id}${
              courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
            }`
          )
        }
      >
        <span aria-hidden="true">&larr;</span> Back to instructions
      </button>

      <header className="student-coding-masthead">
        <div className="student-coding-head">
          <p className="student-coding-eyebrow">
            {[task.title, levelDisplayLabel(task.level)].filter(Boolean).join(' · ')}
          </p>
          <h1 className="student-coding-title" id="coding-workspace-heading">
            {heading}
          </h1>
        </div>

        <div className="student-coding-stat">
          <span className="student-coding-stat-label">Latest score</span>
          <span className="student-coding-stat-value">
            {typeof resultScore === 'number' ? `${resultScore}%` : '—'}
          </span>
          <span className="student-coding-bar" aria-hidden="true">
            <span style={{ width: `${typeof resultScore === 'number' ? resultScore : 0}%` }} />
          </span>
        </div>
      </header>

      <div className="student-coding-split">
        <section className="student-coding-panel" aria-labelledby="coding-brief-heading">
          <header className="student-coding-panel-head">
            <h2 id="coding-brief-heading">
              {variant === 'coding' ? 'Problem' : 'Requirements'}
            </h2>
          </header>
          <div className="student-coding-panel-body">
            <p className="student-coding-lead">
              {task.description || 'No description provided.'}
            </p>
            {requirements.length > 0 ? (
              <ul className="student-coding-bullets">
                {requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="student-coding-panel" aria-labelledby="coding-editor-heading">
          <header className="student-coding-panel-head">
            <h2 id="coding-editor-heading">{EDITOR_LABEL[variant]}</h2>
          </header>
          <div className="student-coding-panel-body">
            <div ref={editorContainerRef} className="student-coding-editor">
              <Suspense
                fallback={
                  <div
                    className="skeleton"
                    style={{ width: '100%', height: '320px', borderRadius: 'var(--radius-sm)' }}
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
            <div className="student-coding-editor-actions">
              <Button type="button" variant="outline" onClick={handleRun}>
                {RUN_BUTTON_LABEL[variant]}
              </Button>
              <Button type="button" onClick={handleSubmit} loading={submitting} disabled={submitting}>
                Submit
              </Button>
            </div>
          </div>
        </section>
      </div>

      {Array.isArray(task.sampleTestCases) && task.sampleTestCases.length > 0 ? (
        <section className="student-coding-panel" aria-labelledby="coding-samples-heading">
          <header className="student-coding-panel-head">
            <h2 id="coding-samples-heading">Sample test cases</h2>
            <span className="student-coding-panel-count">
              {task.sampleTestCases.length}{' '}
              {task.sampleTestCases.length === 1 ? 'case' : 'cases'}
            </span>
          </header>
          <div className="student-coding-panel-body">
            <div className="student-coding-examples">
              {task.sampleTestCases.map((testCase, index) => (
                <div className="student-coding-example" key={`sample-${index}`}>
                  <div>
                    <p className="student-coding-example-label">Input {index + 1}</p>
                    <pre className="student-coding-code">{testCase.input}</pre>
                  </div>
                  <div>
                    <p className="student-coding-example-label">Expected {index + 1}</p>
                    <pre className="student-coding-code">{testCase.expected}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="student-coding-panel" aria-labelledby="coding-output-heading">
        <header className="student-coding-panel-head">
          <h2 id="coding-output-heading">{OUTPUT_TITLE[variant]}</h2>
        </header>
        <div className="student-coding-panel-body">
          {variant === 'frontend' && previewHtml ? (
            <iframe className="student-coding-preview" title="Live preview" sandbox="" srcDoc={previewHtml} />
          ) : (
            <p className="student-coding-lead">{OUTPUT_PLACEHOLDER[variant]}</p>
          )}
        </div>
      </section>

      {latestJudged ? (
        <section
          className="student-coding-panel"
          aria-labelledby="coding-result-heading"
          role="status"
          aria-live="polite"
        >
          <header className="student-coding-panel-head">
            <h2 id="coding-result-heading">Latest result</h2>
            <Badge status={submissionBadgeStatus(latestJudged.status)}>
              {submissionStatusLabel(latestJudged.status)}
            </Badge>
          </header>
          <div className="student-coding-panel-body">
            <dl className="student-coding-facts is-flush">
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

            <ChecksList checks={latestJudged.checks} kind={kind} />

            {latestJudged.executionDetails ? (
              <div>
                <p className="student-coding-section-title">Execution details</p>
                <pre className="student-coding-code">{latestJudged.executionDetails}</pre>
              </div>
            ) : null}

            <div className="student-coding-actions">
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
        </section>
      ) : null}

      <section className="student-coding-panel" aria-labelledby="coding-history-heading">
        <header className="student-coding-panel-head">
          <h2 id="coding-history-heading">Submission history</h2>
          {submissions.length > 0 ? (
            <span className="student-coding-panel-count">
              {submissions.length} {submissions.length === 1 ? 'attempt' : 'attempts'}
            </span>
          ) : null}
        </header>

        {loadingSubmissions ? (
          <div className="student-coding-panel-body">
            <span className="skeleton" style={{ display: 'block', height: '2.5rem' }} />
          </div>
        ) : submissions.length === 0 ? (
          <div className="student-coding-panel-body">
            <p className="student-coding-lead">No submissions yet. Submit your code to record an attempt.</p>
          </div>
        ) : (
          <ol className="student-coding-list">
            {submissions.map((submission) => {
              const accepted = submission.status === 'accepted';
              const failed = JUDGED_SUBMISSION_STATUSES.includes(submission.status) && !accepted;
              return (
                <li key={submission.id}>
                  <button
                    type="button"
                    className="student-coding-row"
                    onClick={() => setViewedSubmission(submission)}
                  >
                    <span className="student-coding-row-main">
                      <span className="student-coding-row-title">
                        Attempt #{submission.attemptNumber}
                      </span>
                      <span className="student-coding-row-meta">
                        {submissionStatusLabel(submission.status)} ·{' '}
                        {formatDateTime(submission.createdAt)}
                      </span>
                    </span>
                    <span className="student-coding-row-side">
                      <span
                        className={`student-coding-row-score${
                          accepted ? ' is-pass' : failed ? ' is-fail' : ''
                        }`}
                      >
                        {submission.score !== null && submission.score !== undefined
                          ? `${submission.score}%`
                          : '—'}
                      </span>
                    </span>
                    <ArrowIcon />
                  </button>
                </li>
              );
            })}
          </ol>
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
            <div className="student-coding-submission-meta">
              <Badge status={submissionBadgeStatus(viewedSubmission.status)}>
                {submissionStatusLabel(viewedSubmission.status)}
              </Badge>
              <span>Attempt #{viewedSubmission.attemptNumber}</span>
            </div>

            <dl className="student-coding-facts is-flush">
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

            <ChecksList checks={viewedSubmission.checks} kind={kind} />

            {viewedSubmission.executionDetails ? (
              <div>
                <p className="student-coding-section-title">Execution details</p>
                <pre className="student-coding-code">{viewedSubmission.executionDetails}</pre>
              </div>
            ) : null}

            {viewedSubmission.code ? (
              <div>
                <p className="student-coding-section-title">Code</p>
                <pre className="student-coding-code">{viewedSubmission.code}</pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
