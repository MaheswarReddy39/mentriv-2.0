import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const toast = useToast();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState(null); // newest first
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Submission form state
  const [showForm, setShowForm] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [githubRepositoryName, setGithubRepositoryName] = useState('');
  const [githubRepositoryUrl, setGithubRepositoryUrl] = useState('');
  const [githubErrors, setGithubErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);
    try {
      const res = await getAssignmentById(assignmentId);
      setAssignment(res.data.assignment);

      const subs = await getMySubmissions({ assignmentId, limit: 50 });
      setSubmissions(subs.data.submissions);
    } catch (err) {
      if (err.statusCode === 403) setForbidden(true);
      else if (err.statusCode === 404) setNotFound(true);
      else setError(err.message || 'Failed to load this assignment');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const attempts = submissions || [];
  const activeSubmission = attempts.find((s) => s.status === 'submitted' || s.status === 'late') || null;
  const latestAttempt = attempts[0] || null;
  const reviewedAttempt = attempts.find((s) => s.status === 'reviewed') || null;
  const canSubmitNew = !activeSubmission;

  const dueInfo = useMemo(() => {
    if (!assignment?.dueDate) return null;
    const due = new Date(assignment.dueDate);
    const overdue = Date.now() > due.getTime();
    return { due, label: formatDate(due), overdue };
  }, [assignment?.dueDate]);

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

  const attachmentsValid = attachments.every(
    (row) => row.title.trim().length > 0 && row.url.trim().length > 0 && !/\s/.test(row.url.trim())
  );

  const submitFinal = async () => {
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
      await createSubmission(assignmentId, payload);

      toast.success('Assignment submitted successfully.');
      setShowForm(false);
      setSubmissionText('');
      setGithubRepositoryName('');
      setGithubRepositoryUrl('');
      setGithubErrors({});
      setAttachments([]);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not submit the assignment. Please try again.');
      await loadData();
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <Loading label="Loading assignmentâ€¦" />;

  if (forbidden) {
    return (
      <>
        <Link to="/my-courses" className="back-link">â† Back to My Courses</Link>
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
        <Link to="/my-courses" className="back-link">â† Back to My Courses</Link>
        <ErrorState title="Assignment not found" message="This assignment may have been removed." />
      </>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const courseIdForBack = assignment.courseId;
  const maxMarks = Number(assignment.maxMarks);

  return (
    <>
      <Link to={`/courses/${courseIdForBack}/learn`} className="back-link">
        â† Back to course
      </Link>

      {/* ---------- Header ---------- */}
      <section className="asg-head fade-in" aria-labelledby="asg-heading">
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <Badge status="published">Published</Badge>
            {dueInfo ? (
              <span className={`badge ${dueInfo.overdue ? 'badge-danger' : 'badge-warning'}`}>
                {dueInfo.overdue ? `Overdue Â· was due ${dueInfo.label}` : `Due ${dueInfo.label}`}
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
            <dd>{dueInfo ? dueInfo.label : 'â€”'}</dd>
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

      {Array.isArray(assignment.attachments) && assignment.attachments.length > 0 ? (
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
                <span aria-hidden="true">ðŸ“„</span>
                <span style={{ flex: 1 }}>{attachment.title}</span>
                <span className="link-arrow text-sm">Open</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- ACTIVE SUBMISSION PANEL ---------- */}
      {activeSubmission ? (
        <Card className="submission-panel panel-success" style={{ marginTop: 'var(--space-6)' }}>
          <h3>âœ“ Assignment submitted</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Submitted: {formatDate(activeSubmission.submittedAt)}
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

      {/* ---------- SUBMISSION FORM / RESUBMIT CTA ---------- */}
      {canSubmitNew ? (
        attempts.length > 0 && !showForm ? (
          <Card style={{ marginTop: 'var(--space-6)' }} variant="card-elevated">
            <h3>Submit a new attempt</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your previous submission is preserved in your submission history.
              This will be attempt #{attempts.length + 1}.
            </p>
            <Button onClick={() => setShowForm(true)}>Start new attempt</Button>
          </Card>
        ) : showForm || attempts.length === 0 ? (
          <Card style={{ marginTop: 'var(--space-6)' }}>
            <h3>{attempts.length > 0 ? `Attempt #${attempts.length + 1}` : 'Ready to submit?'}</h3>
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
              placeholder="Describe your approach, paste links to repos or docs, or summarize what you builtâ€¦"
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
              <Button onClick={() => setConfirmOpen(true)} loading={false}>
                Submit assignment
              </Button>
              {attempts.length > 0 ? (
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              ) : null}
            </div>

            {lateWarningShown(dueInfo) ? (
              <p className="late-note">âš  This assignment is past its due date â€” it will be marked as a late submission.</p>
            ) : null}
          </Card>
        ) : null
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
                      {reverseIndex === 0 ? ' Â· latest' : ''}
                    </p>
                    <p className="text-meta" style={{ margin: 0 }}>
                      Submitted {formatDate(attempt.submittedAt)}
                      {attempt.marks !== null ? ` Â· ${attempt.marks}/${maxMarks}` : ''}
                    </p>
                  </div>
                  <Badge status={attempt.status}>
                    {SUBMISSION_STATUS_LABELS[attempt.status] || attempt.status}
                  </Badge>
                </div>
                {attempt.feedback ? (
                  <p className="text-sm feedback-inline">ðŸ’¬ {truncateFeedback(attempt.feedback)}</p>
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

      <ConfirmDialog
        open={confirmOpen}
        title="Submit this assignment?"
        message="Make sure your work is ready before submitting."
        confirmLabel="Submit assignment"
        cancelLabel="Cancel"
        loading={submitting}
        onConfirm={submitFinal}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function lateWarningShown(dueInfo) {
  return Boolean(dueInfo?.overdue);
}

function truncateFeedback(text) {
  const value = String(text || '');
  return value.length > 140 ? `${value.slice(0, 140)}â€¦` : value;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} Â· ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}
