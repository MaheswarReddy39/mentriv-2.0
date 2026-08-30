import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMcqTestById, getAttemptById, submitAttempt } from '../../services/mcq.service.js';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AttemptWorkspacePage() {
  const { testId, attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local selections: questionOrder -> selectedOption | null
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmittedRef = useRef(false);

  const questions = test?.questions || [];
  const currentQuestion = questions[currentIdx];
  const currentSelection =
    currentQuestion && answers[currentQuestion.order] !== undefined
      ? answers[currentQuestion.order]
      : null;

  const answeredCount = questions.filter(
    (q) => answers[q.order] !== null && answers[q.order] !== undefined
  ).length;
  const unanswered = questions.length - answeredCount;

  /* ---------------- Load attempt + test ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const attRes = await getAttemptById(attemptId);
        if (cancelled) return;
        setAttempt(attRes.data.attempt);

        if (attRes.data.attempt.mcqTestId) {
          const testRes = await getMcqTestById(attRes.data.attempt.mcqTestId);
          if (!cancelled) setTest(testRes.data.mcqTest);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load the attempt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [attemptId]);

  /* ---------------- Timer ---------------- */
  const durationSeconds = Number(test?.duration || 0) * 60;
  const startedMs = attempt?.startedAt ? new Date(attempt.startedAt).getTime() : null;
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (durationSeconds <= 0 || !startedMs) return undefined;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [durationSeconds, startedMs]);

  const remainingSeconds =
    durationSeconds > 0 && startedMs
      ? Math.max(0, durationSeconds - Math.floor((Date.now() - startedMs) / 1000))
      : null;

  const timerClass =
    remainingSeconds === null
      ? ''
      : remainingSeconds <= Math.max(10, Math.floor(durationSeconds * 0.1))
        ? 'timer-coral'
        : remainingSeconds <= Math.floor(durationSeconds * 0.2)
          ? 'timer-amber'
          : 'timer-normal';

  /* ---------------- Submission ---------------- */
  const doSubmitRef = useRef(() => {});

  const doSubmit = async () => {
    if (submitting || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setSubmitting(true);

    const payloadAnswers = questions.map((q) => ({
      questionOrder: q.order,
      selectedOption:
        answers[q.order] === undefined || answers[q.order] === null
          ? null
          : answers[q.order],
    }));

    try {
      await submitAttempt(attemptId, payloadAnswers);
      navigate(`/mcq-attempts/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Could not submit the test.');
      autoSubmittedRef.current = false;
      setSubmitting(false);
    }
  };

  doSubmitRef.current = doSubmit;

  // Auto-submit when time expires (once)
  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      durationSeconds > 0 &&
      attempt?.status === 'in_progress' &&
      !autoSubmittedRef.current
    ) {
      doSubmitRef.current();
    }
  }, [remainingSeconds, attempt, durationSeconds]);

  // Warn before leaving with an active attempt
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [attempt]);

  /* ---------------- Render ---------------- */

  if (loading) return <Loading label="Preparing your testâ€¦" />;

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  if (attempt.status !== 'in_progress') {
    return (
      <>
        <Link to={`/mcq-tests/${testId}`} className="back-link">â† Back to test</Link>
        <ErrorState
          title="This attempt is already submitted"
          message="View your result from the test page or attempt history."
        />
      </>
    );
  }

  return (
    <>
      <header className="attempt-head" aria-label="Test progress">
        <div>
          <p className="text-meta uppercase">{test.title}</p>
          <h1 className="text-h3" style={{ margin: 0 }}>
            Question {currentIdx + 1} of {questions.length}
          </h1>
        </div>

        {remainingSeconds !== null ? (
          <div className={`attempt-timer ${timerClass}`} role="timer">
            â± {formatClock(remainingSeconds)} remaining
          </div>
        ) : null}
      </header>

      <div className="attempt-layout">
        <section className="question-panel fade-in" aria-label={`Question ${currentIdx + 1}`}>
          {currentQuestion ? (
            <>
              <p className="text-meta uppercase" style={{ marginBottom: 'var(--space-2)' }}>
                {currentQuestion.marks} mark{currentQuestion.marks === 1 ? '' : 's'}
              </p>
              <h2 className="question-text">{currentQuestion.question}</h2>

              <fieldset style={{ border: 'none', display: 'grid', gap: 'var(--space-3)' }}>
                <legend className="sr-only">Options</legend>
                {currentQuestion.options.map((option, optionIndex) => {
                  const selected = currentSelection === optionIndex;
                  return (
                    <label key={optionIndex} className={`option-row${selected ? ' selected' : ''}`}>
                      <input
                        type="radio"
                        name={`q-${currentQuestion.order}`}
                        checked={selected}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [currentQuestion.order]: optionIndex }))
                        }
                      />
                      <span className="option-letter" aria-hidden="true">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="option-text">{option}</span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="question-nav">
                <Button
                  variant="secondary"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                >
                  Previous
                </Button>

                {currentIdx < questions.length - 1 ? (
                  <Button onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmOpen(true)}>Submit Test</Button>
                )}
              </div>
            </>
          ) : (
            <EmptyState title="No questions in this test yet" />
          )}
        </section>

        <aside className="navigator card" aria-label="Question navigator">
          <p className="text-meta uppercase" style={{ margin: 0 }}>
            Progress Â· {answeredCount}/{questions.length} answered
          </p>

          <div className="nav-grid">
            {questions.map((question, index) => {
              const isAnswered = answers[question.order] !== null && answers[question.order] !== undefined;
              const state = index === currentIdx ? ' current' : '';
              return (
                <button
                  key={question.order}
                  type="button"
                  className={`qn${isAnswered ? ' answered' : ''}${state}`}
                  aria-current={index === currentIdx ? 'true' : undefined}
                  aria-label={`Go to question ${index + 1}`}
                  onClick={() => setCurrentIdx(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <Button variant="primary" style={{ width: '100%' }} onClick={() => setConfirmOpen(true)}>
            Submit Test
          </Button>

          <p className="text-meta" style={{ marginTop: 'var(--space-3)', color: 'var(--text-tertiary)' }}>
            Unanswered questions score zero.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit test?"
        message={
          unanswered > 0
            ? `You have answered ${answeredCount} of ${questions.length} questions. You still have ${unanswered} unanswered.`
            : `You have answered all ${questions.length} questions.`
        }
        confirmLabel="Submit test"
        cancelLabel="Continue test"
        loading={submitting}
        onConfirm={doSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
