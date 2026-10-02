import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import {
  getMyAttempts,
  listCourseMcqTests,
  startAttempt,
  submitAttempt,
} from '../../services/mcq.service.js';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { LEVEL_BADGE_CLASS, decodeDescription, levelRank } from '../../utils/practiceLevels.js';

const ACTIVE_STATUSES = ['approved', 'completed'];
const MAX_ATTEMPT_PAGES = 5;

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const optionLetter = (index) => String.fromCharCode(65 + index);

const formatDuration = (minutes) => (Number(minutes) > 0 ? `${minutes} min` : 'No limit');

const sortQuestions = (questions = []) =>
  [...questions].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const slug = (value) => value.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

const loadAttemptStats = async () => {
  const stats = {};
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= MAX_ATTEMPT_PAGES) {
    let res;
    try {
      res = await getMyAttempts({ limit: 50, page });
    } catch {
      break;
    }

    (res?.data?.attempts || []).forEach((attempt) => {
      const testId = attempt?.test?.id;
      if (!testId) return;
      const entry = stats[testId] || { count: 0, best: null };
      entry.count += 1;
      if (attempt.status === 'evaluated' && attempt.percentage !== null && attempt.percentage !== undefined) {
        const percentage = Number(attempt.percentage);
        entry.best = entry.best === null ? percentage : Math.max(entry.best, percentage);
      }
      stats[testId] = entry;
    });

    hasNextPage = Boolean(res?.data?.pagination?.hasNextPage);
    page += 1;
  }

  return stats;
};

