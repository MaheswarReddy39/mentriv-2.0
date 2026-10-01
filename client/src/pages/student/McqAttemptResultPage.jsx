import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAttemptById, getMcqTestById } from '../../services/mcq.service.js';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { decodeDescription } from '../../utils/practiceLevels.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const optionLetter = (index) => String.fromCharCode(65 + Number(index));

const getOptionText = (options, optionIndex) => {
  if (optionIndex === null || optionIndex === undefined) return 'Not answered';
  return options[optionIndex] || `Option ${optionLetter(optionIndex)}`;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN') : 'Not submitted';

export default function McqAttemptResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAttemptById(attemptId);
        if (cancelled) return;
        const loadedAttempt = res.data.attempt;
        setAttempt(loadedAttempt);

        if (loadedAttempt.mcqTestId) {
          const testRes = await getMcqTestById(loadedAttempt.mcqTestId);
          if (cancelled) return;
          const loadedTest = testRes.data.mcqTest;
          setTest(loadedTest);

          try {
            const enrollmentRes = await getMyEnrollments({ limit: 50 });
            const match = (enrollmentRes?.data?.enrollments || []).find(
              (enrollment) => getCourseId(enrollment) === loadedTest.courseId
            );
            if (!cancelled) setCourseTitle(match?.course?.title || '');
          } catch {
            setCourseTitle('');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load this result');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const questions = useMemo(
    () =>
      [...(test?.questions || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [test]
  );

  const answerByOrder = useMemo(() => {
    const map = new Map();
    (attempt?.answers || []).forEach((answer) => {
      map.set(Number(answer.questionOrder), answer);
    });
    return map;
  }, [attempt]);

  if (loading) return <Loading label="Loading result..." />;

  if (error) {
    return (
      <>
        <Link to="/mcqs" className="back-link">
          &larr; Back to Practice
        </Link>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </>
    );
  }

  const evaluated = attempt.status === 'evaluated';
  const level = test ? decodeDescription(test.description).level : '';
  const passingScore = Number(test?.passingScore ?? attempt.test?.passingScore ?? 0);

  const correctCount = questions.filter((question) => {
    const answer = answerByOrder.get(Number(question.order));
    if (!answer || answer.selectedOption === null || answer.selectedOption === undefined) {
      return false;
    }
    if (answer.correctOption !== null && answer.correctOption !== undefined) {
      return Number(answer.selectedOption) === Number(answer.correctOption);
    }
    return Boolean(answer.isCorrect);
  }).length;
  const unansweredCount = questions.filter((question) => {
    const answer = answerByOrder.get(Number(question.order));
    return !answer || answer.selectedOption === null || answer.selectedOption === undefined;
  }).length;
  const wrongCount = questions.length - correctCount - unansweredCount;

  const questionTotalMarks = questions.reduce(
    (sum, question) => sum + Number(question.marks || 0),
    0
  );
  const totalMarks = questionTotalMarks > 0 ? questionTotalMarks : Number(attempt.totalMarks || 0);
  const hasAnswerRows = (attempt.answers || []).length > 0;
  const scoreFromAnswers = (attempt.answers || []).reduce(
    (sum, answer) => sum + Number(answer.marksAwarded || 0),
    0
  );
  const score = hasAnswerRows ? scoreFromAnswers : Number(attempt.score || 0);
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 10000) / 100 : 0;
  const passed = evaluated && percentage >= passingScore;

  const scrollToReview = () => {
    document.getElementById('review-answers')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRetry = () => {
    if (!attempt.mcqTestId) return;
    navigate('/mcqs', { state: { retryTestId: attempt.mcqTestId } });
  };

  return (
    <>
      <Link to="/mcqs" className="back-link">
        &larr; Back to Practice
      </Link>

      <section className="asg-head fade-in" aria-labelledby="result-heading">
        <p className="text-meta uppercase">
          {evaluated ? (passed ? 'Passed' : 'Not passed') : 'Attempt in progress'}
        </p>
        <h1 id="result-heading">{test?.title || attempt.test?.title || 'Practice result'}</h1>

        <dl className="meta-grid" style={{ marginTop: 'var(--space-5)' }}>
          <div>
            <dt>Course</dt>
            <dd>{courseTitle || 'Your course'}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>{level || 'All levels'}</dd>
          </div>
          <div>
            <dt>Passing score</dt>
            <dd>{passingScore}%</dd>
          </div>
          <div>
            <dt>Attempt number</dt>
            <dd>#{attempt.attemptNumber}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{evaluated ? formatDate(attempt.submittedAt) : 'Not submitted yet'}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>
              {score} / {totalMarks}
            </dd>
          </div>
        </dl>
      </section>

      {evaluated ? (
        <>
          <section
            className={`result-hero ${passed ? 'result-pass' : 'result-fail'} fade-in`}
            aria-label="Result summary"
          >
            <p className="text-meta uppercase">{passed ? 'Passed' : 'Not passed'}</p>
            <p className="result-percentage">{percentage}%</p>
            <p className="result-score">
              {passed ? 'PASSED' : 'NOT PASSED'} {' · '}You scored {score} out of {totalMarks}{' '}
              {' · '}Passing score {passingScore}%
            </p>

            <div style={{ maxWidth: '420px', margin: 'var(--space-5) auto 0' }}>
              <ProgressBar value={percentage} label={`Score ${score}/${totalMarks}`} />
            </div>

            <div className="student-mcq-result-summary" style={{ marginTop: 'var(--space-5)' }}>
              <div>
                <p className="admin-stat-value stat-teal">{correctCount}</p>
                <p className="admin-stat-label">Correct</p>
              </div>
              <div>
                <p className="admin-stat-value stat-coral">{wrongCount}</p>
                <p className="admin-stat-label">Wrong</p>
              </div>
              <div>
                <p className="admin-stat-value stat-indigo">{unansweredCount}</p>
                <p className="admin-stat-label">Unanswered</p>
              </div>
            </div>
          </section>

          <section
            id="review-answers"
            aria-labelledby="review-heading"
            style={{ marginTop: 'var(--space-8)' }}
          >
            <h2 id="review-heading" className="text-h3">
              Review Answers
            </h2>

            <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              {questions.map((question, index) => {
                const answer = answerByOrder.get(Number(question.order));
                const selectedIndex =
                  answer && answer.selectedOption !== null && answer.selectedOption !== undefined
                    ? Number(answer.selectedOption)
                    : null;
                const correctIndex =
                  answer && answer.correctOption !== null && answer.correctOption !== undefined
                    ? Number(answer.correctOption)
                    : null;
                const isCorrect =
                  selectedIndex !== null &&
                  (correctIndex !== null
                    ? selectedIndex === correctIndex
                    : Boolean(answer && answer.isCorrect));
                const notAnswered = selectedIndex === null;

                return (
                  <Card key={question.order}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <p className="text-meta uppercase" style={{ margin: 0 }}>
                        Question {index + 1} &middot; {question.marks} mark
                        {question.marks === 1 ? '' : 's'}
                      </p>
                      <Badge status={isCorrect ? 'reviewed' : notAnswered ? 'pending' : 'rejected'}>
                        {isCorrect ? 'Correct' : notAnswered ? 'Not answered' : 'Wrong'}
                      </Badge>
                    </div>

                    <h3 className="text-h4" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                      {question.question}
                    </h3>

                    <p className="text-sm" style={{ margin: 0 }}>
                      <strong>Your answer:</strong>{' '}
                      <span
                        style={{
                          color: isCorrect
                            ? 'var(--teal-dark, #0f766e)'
                            : notAnswered
                              ? 'var(--text-tertiary)'
                              : 'var(--coral-dark, #dc2626)',
                        }}
                      >
                        {getOptionText(question.options, selectedIndex)}
                      </span>
                    </p>

                    <p className="text-sm" style={{ margin: 'var(--space-2) 0 0' }}>
                      <strong>Correct answer:</strong>{' '}
                      {correctIndex === null
                        ? 'Unavailable'
                        : getOptionText(question.options, correctIndex)}
                    </p>

                    {answer?.explanation ? (
                      <div className="feedback-block" style={{ marginTop: 'var(--space-3)' }}>
                        <p className="text-meta" style={{ margin: 0 }}>
                          Explanation
                        </p>
                        <p className="text-sm" style={{ margin: 0 }}>
                          {answer.explanation}
                        </p>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Card>
            <h3>Attempt in progress</h3>
            <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
              Submit this attempt to see your evaluation here.
            </p>
          </Card>
        </div>
      )}

      <div
        className="student-assignment-submit"
        style={{
          marginTop: 'var(--space-6)',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {evaluated ? (
          <Button type="button" variant="outline" onClick={scrollToReview}>
            Review Answers
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleRetry}>
          Retry Practice
        </Button>
        <Link to="/mcqs" className="btn btn-secondary">
          Back to Practice
        </Link>
      </div>
    </>
  );
}
