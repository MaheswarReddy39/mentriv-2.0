import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
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

export default function CourseAssignmentsPage() {
  const { courseId: routeCourseId } = useParams();
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

  const loadAssignment = async () => {
    setLoading(true);
    setError(null);
    setSubmitError(null);

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
      } else {
        setAttempt(inProgressAttempt || null);
        setResultSource(null);
        setSubmitted(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignment();
  }, [routeCourseId]);

  const questions = assignment?.questions || [];
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.order] : undefined;
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const courseTitle = selectedEnrollment?.course?.title || 'Selected Course';

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

  if (loading) return <Loading label="Loading assignments..." />;

  return (
    <div className="admin-dashboard student-assignments-page">
      <header className="admin-dashboard-header">
        <div>
          <h1>Assignments</h1>
        </div>
      </header>

      {error ? (
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

            {!submitted ? (
              <div className="student-mcq-flow">
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
