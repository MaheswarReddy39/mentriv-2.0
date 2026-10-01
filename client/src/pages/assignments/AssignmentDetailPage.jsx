import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAssignmentById } from '../../services/assignment.service.js';

import { createSubmission, getMySubmissions } from '../../services/submission.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';

const SUBMISSION_STATUS_LABELS = {
  submitted: 'Submitted',
  late: 'Late submission',
  reviewed: 'Reviewed',
  returned: 'Returned',
};

const DRAFT_KEY_PREFIX = 'mentriv:assignment-attempt:';

const draftKeyFor = (id) => `${DRAFT_KEY_PREFIX}${id}`;

const readDraft = (id) => {
  try {
    const raw = window.localStorage.getItem(draftKeyFor(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeDraft = (id, value) => {
  try {
    window.localStorage.setItem(draftKeyFor(id), JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the attempt still works without it.
  }
};

const clearDraft = (id) => {
  try {
    window.localStorage.removeItem(draftKeyFor(id));
  } catch {
    // Ignore storage failures.
  }
};

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const toast = useToast();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState(null); // newest first
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Attempt flow: instructions screen first, timer starts only on Start Assignment.
  const [view, setView] = useState('instructions'); // 'instructions' | 'attempt' | 'summary'
  const [startedAt, setStartedAt] = useState(null); // epoch ms
  const [remainingMs, setRemainingMs] = useState(null);
  const [expiredNotice, setExpiredNotice] = useState(false);

  // Submission form state
  const [submissionText, setSubmissionText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [githubRepositoryName, setGithubRepositoryName] = useState('');
  const [githubRepositoryUrl, setGithubRepositoryUrl] = useState('');
  const [githubErrors, setGithubErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const autoSubmitRef = useRef(false);
  const submitRef = useRef(null);

  const resolveInitialView = (loadedAssignment, rows) => {
    const active = rows.find((s) => s.status === 'submitted' || s.status === 'late');
    const reviewed = rows.find((s) => s.status === 'reviewed');
    const draft = readDraft(assignmentId);
    const totalMs = Number(loadedAssignment?.duration) * 60000 || 0;

    if (active) {
      clearDraft(assignmentId);
      setStartedAt(null);
      setRemainingMs(null);
      setView('summary');
      return;
    }

    if (draft && typeof draft.startedAt === 'number') {
      if (totalMs > 0 && Date.now() > draft.startedAt + totalMs) {
        clearDraft(assignmentId);
        setStartedAt(null);
        setRemainingMs(null);
        if (rows.length > 0) {
          setView('summary');
        } else {
          setExpiredNotice(true);
          setView('instructions');
        }
        return;
      }

      setSubmissionText(draft.submissionText || '');
      setGithubRepositoryName(draft.githubRepositoryName || '');
      setGithubRepositoryUrl(draft.githubRepositoryUrl || '');
      setAttachments(Array.isArray(draft.attachments) ? draft.attachments : []);
      setGithubErrors({});
      autoSubmitRef.current = false;
      setStartedAt(draft.startedAt);
      setView('attempt');
      return;
    }

    setStartedAt(null);
    setRemainingMs(null);
    setView(reviewed || rows.length > 0 ? 'summary' : 'instructions');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);
    try {
      const res = await getAssignmentById(assignmentId);
      const loaded = res.data.assignment;
      setAssignment(loaded);

      const subs = await getMySubmissions({ assignmentId, limit: 50 });
      const rows = subs.data.submissions || [];
      setSubmissions(rows);

      resolveInitialView(loaded, rows);
    } catch (err) {
      if (err.statusCode === 403) setForbidden(true);
      else if (err.statusCode === 404) setNotFound(true);
      else setError(err.message || 'Failed to load this assignment');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const attempts = submissions || [];
  const activeSubmission = attempts.find((s) => s.status === 'submitted' || s.status === 'late') || null;
  const reviewedAttempt = attempts.find((s) => s.status === 'reviewed') || null;
  const canSubmitNew = !activeSubmission;

  const durationMinutes = Number(assignment?.duration) || 0;
  const durationMs = durationMinutes * 60000;
  const nextAttemptNumber = attempts.length + 1;
  const isExpired =
    view === 'attempt' && durationMs > 0 && remainingMs !== null && remainingMs <= 0;

  const dueInfo = useMemo(() => {
    if (!assignment?.dueDate) return null;
    const due = new Date(assignment.dueDate);
    const overdue = Date.now() > due.getTime();
    return { due, label: formatDate(due), overdue };
  }, [assignment?.dueDate]);

  // Keep the in-progress attempt (start time + answers) across refreshes/reopens.
  useEffect(() => {
    if (view !== 'attempt' || !startedAt) return;
    writeDraft(assignmentId, {
      startedAt,
      submissionText,
      githubRepositoryName,
      githubRepositoryUrl,
      attachments,
    });
  }, [view, startedAt, submissionText, githubRepositoryName, githubRepositoryUrl, attachments, assignmentId]);

  // Countdown: starts only after Start Assignment, auto-submits when it reaches zero.
  useEffect(() => {
    if (view !== 'attempt') {
      setRemainingMs(null);
      return undefined;
    }
    if (!durationMs || !startedAt) return undefined;

    const tick = () => {
      const remaining = startedAt + durationMs - Date.now();
      setRemainingMs(Math.max(remaining, 0));
      if (remaining <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        toast.warning('Time is up — submitting your assignment now.');
        submitRef.current?.({ auto: true });
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [view, startedAt, durationMs, toast]);

  const startAssignment = () => {
    const now = Date.now();
    setSubmissionText('');
    setGithubRepositoryName('');
    setGithubRepositoryUrl('');
    setAttachments([]);
    setGithubErrors({});
    setExpiredNotice(false);
    setConfirmOpen(false);
    autoSubmitRef.current = false;
    setStartedAt(now);
    setRemainingMs(durationMs > 0 ? durationMs : null);
    writeDraft(assignmentId, {
      startedAt: now,
      submissionText: '',
      githubRepositoryName: '',
      githubRepositoryUrl: '',
      attachments: [],
    });
    setView('attempt');
  };

  const addAttachment = () => {
    setAttachments((current) => [...current, { title: '', url: '' }]);
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, i) => i !== index));
  };

  const updateAttachment = (index, field, value) => {
    setAttachments((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const submitFinal = async (options = {}) => {
    const auto = Boolean(options?.auto);
    if (submitting) return;

    const nextGithubErrors = {};
    if (assignment.assignmentType === 'normalTest') {
      if (!githubRepositoryName.trim()) {
        nextGithubErrors.githubRepositoryName = 'GitHub Repository Name is required';
      }
      if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(githubRepositoryUrl.trim())) {
        nextGithubErrors.githubRepositoryUrl = 'Enter a valid GitHub Repository URL';
      }
    }
    if (Object.keys(nextGithubErrors).length > 0) {
      setGithubErrors(nextGithubErrors);
      setConfirmOpen(false);
      if (auto) {
        toast.error('Time expired and the assignment could not be submitted — required fields are missing.');
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        submissionText: submissionText.trim(),
        githubRepositoryName: githubRepositoryName.trim(),
        githubRepositoryUrl: githubRepositoryUrl.trim(),
        attachments: attachments
          .filter((row) => row.title.trim() && row.url.trim())
          .map((row) => ({ title: row.title.trim(), url: row.url.trim() })),
      };
      if (durationMs > 0 && startedAt) {
        payload.startedAt = new Date(startedAt).toISOString();
      }
      await createSubmission(assignmentId, payload);

      clearDraft(assignmentId);
      autoSubmitRef.current = false;
      setStartedAt(null);
      setRemainingMs(null);
      setExpiredNotice(false);
      toast.success(
        auto
          ? 'Time is up — your assignment was submitted automatically.'
          : 'Assignment submitted successfully.'
      );
      setSubmissionText('');
      setGithubRepositoryName('');
      setGithubRepositoryUrl('');
      setGithubErrors({});
      setAttachments([]);
      await loadData();
      setView('summary');
    } catch (err) {
      toast.error(err.message || 'Could not submit the assignment. Please try again.');
      await loadData();
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };
  submitRef.current = submitFinal;

  if (loading) return <Loading label="Loading assignment..." />;

  if (forbidden) {
    return (
      <>
        <Link to="/my-courses" className="back-link">← Back to My Courses</Link>
        <ErrorState
          title="You don't have access to this assignment"
          message="An approved enrollment for this course is required."
          onRetry={() => window.location.assign('/my-courses')}
        />
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <Link to="/my-courses" className="back-link">← Back to My Courses</Link>
        <ErrorState title="Assignment not found" message="This assignment may have been removed." />
      </>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const courseIdForBack = assignment.courseId;
  const maxMarks = Number(assignment.maxMarks);
  const questionCount = Array.isArray(assignment.questions) ? assignment.questions.length : 0;
  const timerWarning = remainingMs !== null && remainingMs <= 5 * 60 * 1000;

  const attachmentsSection = (
    Array.isArray(assignment.attachments) && assignment.attachments.length > 0 ? (
      <section aria-labelledby="attachments-heading" style={{ marginTop: 'var(--space-5)' }}>
        <h3 id="attachments-heading" className="text-h4">Attachments</h3>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {assignment.attachments.map((attachment) => (
            <a
              key={attachment.title}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="resource-row"
            >
              <span aria-hidden="true">📄</span>
              <span style={{ flex: 1 }}>{attachment.title}</span>
              <span className="link-arrow text-sm">Open</span>
            </a>
          ))}
        </div>
      </section>
    ) : null
  );

  /* ---------- INSTRUCTIONS SCREEN (timer not started yet) ---------- */
  if (view === 'instructions') {
    return (
      <>
        <Link to={`/courses/${courseIdForBack}/learn`} className="back-link">
          ← Back to course
        </Link>

        <section className="asg-head fade-in" aria-labelledby="asg-heading">
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
              <Badge status="published">Published</Badge>
              <span className="badge badge-info">
                {durationMinutes ? `${durationMinutes} min limit` : 'No time limit'}
              </span>
              {dueInfo ? (
                <span className={`badge ${dueInfo.overdue ? 'badge-danger' : 'badge-warning'}`}>
                  {dueInfo.overdue ? `Overdue · was due ${dueInfo.label}` : `Due ${dueInfo.label}`}
                </span>
              ) : null}
            </div>

            <p className="text-caption">Assignment instructions</p>
            <h1 id="asg-heading">{assignment.title}</h1>
          </div>

          <dl className="meta-grid">
            <div>
              <dt>Duration</dt>
              <dd>{durationMinutes ? `${durationMinutes} minutes` : 'No time limit'}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{dueInfo ? dueInfo.label : '—'}</dd>
            </div>
            <div>
              <dt>Maximum marks</dt>
              <dd>{maxMarks}</dd>
            </div>
            {questionCount > 0 ? (
              <div>
                <dt>Questions</dt>
                <dd>{questionCount}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {expiredNotice ? (
          <p className="late-note" role="alert">
            ⚠ Your previous attempt's time limit expired before it could be submitted. You can start a new attempt.
          </p>
        ) : null}

        {assignment.description ? (
          <Card>
            <h3>Description</h3>
            <p style={{ margin: 0 }}>{assignment.description}</p>
          </Card>
        ) : null}

        {assignment.instructions ? (
          <Card>
            <h3>Instructions</h3>
            <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{assignment.instructions}</p>
          </Card>
        ) : null}

        {attachmentsSection}

        <div className="student-assignment-submit" style={{ marginTop: 'var(--space-6)' }}>
          <Button onClick={startAssignment}>
            {attempts.length > 0 ? `Start attempt #${nextAttemptNumber}` : 'Start Assignment'}
          </Button>
        </div>
      </>
    );
  }

  /* ---------- ACTIVE ATTEMPT (countdown running) ---------- */
  if (view === 'attempt') {
    return (
      <>
        <Link to={`/courses/${courseIdForBack}/learn`} className="back-link">
          ← Back to course
        </Link>

        <section className="asg-head fade-in" aria-labelledby="asg-heading">
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
              <Badge status="published">Published</Badge>
              <span className="badge badge-info">Attempt #{nextAttemptNumber}</span>
              {dueInfo ? (
                <span className={`badge ${dueInfo.overdue ? 'badge-danger' : 'badge-warning'}`}>
                  {dueInfo.overdue ? `Overdue · was due ${dueInfo.label}` : `Due ${dueInfo.label}`}
                </span>
              ) : null}
            </div>

            <h1 id="asg-heading">{assignment.title}</h1>
          </div>

          <dl className="meta-grid">
            <div>
              <dt>Maximum marks</dt>
              <dd>{maxMarks}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{dueInfo ? dueInfo.label : '—'}</dd>
            </div>
            <div>
              <dt>Time remaining</dt>
              <dd>
                {durationMs
                  ? formatRemaining(remainingMs !== null ? remainingMs : durationMs)
                  : 'No time limit'}
              </dd>
            </div>
          </dl>
        </section>

        {durationMs ? (
          <div
            role="timer"
            aria-live="polite"
            aria-label="Time remaining"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              marginTop: 'var(--space-4)',
              border: `1px solid ${timerWarning ? 'var(--color-error, #ef4444)' : 'var(--color-border, #e2e8f0)'}`,
              borderRadius: 'var(--radius-md, 10px)',
              background: timerWarning ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isExpired ? 'Time is up' : 'Time remaining'}
            </span>
            <strong
              style={{
                fontSize: 'var(--font-size-h4, 1.125rem)',
                fontVariantNumeric: 'tabular-nums',
                color: timerWarning ? 'var(--color-error, #ef4444)' : undefined,
              }}
            >
              {formatRemaining(remainingMs !== null ? remainingMs : durationMs)}
            </strong>
          </div>
        ) : null}

        {isExpired ? (
          <p className="late-note" role="alert">
            ⚠ The time limit for this attempt has ended. This assignment can no longer be submitted.
          </p>
        ) : null}

        <Card style={{ marginTop: 'var(--space-5)' }}>
          <fieldset disabled={isExpired} style={{ border: 0, padding: 0, margin: 0 }}>
            <h3>{attempts.length > 0 ? `Attempt #${nextAttemptNumber}` : 'Ready to submit?'}</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Add your response below. Attachments use a title and a shareable URL.
            </p>

            {assignment.assignmentType === 'normalTest' ? (
              <div className="normal-test-repo-grid">
                <Input
                  label="GitHub Repository Name"
                  value={githubRepositoryName}
                  onChange={(event) => {
                    setGithubRepositoryName(event.target.value);
                    setGithubErrors((current) => ({ ...current, githubRepositoryName: undefined }));
                  }}
                  error={githubErrors.githubRepositoryName}
                />
                <Input
                  label="GitHub Repository URL"
                  type="url"
                  value={githubRepositoryUrl}
                  onChange={(event) => {
                    setGithubRepositoryUrl(event.target.value);
                    setGithubErrors((current) => ({ ...current, githubRepositoryUrl: undefined }));
                  }}
                  error={githubErrors.githubRepositoryUrl}
                  placeholder="https://github.com/owner/repository"
                />
              </div>
            ) : null}

            <Textarea
              label="Your response"
              placeholder="Describe your approach, paste links to repos or docs, or summarize what you built…"
              value={submissionText}
              onChange={(event) => setSubmissionText(event.target.value)}
              maxLength={5000}
              hint={`${submissionText.length}/5000 characters`}
            />

            <div className="form-attachments">
              <h4 className="text-label">Attachments ({attachments.length})</h4>
              {attachments.map((row, index) => (
                <div key={index} className="attach-row">
                  <Input
                    placeholder="Title"
                    aria-label={`Attachment ${index + 1} title`}
                    value={row.title}
                    onChange={(event) => updateAttachment(index, 'title', event.target.value)}
                  />
                  <Input
                    placeholder="https://share-link.example.com/file"
                    aria-label={`Attachment ${index + 1} URL`}
                    value={row.url}
                    onChange={(event) => updateAttachment(index, 'url', event.target.value)}
                  />
                  <Button variant="ghost" size="sm" aria-label={`Remove attachment ${index + 1}`} onClick={() => removeAttachment(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addAttachment}>
                + Add attachment
              </Button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <Button onClick={() => setConfirmOpen(true)} disabled={submitting || isExpired}>
                Submit assignment
              </Button>
            </div>

            {lateWarningShown(dueInfo) ? (
              <p className="late-note">⚠ This assignment is past its due date — it will be marked as a late submission.</p>
            ) : null}
          </fieldset>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          title="Submit this assignment?"
          message="Make sure your work is ready before submitting."
          confirmLabel="Submit assignment"
          cancelLabel="Cancel"
          loading={submitting}
          onConfirm={() => submitFinal()}
          onCancel={() => setConfirmOpen(false)}
        />
      </>
    );
  }

  /* ---------- SUMMARY (submitted / reviewed / history) ---------- */
  return (
    <>
      <Link to={`/courses/${courseIdForBack}/learn`} className="back-link">
        ← Back to course
      </Link>

      {/* ---------- Header ---------- */}
      <section className="asg-head fade-in" aria-labelledby="asg-heading">
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <Badge status="published">Published</Badge>
            {dueInfo ? (
              <span className={`badge ${dueInfo.overdue ? 'badge-danger' : 'badge-warning'}`}>
                {dueInfo.overdue ? `Overdue · was due ${dueInfo.label}` : `Due ${dueInfo.label}`}
              </span>
            ) : null}
            {!activeSubmission && attempts.length > 0 ? null : activeSubmission ? (
              <Badge status={activeSubmission.status}>
                {SUBMISSION_STATUS_LABELS[activeSubmission.status]}
              </Badge>
            ) : null}
          </div>

          <h1 id="asg-heading">{assignment.title}</h1>
        </div>

        <dl className="meta-grid">
          <div>
            <dt>Maximum marks</dt>
            <dd>{maxMarks}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{dueInfo ? dueInfo.label : '—'}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{durationMinutes ? `${durationMinutes} minutes` : 'No time limit'}</dd>
          </div>
          <div>
            <dt>Submission</dt>
            <dd>
              {activeSubmission
                ? SUBMISSION_STATUS_LABELS[activeSubmission.status]
                : reviewedAttempt
                  ? 'Reviewed'
                  : 'Not submitted'}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------- Description / Instructions ---------- */}
      {assignment.description ? (
        <Card style={{ marginTop: 'var(--space-5)' }}>
          <h3>Description</h3>
          <p style={{ margin: 0 }}>{assignment.description}</p>
        </Card>
      ) : null}

      {assignment.instructions ? (
        <Card style={{ marginTop: 'var(--space-4)' }}>
          <h3>Instructions</h3>
          <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{assignment.instructions}</p>
        </Card>
      ) : null}

      {attachmentsSection}

      {/* ---------- ACTIVE SUBMISSION PANEL ---------- */}
      {activeSubmission ? (
        <Card className="submission-panel panel-success" style={{ marginTop: 'var(--space-6)' }}>
          <h3>✓ Assignment submitted</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Submitted: {formatDate(activeSubmission.submittedAt)}
            {activeSubmission.startedAt
              ? ` · Started: ${formatDate(activeSubmission.startedAt)}`
              : ''}
            {timeTakenLabel(activeSubmission) ? ` · ${timeTakenLabel(activeSubmission)}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge status={activeSubmission.status}>
              {SUBMISSION_STATUS_LABELS[activeSubmission.status]}
            </Badge>
            {activeSubmission.isLate ? (
              <Badge status="late">Late submission</Badge>
            ) : null}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
            Waiting for review. You'll see marks and feedback here once your reviewer is done.
          </p>
          {activeSubmission.githubRepositoryName || activeSubmission.githubRepositoryUrl ? (
            <div className="github-submission-summary">
              {activeSubmission.githubRepositoryName ? <p>{activeSubmission.githubRepositoryName}</p> : null}
              {activeSubmission.githubRepositoryUrl ? (
                <a href={activeSubmission.githubRepositoryUrl} target="_blank" rel="noopener noreferrer">
                  {activeSubmission.githubRepositoryUrl}
                </a>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* ---------- REVIEWED RESULTS ---------- */}
      {reviewedAttempt && !activeSubmission ? (
        <Card className="submission-panel panel-success fade-in" style={{ marginTop: 'var(--space-6)' }}>
          <h3>Assignment reviewed</h3>
          <p className="review-marks">
            <span className="grad-text" style={{ fontSize: 'var(--font-size-h1)', fontWeight: 800 }}>
              {reviewedAttempt.marks}
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}> / {maxMarks}</span>
          </p>
          {reviewedAttempt.feedback ? (
            <blockquote className="feedback-block">{reviewedAttempt.feedback}</blockquote>
          ) : null}
          <p className="text-meta" style={{ margin: 0 }}>
            Reviewed {formatDate(reviewedAttempt.reviewedAt)}
          </p>
        </Card>
      ) : null}

      {/* ---------- RESUBMIT CTA ---------- */}
      {canSubmitNew ? (
        <Card style={{ marginTop: 'var(--space-6)' }} variant="card-elevated">
          <h3>Submit a new attempt</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {attempts.length > 0
              ? 'Your previous submission is preserved in your submission history.'
              : 'Review the instructions, then start when you are ready.'}
            {' '}This will be attempt #{nextAttemptNumber}.
          </p>
          <Button onClick={() => setView('instructions')}>
            {attempts.length > 0 ? 'Review instructions & start' : 'Start Assignment'}
          </Button>
        </Card>
      ) : null}

      {/* ---------- HISTORY ---------- */}
      {attempts.length > 0 ? (
        <section aria-labelledby="history-heading" style={{ marginTop: 'var(--space-8)' }}>
          <h3 id="history-heading" className="text-h4">Submission history</h3>
          <ol style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {[...attempts].reverse().map((attempt, reverseIndex) => (
              <li key={attempt.id} className="card history-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      Attempt #{attempt.attemptNumber}
                      {reverseIndex === 0 ? ' · latest' : ''}
                    </p>
                    <p className="text-meta" style={{ margin: 0 }}>
                      {attempt.startedAt ? `Started ${formatDate(attempt.startedAt)} · ` : ''}
                      Submitted {formatDate(attempt.submittedAt)}
                      {timeTakenLabel(attempt) ? ` · ${timeTakenLabel(attempt)}` : ''}
                      {attempt.marks !== null && attempt.marks !== undefined ? ` · ${attempt.marks}/${maxMarks}` : ''}
                    </p>
                  </div>
                  <Badge status={attempt.status}>
                    {SUBMISSION_STATUS_LABELS[attempt.status] || attempt.status}
                  </Badge>
                </div>
                {attempt.feedback ? (
                  <p className="text-sm feedback-inline">💬 {truncateFeedback(attempt.feedback)}</p>
                ) : null}
                {attempt.githubRepositoryName || attempt.githubRepositoryUrl ? (
                  <p className="text-sm feedback-inline">
                    {attempt.githubRepositoryName}
                    {attempt.githubRepositoryUrl ? ` · ${attempt.githubRepositoryUrl}` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}

function lateWarningShown(dueInfo) {
  return Boolean(dueInfo?.overdue);
}

function truncateFeedback(text) {
  const value = String(text || '');
  return value.length > 140 ? `${value.slice(0, 140)}…` : value;
}

function timeTakenLabel(row) {
  if (!row?.startedAt || !row?.submittedAt) return '';
  const minutes = Math.max(
    0,
    Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 60000)
  );
  return `Time taken ${minutes} min`;
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}