export default function McqPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sets, setSets] = useState([]);
  const [attemptStats, setAttemptStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noEnrollments, setNoEnrollments] = useState(false);
  const [retryTestId, setRetryTestId] = useState(location.state?.retryTestId || null);

  const [view, setView] = useState('list');
  const [activeSet, setActiveSet] = useState(null);
  const [setStats, setSetStats] = useState(null);
  const [starting, setStarting] = useState(false);
  const [flowError, setFlowError] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoEnrollments(false);
    try {
      const enrollmentRes = await getMyEnrollments({ limit: 50 });
      const active = (enrollmentRes?.data?.enrollments || []).filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );

      if (active.length === 0) {
        setSets([]);
        setAttemptStats({});
        setNoEnrollments(true);
        return;
      }

      const [results, stats] = await Promise.all([
        Promise.all(
          active.map((enrollment) =>
            listCourseMcqTests(getCourseId(enrollment))
              .then((res) => ({ enrollment, tests: res?.data?.mcqTests || [] }))
              .catch(() => null)
          )
        ),
        loadAttemptStats(),
      ]);

      const loaded = results.filter(Boolean);
      if (loaded.length === 0) {
        throw new Error('Failed to load practice sets.');
      }

      const items = [];
      loaded.forEach(({ enrollment, tests }) => {
        const courseTitle = enrollment?.course?.title || '';
        tests
          .filter((test) => !test.status || test.status === 'published')
          .forEach((test) => {
            const { level, topic } = decodeDescription(test.description);
            items.push({
              ...test,
              level,
              topic: topic || courseTitle,
              courseTitle,
            });
          });
      });

      items.sort(
        (a, b) => levelRank(a.level) - levelRank(b.level) || a.title.localeCompare(b.title)
      );
      setSets(items);
      setAttemptStats(stats);
    } catch (err) {
      setError(err.message || 'Failed to load practice sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map();
    sets.forEach((set) => {
      const key = set.topic || 'Practice';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(set);
    });
    return [...map.entries()].map(([title, groupSets]) => ({ title, sets: groupSets }));
  }, [sets]);

  const currentQuestion = questions[currentIndex] || null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.order] : undefined;
  const answeredCount = questions.filter(
    (question) => answers[question.order] !== undefined && answers[question.order] !== null
  ).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  const resetFlow = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setAttemptId(null);
    setFlowError(null);
    setSetStats(null);
  };

  const resetToList = () => {
    setView('list');
    setActiveSet(null);
    resetFlow();
  };

  const openSet = (set) => {
    setActiveSet(set);
    resetFlow();
    setView('instructions');
  };

  const startPractice = async (set) => {
    if (starting || !set) return;
    setStarting(true);
    setActiveSet(set);
    setFlowError(null);
    setSetStats(null);
    setAttemptId(null);
    setQuestions([]);

    try {
      const res = await startAttempt(set.id);
      const attempt = res?.data?.attempt;
      const test = res?.data?.test;
      setAttemptId(attempt?.id || null);
      setQuestions(sortQuestions(test?.questions || set.questions || []));
      setCurrentIndex(0);
      setAnswers({});
      setView('quiz');
    } catch (err) {
      if (err.statusCode === 403) {
        setFlowError('You do not have access to this practice set.');
      } else if (err.statusCode === 409) {
        setFlowError('This attempt was already submitted. Open your latest result to review it.');
      } else {
        setFlowError(err.message || 'Could not start this practice.');
      }
      setCurrentIndex(0);
      setAnswers({});
      setView('instructions');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    setFlowError(null);

    const payload = questions.map((question) => ({
      questionOrder: Number(question.order || 0),
      selectedOption:
        answers[question.order] === undefined || answers[question.order] === null
          ? null
          : answers[question.order],
    }));

    try {
      await submitAttempt(attemptId, payload);
      navigate(`/mcq-attempts/${attemptId}`);
    } catch (err) {
      if (err.statusCode === 409) {
        navigate(`/mcq-attempts/${attemptId}`);
      } else {
        setFlowError(err.message || 'Could not submit this practice.');
        setSubmitting(false);
      }
    }
  };

  const selectAnswer = (optionIndex) => {
    if (!currentQuestion) return;
    setAnswers((current) => ({ ...current, [currentQuestion.order]: optionIndex }));
  };

  /* Attempt stats for the open practice (attempts count, best score, latest result) */
  useEffect(() => {
    if (view !== 'instructions' || !activeSet) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await getMyAttempts({ mcqTestId: activeSet.id, limit: 50 });
        if (cancelled) return;
        const attempts = res?.data?.attempts || [];
        const evaluated = attempts.filter((attempt) => attempt.status === 'evaluated');
        const best = evaluated.reduce(
          (max, attempt) =>
            attempt.percentage !== null && attempt.percentage !== undefined
              ? Math.max(max, Number(attempt.percentage))
              : max,
          0
        );
        setSetStats({
          count: attempts.length,
          best: evaluated.length > 0 ? best : null,
          resultId: evaluated[0]?.id || null,
          inProgress: attempts.some((attempt) => attempt.status === 'in_progress'),
        });
      } catch {
        if (!cancelled) setSetStats(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, activeSet]);

  /* Retry Practice from the result page: start a brand new attempt */
  useEffect(() => {
    if (loading || !retryTestId) return;
    const set = sets.find((item) => item.id === retryTestId);
    setRetryTestId(null);
    navigate('/mcqs', { replace: true, state: null });
    if (set) startPractice(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, retryTestId, sets]);

  if (view === 'list') {
    const listHeader = (
      <header className="admin-dashboard-header">
        <div>
          <h1>MCQs / Practice</h1>
          <p className="admin-welcome">Pick a topic and level to start a practice session.</p>
        </div>
      </header>
    );

    if (loading) {
      return (
        <div className="admin-dashboard student-practice-page fade-in">
          {listHeader}
          <Loading label="Loading practice sets..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="admin-dashboard student-practice-page fade-in">
          {listHeader}
          <ErrorState message={error} onRetry={load} />
        </div>
      );
    }

    return (
      <div className="admin-dashboard student-practice-page fade-in">
        {listHeader}

        {noEnrollments ? (
          <EmptyState
            title="No courses yet"
            message="Enroll in a course to unlock its practice sets."
          />
        ) : sets.length === 0 ? (
          <EmptyState
            title="No practice sets yet"
            message="Practice sets published for your courses will appear here."
          />
        ) : (
          groups.map((group) => (
            <section key={group.title} aria-labelledby={`practice-group-${slug(group.title)}`}>
              <h2 id={`practice-group-${slug(group.title)}`} className="student-classes-heading">
                {group.title}
              </h2>

              <div className="student-classes-grid">
                {group.sets.map((set) => {
                  const stat = attemptStats[set.id];
                  return (
                    <Card key={set.id} variant="student-class-card">
                      <div>
                        <div className="student-assignment-meta">
                          {set.level ? (
                            <span className={`badge ${LEVEL_BADGE_CLASS[set.level] || 'badge-neutral'}`}>
                              {set.level}
                            </span>
                          ) : null}
                          <span>{set.topic}</span>
                          {set.courseTitle ? <span>{set.courseTitle}</span> : null}
                        </div>
                        <h3>{set.title}</h3>
                        <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
                          {(set.questions || []).length} questions &middot; {formatDuration(set.duration)}
                        </p>
                        {stat && stat.count > 0 ? (
                          <p className="text-meta" style={{ margin: 'var(--space-1) 0 0' }}>
                            {stat.count} attempt{stat.count > 1 ? 's' : ''}
                            {stat.best !== null ? ` · Best ${stat.best}%` : ''}
                          </p>
                        ) : null}
                      </div>
                      <div className="student-class-actions">
                        <Button size="sm" onClick={() => openSet(set)}>
                          {stat && stat.count > 0 ? 'Retry Practice' : 'Start Practice'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    );
  }

  if (view === 'instructions') {
    const questionCount = (activeSet.questions || []).length;
    const hasDuration = Number(activeSet.duration) > 0;
    const startLabel = setStats?.inProgress
      ? 'Resume Practice'
      : setStats?.resultId
        ? 'Retry Practice'
        : 'Start Practice';

    return (
      <>
        <Link to="/mcqs" className="back-link" onClick={resetToList}>
          Back to practice
        </Link>

        <section className="asg-head fade-in" aria-labelledby="practice-heading">
          <div className="student-assignment-meta" style={{ marginBottom: 'var(--space-3)' }}>
            {activeSet.level ? (
              <span className={`badge ${LEVEL_BADGE_CLASS[activeSet.level] || 'badge-neutral'}`}>
                {activeSet.level}
              </span>
            ) : null}
            <span>{activeSet.topic}</span>
            {activeSet.courseTitle ? <span>{activeSet.courseTitle}</span> : null}
          </div>

          <h1 id="practice-heading">{activeSet.title}</h1>

          <dl className="meta-grid">
            <div>
              <dt>Questions</dt>
              <dd>{questionCount}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(activeSet.duration)}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{activeSet.level || 'All levels'}</dd>
            </div>
            <div>
              <dt>Passing score</dt>
              <dd>{activeSet.passingScore || 0}%</dd>
            </div>
            <div>
              <dt>Attempts</dt>
              <dd>{setStats ? setStats.count : 0}</dd>
            </div>
            <div>
              <dt>Best score</dt>
              <dd>{setStats && setStats.best !== null ? `${setStats.best}%` : 'Not attempted'}</dd>
            </div>
          </dl>
        </section>

        <div style={{ marginTop: 'var(--space-5)' }}>
          <Card>
            <h3>Instructions</h3>
            <ul
              style={{
                display: 'grid',
                gap: 'var(--space-2)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <li>&middot; Each question has four options and only one correct answer.</li>
              <li>&middot; Use Previous and Next to move between questions.</li>
              <li>&middot; You can revisit a question before you submit.</li>
              <li>&middot; Submit on the last question to finish this practice.</li>
              {hasDuration ? (
                <li>&middot; You have {activeSet.duration} minutes once you start.</li>
              ) : null}
              {activeSet.passingScore ? (
                <li>&middot; You need at least {activeSet.passingScore}% to pass.</li>
              ) : null}
              <li>&middot; You can attempt this practice as many times as you like.</li>
            </ul>

            {flowError ? (
              <p className="field-error-text" role="alert" style={{ marginTop: 'var(--space-4)' }}>
                {flowError}
              </p>
            ) : null}

            {setStats && setStats.count > 0 ? (
              <p className="text-meta" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
                {setStats.count} attempt{setStats.count > 1 ? 's' : ''} so far
                {setStats.best !== null ? ` · Best score ${setStats.best}%` : ''}. Try again to
                improve your score.
              </p>
            ) : null}

            <div
              style={{
                marginTop: 'var(--space-5)',
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
              }}
            >
              <Button onClick={() => startPractice(activeSet)} loading={starting} disabled={starting}>
                {startLabel}
              </Button>

              {setStats?.resultId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/mcq-attempts/${setStats.resultId}`)}
                >
                  View Result
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Link to="/mcqs" className="back-link" onClick={() => setView('instructions')}>
        Back to instructions
      </Link>

      <section className="student-assignment-list fade-in" aria-label={activeSet.title}>
        <Card variant="student-assignment-card student-mcq-assignment-card">
          <div className="student-assignment-card-head">
            <div>
              <h2>{activeSet.title}</h2>
              <div className="student-assignment-meta">
                <span>{activeSet.topic}</span>
                {activeSet.level ? (
                  <span className={`badge ${LEVEL_BADGE_CLASS[activeSet.level] || 'badge-neutral'}`}>
                    {activeSet.level}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="student-mcq-flow">
            <div className="student-mcq-question-top">
              <p className="text-meta uppercase">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <p className="text-meta">
                {answeredCount} of {questions.length} answered
              </p>
            </div>

            {flowError ? (
              <p className="field-error-text" role="alert">
                {flowError}
              </p>
            ) : null}

            {currentQuestion ? (
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
                          name={`practice-question-${currentQuestion.order}`}
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
            ) : (
              <EmptyState title="No questions in this practice set yet" />
            )}

            <div className="student-mcq-nav">
              {currentIndex === 0 ? (
                <span />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                >
                  Previous
                </Button>
              )}

              {isLastQuestion ? (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                >
                  Submit
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))
                  }
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}
