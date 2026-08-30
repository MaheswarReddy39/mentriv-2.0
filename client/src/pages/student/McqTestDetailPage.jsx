import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMcqTestById, getMyAttempts, startAttempt } from '../../services/mcq.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

export default function McqTestDetailPage() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const testRes = await getMcqTestById(testId);
        if (cancelled) return;
        setTest(testRes.data.mcqTest);

        const attemptsRes = await getMyAttempts({ mcqTestId: testId, limit: 50 });
        if (!cancelled) setAttempts(attemptsRes.data.attempts);
      } catch (err) {
        if (!cancelled) {
          if (err.statusCode === 403) setForbidden(true);
          else if (err.statusCode === 404) setError('MCQ test not found.');
          else setError(err.message || 'Failed to load this test');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [testId]);

  const inProgress = attempts.find((a) => a.status === 'in_progress') || null;
  const latestEvaluated = attempts.find((a) => a.status === 'evaluated') || null;

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await startAttempt(testId);
      const attemptId = res.data.attempt.id;
      navigate(`/mcq-tests/${testId}/attempts/${attemptId}`);
    } catch (err) {
      if (err.statusCode === 403) setForbidden(true);
      else setError(err.message || 'Could not start the attempt. Please try again.');
      setStarting(false);
    }
  };

  if (loading) return <Loading label="Loading testâ€¦" />;

  if (forbidden) {
    return (
      <>
        <Link to="/my-courses" className="back-link">â† Back</Link>
        <ErrorState
          title="You don't have access to this test"
          message="An approved enrollment for this course is required."
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Link to="/my-courses" className="back-link">â† Back</Link>
        <ErrorState message={error} />
      </>
    );
  }

  const questionCount = test.questions.length;

  return (
    <>
      <Link to="/my-courses" className="back-link">â† Back to My Courses</Link>

      <section className="asg-head fade-in" aria-labelledby="test-heading">
        <h1 id="test-heading">{test.title}</h1>
        {test.description ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>{test.description}</p>
        ) : null}

        <dl className="meta-grid" style={{ marginTop: 'var(--space-5)' }}>
          <div><dt>Questions</dt><dd>{questionCount}</dd></div>
          <div><dt>Duration</dt><dd>{test.duration > 0 ? `${test.duration} min` : 'No limit'}</dd></div>
          <div><dt>Passing score</dt><dd>{test.passingScore}%</dd></div>
          <div><dt>Attempts used</dt><dd>{attempts.length}</dd></div>
        </dl>
      </section>

      {inProgress ? (
        <Card variant="card-elevated" style={{ marginTop: 'var(--space-6)' }}>
          <div className="glass-row">
            <span className="glass-icon gi-indigo">â–¶</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>Attempt in progress</h3>
              <p className="glass-sub">Resume where you left off.</p>
            </div>
          </div>
          <Button
            style={{ marginTop: 'var(--space-4)' }}
            onClick={() => navigate(`/mcq-tests/${testId}/attempts/${inProgress.id}`)}
          >
            Resume Test
          </Button>
        </Card>
      ) : (
        <Card style={{ marginTop: 'var(--space-6)' }}>
          <h3>Instructions</h3>
          <ul style={{ display: 'grid', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            <li>Â· Answer every question â€” unanswered questions score zero.</li>
            {test.duration > 0 ? <li>Â· You have {test.duration} minutes once you start.</li> : null}
            <li>Â· You need at least {test.passingScore}% to pass.</li>
            <li>Â· Answers are evaluated automatically on submission.</li>
          </ul>

          <Button onClick={handleStart} loading={starting} style={{ marginTop: 'var(--space-5)' }}>
            Start Test
          </Button>
        </Card>
      )}

      {/* Attempt history */}
      <section aria-labelledby="history-heading" style={{ marginTop: 'var(--space-8)' }}>
        <h3 id="history-heading" className="text-h4">Attempt history</h3>

        {attempts.length === 0 ? (
          <p className="text-meta">No attempts yet.</p>
        ) : (
          <ol style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            {[...attempts]
              .sort((a, b) => b.attemptNumber - a.attemptNumber)
              .map((attempt) => (
                <li key={attempt.id}>
                  <Link
                    to={`/mcq-attempts/${attempt.id}`}
                    className="card history-item asg-row"
                    style={{ display: 'flex' }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>Attempt #{attempt.attemptNumber}</p>
                      <p className="text-meta" style={{ margin: 0 }}>
                        {attempt.status === 'evaluated'
                          ? `Score ${attempt.score}/${attempt.totalMarks} Â· ${attempt.percentage}%`
                          : `Started ${new Date(attempt.startedAt).toLocaleDateString('en-IN')}`}
                      </p>
                    </div>
                    <Badge status={attempt.status}>{attempt.status.replace('_', ' ')}</Badge>
                    <span aria-hidden="true">â†’</span>
                  </Link>
                </li>
              ))}
          </ol>
        )}
      </section>

      {latestEvaluated ? (
        <p className="text-meta" style={{ marginTop: 'var(--space-4)' }}>
          Last result: {latestEvaluated.score}/{latestEvaluated.totalMarks} ({latestEvaluated.percentage}%)
        </p>
      ) : null}
    </>
  );
}
