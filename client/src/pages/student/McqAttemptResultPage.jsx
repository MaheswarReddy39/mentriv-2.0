import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMcqTestById, getAttemptById } from '../../services/mcq.service.js';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

export default function McqAttemptResultPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await getAttemptById(attemptId);
        if (cancelled) return;
        setAttempt(res.data.attempt);

        if (res.data.attempt.mcqTestId) {
          const testRes = await getMcqTestById(res.data.attempt.mcqTestId);
          if (!cancelled) setTest(testRes.data.mcqTest);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load this result');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [attemptId]);

  const questionByOrder = useMemo(() => {
    const map = new Map();
    for (const q of test?.questions || []) map.set(q.order, q);
    return map;
  }, [test]);

  if (loading) return <Loading label="Loading resultâ€¦" />;

  if (error) {
    return (
      <>
        <Link to="/my-courses" className="back-link">â† Back</Link>
        <ErrorState message={error} />
      </>
    );
  }

  const evaluated = attempt.status === 'evaluated';
  const passed = Boolean(attempt.passed);

  return (
    <>
      <Link to="/my-courses" className="back-link">â† Back to My Courses</Link>

      {/* ---------- Result summary ---------- */}
      <section className={`result-hero ${passed ? 'result-pass' : 'result-fail'} fade-in`} aria-labelledby="result-heading">
        {evaluated ? (
          <>
            <p className="text-meta uppercase">{passed ? 'Passed ðŸŽ‰' : 'Not passed this time'}</p>
            <p className="result-percentage">{attempt.percentage}%</p>
            <p className="result-score">
              {attempt.score} / {attempt.totalMarks} marks
              {' Â· '}Attempt #{attempt.attemptNumber}
              {' Â· '}{new Date(attempt.submittedAt).toLocaleString('en-IN')}
            </p>
          </>
        ) : (
          <>
            <h2 id="result-heading">Attempt in progress</h2>
            <p>Submit the attempt to see your evaluation here.</p>
          </>
        )}
      </section>

      {/* ---------- Question-wise results ---------- */}
      {evaluated ? (
        <section aria-labelledby="qwise-heading" style={{ marginTop: 'var(--space-8)' }}>
          <h2 id="qwise-heading" className="text-h3">Question results</h2>
          <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {(test?.questions || []).map((question) => {
              const given = (attempt.answers || []).find(
                (a) => a.questionOrder === question.order
              );
              const selectedOption =
                given && given.selectedOption !== null && given.selectedOption !== undefined
                  ? question.options[given.selectedOption]
                  : null;
              const marksAwarded = given ? given.marksAwarded : 0;
              const isCorrect = marksAwarded > 0 && selectedOption !== null;

              return (
                <Card key={question.order}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <p className="text-meta uppercase" style={{ margin: 0 }}>
                      Question {question.order + 1} Â· {question.marks} mark{question.marks === 1 ? '' : 's'}
                    </p>
                    <Badge status={isCorrect ? 'reviewed' : 'pending'}>
                      {isCorrect ? 'âœ“ Correct' : selectedOption === null ? 'â€” Not answered' : 'âœ• Incorrect'}
                    </Badge>
                  </div>

                  <h4 className="text-h4" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                    {question.question}
                  </h4>

                  <p className="text-sm" style={{ margin: 0 }}>
                    Your answer:{' '}
                    <strong>
                      {selectedOption === null ? 'Not answered' : selectedOption}
                    </strong>
                  </p>

                  {!isCorrect && selectedOption !== null ? (
                    <p className="text-sm" style={{ color: 'var(--coral-dark)' }}>
                      âœ• Incorrect â€” see explanation below.
                    </p>
                  ) : null}

                  {question.explanation ? (
                    <div className="feedback-block" style={{ marginTop: 'var(--space-3)' }}>
                      <p className="text-meta" style={{ margin: 0 }}>Explanation</p>
                      <p className="text-sm" style={{ margin: 0 }}>{question.explanation}</p>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
