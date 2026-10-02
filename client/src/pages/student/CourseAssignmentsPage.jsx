import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import {
  getAttemptById,
  getMyAttempts,
  listCourseMcqTests,
  startAttempt,
  submitAttempt,
} from '../../services/mcq.service.js';
import { completeMcqTest } from '../../services/progress.service.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const optionLetter = (index) => String.fromCharCode(65 + index);

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const getOptionText = (question, optionIndex) => {
  if (optionIndex === null || optionIndex === undefined) return 'Not answered';
  return question?.options?.[optionIndex] || `Option ${optionLetter(optionIndex)}`;
};

const buildResult = (test, attemptOrResult) => {
  const sourceRows = attemptOrResult?.results || attemptOrResult?.answers || [];
  const resultByOrder = new Map(sourceRows.map((row) => [Number(row.questionOrder), row]));
  const rows = (test?.questions || []).map((question) => {
    const result = resultByOrder.get(Number(question.order)) || {};
    return {
      ...question,
      selectedOption: result.selectedOption ?? null,
      correctOption: result.correctOption ?? null,
      isCorrect: Boolean(result.isCorrect),
    };
  });
  const correct = rows.filter((row) => row.isCorrect).length;
  const wrong = rows.length - correct;
  const percentage =
    attemptOrResult?.percentage !== undefined
      ? attemptOrResult.percentage
      : rows.length > 0
        ? Math.round((correct / rows.length) * 100)
        : 0;

  return { rows, correct, wrong, percentage };
};

const sortQuestions = (questions = []) =>
  [...questions].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const formatClock = (totalMs) => {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

export default function CourseAssignmentsPage() {
  const { courseId: routeCourseId } = useParams();
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [resultSource, setResultSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  // Instructions screen first; questions (and the countdown) only after Start Assignment.
  const [phase, setPhase] = useState('instructions'); // 'instructions' | 'quiz'
  const [remainingMs, setRemainingMs] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const autoSubmittedRef = useRef(false);
  const submitRef = useRef(null);

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubmitError(null);
    setStartError(null);

    try {
      const enrollmentRes = await getMyEnrollments({ limit: 50 });
      const activeEnrollments = (enrollmentRes?.data?.enrollments || []).filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );

      const enrollment = routeCourseId
        ? activeEnrollments.find((item) => getCourseId(item) === routeCourseId)
        : activeEnrollments[0];

      setSelectedEnrollment(enrollment || null);

      const courseId = getCourseId(enrollment);
      if (!courseId) {
        setAssignment(null);
        setAttempt(null);
        setResultSource(null);
        setSubmitted(false);
        setPhase('instructions');
        setRemainingMs(null);
        return;
      }

      const [testsRes, attemptsRes] = await Promise.all([
        listCourseMcqTests(courseId),
        getMyAttempts({ limit: 50 }).catch(() => ({ data: { attempts: [] } })),
      ]);
      const tests = testsRes?.data?.mcqTests || [];
      const testIds = new Set(tests.map((test) => test.id));
      const attemptMap = new Map();
      (attemptsRes?.data?.attempts || [])
        .filter((item) => testIds.has(item.test?.id || item.mcqTestId))
        .forEach((item) => {
          const testId = item.test?.id || item.mcqTestId;
          if (!attemptMap.has(testId)) {
            attemptMap.set(testId, []);
          }
          attemptMap.get(testId).push(item);
        });
      const nextTest =
        tests.find((test) => !(attemptMap.get(test.id) || []).some((item) => item.status === 'evaluated')) ||
        tests[0] ||
        null;

      setAssignment(nextTest ? { ...nextTest, questions: sortQuestions(nextTest.questions) } : null);
      setCurrentIndex(0);
      setSelectedAnswers({});

      const existingAttempts = nextTest ? attemptMap.get(nextTest.id) || [] : [];
      const evaluatedAttempt = existingAttempts.find((item) => item.status === 'evaluated');
      const inProgressAttempt = existingAttempts.find((item) => item.status === 'in_progress');

      if (evaluatedAttempt) {
        const detailRes = await getAttemptById(evaluatedAttempt.id);
        setAttempt(detailRes?.data?.attempt || evaluatedAttempt);
        setResultSource(detailRes?.data?.attempt || evaluatedAttempt);
        setSubmitted(true);
        setPhase('instructions');
      } else if (inProgressAttempt) {
        // Resume a running attempt without restarting the countdown: the server
        // startedAt timestamp survives refreshes, so the timer keeps counting down.
        const detailRes = await getAttemptById(inProgressAttempt.id).catch(() => null);
        setAttempt(detailRes?.data?.attempt || inProgressAttempt);
        setResultSource(null);
        setSubmitted(false);
        setPhase('quiz');
      } else {
        setAttempt(null);
        setResultSource(null);
        setSubmitted(false);
        setPhase('instructions');
      }
      autoSubmittedRef.current = false;
      setRemainingMs(null);
    } catch (err) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [routeCourseId]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const questions = assignment?.questions || [];
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.order] : undefined;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const courseTitle = selectedEnrollment?.course?.title || 'Selected Course';
  const durationMinutes = Number(assignment?.duration || 0);
  const durationMs = durationMinutes > 0 ? durationMinutes * 60000 : 0;
  const startedMs = attempt?.startedAt ? new Date(attempt.startedAt).getTime() : null;
  const timerActive = durationMs > 0 && startedMs !== null && !Number.isNaN(startedMs);
  const timerClass =
    remainingMs === null || remainingMs > durationMs * 0.2
      ? 'timer-normal'
      : remainingMs > Math.max(10000, durationMs * 0.1)
        ? 'timer-amber'
        : 'timer-coral';

  const result = useMemo(
    () => buildResult(assignment, resultSource),
    [assignment, resultSource]
  );

  const selectAnswer = (optionIndex) => {
    if (submitted || !currentQuestion) return;
    setSelectedAnswers((current) => ({
      ...current,
      [currentQuestion.order]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (submitted || submitting || !assignment) return;

    setSubmitting(true);
    setSubmitError(null);

    const payloadAnswers = questions.map((question) => ({
      questionOrder: question.order,
      selectedOption:
        selectedAnswers[question.order] === undefined
          ? null
          : selectedAnswers[question.order],
    }));

    try {
      const activeAttempt = attempt?.id
        ? attempt
        : (await startAttempt(assignment.id))?.data?.attempt;

      const submitRes = await submitAttempt(activeAttempt.id, payloadAnswers);
      const evaluatedResult = submitRes?.data?.result || submitRes?.data;
      setAttempt({ ...activeAttempt, status: 'evaluated' });
      setResultSource(evaluatedResult);
      setSubmitted(true);

      const courseId = getCourseId(selectedEnrollment);
      if (courseId) {
        try {
          await completeMcqTest(courseId, assignment.id);
        } catch {
          // The attempt result is saved; existing progress reads can still recalculate later.
        }
      }
    } catch (err) {
      setSubmitError(err.message || 'Could not submit this assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  submitRef.current = handleSubmit;

  // Countdown: based on the server-recorded startedAt so it survives refreshes
  // without restarting; auto-submits exactly once when the time runs out.
  useEffect(() => {
    if (submitted || phase !== 'quiz' || !timerActive) {
      setRemainingMs(null);
      return undefined;
    }

    const tick = () => {
      const remaining = startedMs + durationMs - Date.now();
      setRemainingMs(Math.max(remaining, 0));
      if (remaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        toast.warning('Time is up — submitting your assignment now.');
        submitRef.current?.();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [submitted, phase, timerActive, startedMs, durationMs, toast]);

  const handleStart = async () => {
    if (starting || !assignment) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await startAttempt(assignment.id);
      setAttempt(res?.data?.attempt || null);
      autoSubmittedRef.current = false;
      setRemainingMs(null);
      setCurrentIndex(0);
      setPhase('quiz');
    } catch (err) {
      setStartError(err.message || 'Could not start this assignment.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="admin-dashboard student-assignments-page fade-in">
      <header className="admin-dashboard-header">
        <div>
          <h1>Assignments</h1>
        </div>
      </header>

      {loading ? (
        <div className="student-assignment-list" aria-hidden="true">
          <div className="card">
            <Skeleton height="1.4rem" width="55%" />
            <Skeleton height="0.85rem" width="35%" style={{ marginTop: 'var(--space-3)' }} />
            <Skeleton height="0.9rem" width="85%" style={{ marginTop: 'var(--space-5)' }} />
            <Skeleton height="0.9rem" width="75%" style={{ marginTop: 'var(--space-3)' }} />
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadAssignment} />
      ) : !assignment ? (
        <EmptyState title="No assignments" message="MCQ assignments will appear here." />
      ) : questions.length === 0 ? (
        <EmptyState title="No questions" message="This assignment does not have questions yet." />
      ) : (
        <section className="student-assignment-list" aria-label="Assignments">
          <Card variant="student-assignment-card student-mcq-assignment-card">
            <div className="student-assignment-card-head">
              <div>
                <h2>{assignment.title}</h2>
                <div className="student-assignment-meta">
                  <span>{courseTitle}</span>
                  <Badge status="info">MCQ</Badge>
                </div>
              </div>
              {submitted ? <Badge status="submitted">Submitted</Badge> : null}
            </div>

            {!submitted && phase === 'instructions' ? (
              <div className="student-mcq-instructions">
                <h3>Instructions</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {assignment.description ||
                    'Read each question carefully. You can change your answers before submitting.'}
                </p>

                <dl className="meta-grid" style={{ marginTop: 'var(--space-4)' }}>
                  <div>
                    <dt>Duration</dt>
                    <dd>{durationMinutes ? `${durationMinutes} minutes` : 'No time limit'}</dd>
                  </div>
                  <div>
                    <dt>Due date</dt>
                    <dd>No due date</dd>
                  </div>
                  <div>
                    <dt>Questions</dt>
                    <dd>{questions.length}</dd>
                  </div>
                </dl>

                {startError ? (
                  <p className="form-error" role="alert">
                    {startError}
                  </p>
                ) : null}

                <Button
                  type="button"
                  onClick={handleStart}
                  loading={starting}
                  disabled={starting}
                  style={{ marginTop: 'var(--space-5)' }}
                >
                  Start Assignment
                </Button>
              </div>
            ) : !submitted ? (
              <div className="student-mcq-flow">
                {durationMs > 0 && remainingMs !== null ? (
                  <div
                    className={`attempt-timer ${timerClass}`}
                    role="timer"
                    aria-label="Time remaining"
                    style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}
                  >
                    ⏱ {formatClock(remainingMs)} remaining
                  </div>
                ) : null}

                <div className="student-mcq-question-top">
                  <p className="text-meta uppercase">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                </div>

                <fieldset className="student-assignment-question">
                  <legend>{currentQuestion.question}</legend>
                  <div className="student-assignment-options">
                    {currentQuestion.options.map((option, optionIndex) => {
                      const selected = currentAnswer === optionIndex;
                      return (
                        <label
                          key={`${currentQuestion.order}-${optionIndex}`}
                          className={`option-row${selected ? ' selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.order}`}
                            checked={selected}
                            onChange={() => selectAnswer(optionIndex)}
                          />
                          <span className="option-letter" aria-hidden="true">
                            {optionLetter(optionIndex)}
                          </span>
                          <span className="option-text">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {submitError ? (
                  <p className="form-error" role="alert">
                    {submitError}
                  </p>
                ) : null}

                <div className="student-mcq-nav">
                  {isFirstQuestion ? (
                    <span />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                    >
                      ← Back
                    </Button>
                  )}

                  {isLastQuestion ? (
                    <Button type="button" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
                    >
                      {isFirstQuestion ? 'Next' : 'Next →'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="student-mcq-result">
                <div className="student-mcq-result-summary">
                  <div>
                    <p className="admin-stat-value stat-teal">{result.correct}</p>
                    <p className="admin-stat-label">Correct</p>
                  </div>
                  <div>
                    <p className="admin-stat-value stat-coral">{result.wrong}</p>
                    <p className="admin-stat-label">Wrong</p>
                  </div>
                  <div>
                    <p className="admin-stat-value stat-indigo">{result.percentage}%</p>
                    <p className="admin-stat-label">Progress</p>
                  </div>
                </div>
                <ProgressBar value={result.percentage} label={`${result.percentage}% complete`} />

                <div className="student-mcq-result-list">
                  {result.rows.map((row, index) => {
                    const selectedText = getOptionText(row, row.selectedOption);
                    const correctText =
                      row.correctOption === null || row.correctOption === undefined
                        ? 'Not available'
                        : getOptionText(row, row.correctOption);
                    return (
                      <article key={row.order} className="student-mcq-result-row">
                        <div className="student-mcq-result-row-head">
                          <h3>{index + 1}. {row.question}</h3>
                          <Badge status={row.isCorrect ? 'reviewed' : 'rejected'}>
                            {row.isCorrect ? 'Correct' : 'Wrong'}
                          </Badge>
                        </div>
                        <p>
                          <strong>Selected answer:</strong> {selectedText}
                        </p>
                        <p>
                          <strong>Correct answer:</strong> {correctText}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
