import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import {
  getMyAttempts,
  listCourseMcqTests,
  startAttempt,
  submitAttempt,
} from '../../services/mcq.service.js';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { decodeDescription, levelRank } from '../../utils/practiceLevels.js';

const ACTIVE_STATUSES = ['approved', 'completed'];
const MAX_ATTEMPT_PAGES = 5;

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const optionLetter = (index) => String.fromCharCode(65 + index);

const formatDuration = (minutes) => (Number(minutes) > 0 ? `${minutes} min` : 'No limit');

const sortQuestions = (questions = []) =>
  [...questions].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

const loadAttemptStats = async () => {
  const stats = {};
  let available = true;
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= MAX_ATTEMPT_PAGES) {
    let res;
    try {
      res = await getMyAttempts({ limit: 50, page });
    } catch {
      if (page === 1) available = false;
      break;
    }

    (res?.data?.attempts || []).forEach((attempt) => {
      const testId = attempt?.test?.id;
      if (!testId) return;
      const entry = stats[testId] || { count: 0, best: null, inProgress: false };
      entry.count += 1;
      if (attempt.status === 'in_progress') entry.inProgress = true;
      if (
        attempt.status === 'evaluated' &&
        attempt.percentage !== null &&
        attempt.percentage !== undefined
      ) {
        const percentage = Number(attempt.percentage);
        entry.best = entry.best === null ? percentage : Math.max(entry.best, percentage);
      }
      stats[testId] = entry;
    });

    hasNextPage = Boolean(res?.data?.pagination?.hasNextPage);
    page += 1;
  }

  return { stats, available };
};

function CaretIcon() {
  return (
    <svg
      className="student-practice-course-caret"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="student-practice-arrow"
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

function PracticeSkeleton() {
  return (
    <div className="student-practice-skeleton" role="status">
      <span className="sr-only">Loading practice sets…</span>
      {[0, 1].map((panel) => (
        <div className="student-practice-skeleton-panel" key={panel} aria-hidden="true">
          <div className="student-practice-skeleton-head">
            <span className="skeleton student-practice-skeleton-title" />
            <span className="skeleton student-practice-skeleton-count" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div className="student-practice-skeleton-row" key={row}>
              <div className="student-practice-skeleton-copy">
                <span className="skeleton student-practice-skeleton-line" />
                <span className="skeleton student-practice-skeleton-meta" />
              </div>
              <span className="skeleton student-practice-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function McqPracticePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [sets, setSets] = useState([]);
  const [attemptStats, setAttemptStats] = useState({});
  const [statsAvailable, setStatsAvailable] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
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
    setStatsAvailable(true);

    try {
      const enrollmentRes = await getMyEnrollments({ limit: 50 });
      const active = (enrollmentRes?.data?.enrollments || []).filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );
      setEnrollments(active);

      if (active.length === 0) {
        setSets([]);
        setAttemptStats({});
        setSelectedCourseId(null);
        return;
      }

      setSelectedCourseId((current) => {
        if (current && active.some((enrollment) => getCourseId(enrollment) === current)) {
          return current;
        }
        return getCourseId(active[0]);
      });

      const [results, attemptResult] = await Promise.all([
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
        throw new Error('Could not load practice sets.');
      }

      const items = [];
      const seenIds = new Set();
      loaded.forEach(({ enrollment, tests }) => {
        const courseId = getCourseId(enrollment);
        const courseTitle = enrollment?.course?.title || '';
        tests
          .filter((test) => !test.status || test.status === 'published')
          .forEach((test) => {
            // A shared practice set can come back from several enrollments — keep one row.
            if (seenIds.has(test.id)) return;
            seenIds.add(test.id);
            const { level, topic } = decodeDescription(test.description);
            items.push({
              ...test,
              level,
              topic: topic || courseTitle,
              courseId,
              courseTitle,
            });
          });
      });

      // Keep the API's creation order within each level group.
      items.sort((a, b) => levelRank(a.level) - levelRank(b.level));
      setSets(items);
      setAttemptStats(attemptResult.stats);
      setStatsAvailable(attemptResult.available);
    } catch (err) {
      setError(err.message || 'Could not load practice sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const courseSets = useMemo(
    () => sets.filter((set) => set.courseId === selectedCourseId),
    [sets, selectedCourseId]
  );

  const groups = useMemo(() => {
    const map = new Map();
    courseSets.forEach((set) => {
      const key = set.level || 'All levels';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(set);
    });
    return [...map.entries()]
      .map(([title, groupSets]) => ({ title, sets: groupSets }))
      .sort((a, b) => levelRank(a.title) - levelRank(b.title));
  }, [courseSets]);

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

  const handleCourseChange = (event) => {
    setSelectedCourseId(event.target.value);
    resetToList();
  };

  /* Attempt detail for the open practice set. */
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
          evaluated.length > 0 ? 0 : null
        );
        setSetStats({
          count: attempts.length,
          best,
          resultId: evaluated[0]?.id || null,
          inProgress: attempts.some((attempt) => attempt.status === 'in_progress'),
          available: true,
        });
      } catch {
        if (!cancelled) setSetStats({ count: null, best: null, resultId: null, inProgress: false, available: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, activeSet]);

  /* Retry Practice from the result page: start a brand new attempt. */
  useEffect(() => {
    if (loading || !retryTestId) return;
    const set = sets.find((item) => item.id === retryTestId);
    setRetryTestId(null);
    navigate('/mcqs', { replace: true, state: null });
    if (set) {
      setSelectedCourseId(set.courseId);
      startPractice(set);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, retryTestId, sets]);

  const selectedEnrollment = enrollments.find(
    (enrollment) => getCourseId(enrollment) === selectedCourseId
  );
  const courseTitle = selectedEnrollment?.course?.title || '';
  const showCourseSelect = enrollments.length > 1;

  const attemptedCount = courseSets.filter((set) => (attemptStats[set.id]?.count || 0) > 0).length;
  const showStats = Boolean(selectedCourseId) && !loading && !error && enrollments.length > 0;
  const statValue = showStats && statsAvailable ? attemptedCount : '—';
  const statTotal = showStats ? courseSets.length : '—';
  const attemptedPct =
    statsAvailable && courseSets.length > 0
      ? Math.round((attemptedCount / courseSets.length) * 100)
      : 0;

  if (view === 'instructions' && activeSet) {
    const questionCount = (activeSet.questions || []).length;
    const startLabel = setStats?.inProgress
      ? 'Resume Practice'
      : setStats?.resultId
        ? 'Retry Practice'
        : 'Start Practice';

    return (
      <div className="student-practice fade-in">
        <button type="button" className="student-practice-back" onClick={resetToList}>
          <span aria-hidden="true">&larr;</span> Back to practice
        </button>

        <section
          className="student-practice-detail"
          aria-labelledby="student-practice-detail-title"
        >
          <p className="student-practice-eyebrow">
            {[activeSet.level, activeSet.topic].filter(Boolean).join(' · ') ||
              activeSet.courseTitle}
          </p>
          <h1 id="student-practice-detail-title">{activeSet.title}</h1>

          <dl className="student-practice-facts">
            <div>
              <dt>Questions</dt>
              <dd>{questionCount}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(activeSet.duration)}</dd>
            </div>
            <div>
              <dt>Passing score</dt>
              <dd>{Number(activeSet.passingScore) || 0}%</dd>
            </div>
            <div>
              <dt>Attempts</dt>
              <dd>{setStats && setStats.count !== null ? setStats.count : '—'}</dd>
            </div>
            <div>
              <dt>Best score</dt>
              <dd>
                {setStats && setStats.best !== null && setStats.best !== undefined
                  ? `${setStats.best}%`
                  : '—'}
              </dd>
            </div>
          </dl>

          <div className="student-practice-detail-body">
            <p>One correct answer per question. You can revisit questions before you submit.</p>
            <p>Answers are scored when you submit. You can attempt this set as many times as you like.</p>
          </div>

          {flowError ? (
            <p className="field-error-text" role="alert" style={{ marginTop: 'var(--space-4)' }}>
              {flowError}
            </p>
          ) : null}

          <div className="student-practice-actions">
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
        </section>
      </div>
    );
  }

  if (view === 'quiz') {
    const progressPct =
      questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    return (
      <div className="student-practice fade-in">
        <button
          type="button"
          className="student-practice-back"
          onClick={() => setView('instructions')}
        >
          <span aria-hidden="true">&larr;</span> Back to instructions
        </button>

        <section className="student-practice-quiz" aria-label={activeSet?.title || 'Practice'}>
          <div className="student-practice-quiz-progress">
            <div className="student-practice-quiz-head">
              <p className="student-practice-quiz-position">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <p className="student-practice-quiz-answered">
                {answeredCount} of {questions.length} answered
              </p>
            </div>
            <span className="student-practice-quiz-meter" aria-hidden="true">
              <span style={{ width: `${progressPct}%` }} />
            </span>
          </div>

          {flowError ? (
            <p className="field-error-text" role="alert">
              {flowError}
            </p>
          ) : null}

          {currentQuestion ? (
            <fieldset className="student-practice-question">
              <legend>{currentQuestion.question}</legend>
              <div className="student-practice-options">
                {currentQuestion.options.map((option, optionIndex) => {
                  const selected = currentAnswer === optionIndex;
                  return (
                    <label
                      key={`${currentQuestion.order}-${optionIndex}`}
                      className={`student-practice-option${selected ? ' is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`practice-question-${currentQuestion.order}`}
                        checked={selected}
                        onChange={() => selectAnswer(optionIndex)}
                      />
                      <span className="student-practice-option-letter" aria-hidden="true">
                        {optionLetter(optionIndex)}
                      </span>
                      <span className="student-practice-option-text">{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <EmptyState title="No questions in this practice set yet" />
          )}

          <div className="student-practice-quiz-nav">
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
        </section>
      </div>
    );
  }

  return (
    <div className="student-practice fade-in">
      <header className="student-practice-masthead">
        <div className="student-practice-head">
          <h1 className="student-practice-title">MCQs / Practice</h1>
          {loading ? (
            <span className="skeleton student-practice-course-skeleton" aria-hidden="true" />
          ) : showCourseSelect ? (
            <label className="student-practice-course">
              <span className="student-practice-course-value" aria-hidden="true">
                <span>{courseTitle}</span>
                <CaretIcon />
              </span>
              <select
                className="student-practice-course-select"
                aria-label="Course"
                value={selectedCourseId || ''}
                onChange={handleCourseChange}
              >
                {enrollments.map((enrollment) => {
                  const id = getCourseId(enrollment);
                  return (
                    <option key={id} value={id}>
                      {enrollment.course?.title || 'Untitled course'}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : courseTitle ? (
            <p className="student-practice-course-title">{courseTitle}</p>
          ) : null}
        </div>

        <div className="student-practice-stat">
          <span className="student-practice-stat-label">Attempted</span>
          {loading ? (
            <span className="skeleton student-practice-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-practice-stat-value">
              {statValue}
              <span className="student-practice-stat-total"> / {statTotal}</span>
            </span>
          )}
          <span className="student-practice-bar" aria-hidden="true">
            <span style={{ width: `${attemptedPct}%` }} />
          </span>
        </div>
      </header>

      {error ? (
        <div className="student-practice-state">
          <ErrorState message={error} onRetry={() => setReloadToken((token) => token + 1)} />
        </div>
      ) : loading ? (
        <PracticeSkeleton />
      ) : enrollments.length === 0 ? (
        <div className="student-practice-state">
          <EmptyState
            title="No active courses"
            message="Practice sets appear here once your enrollment is approved."
          />
        </div>
      ) : courseSets.length === 0 ? (
        <div className="student-practice-state">
          <EmptyState
            title="No practice sets yet"
            message="Practice sets appear here once your instructor publishes them."
          />
        </div>
      ) : (
        <div className="student-practice-panels">
          {groups.map((group, groupIndex) => (
            <section
              className="student-practice-panel"
              key={`${group.title}-${groupIndex}`}
              aria-labelledby={`student-practice-level-${groupIndex}`}
            >
              <header className="student-practice-panel-head">
                <h2 id={`student-practice-level-${groupIndex}`}>{group.title}</h2>
                <span className="student-practice-panel-count">
                  {group.sets.length} {group.sets.length === 1 ? 'set' : 'sets'}
                </span>
              </header>

              <ol className="student-practice-list">
                {group.sets.map((set) => {
                  const stat = attemptStats[set.id];
                  const questionCount = (set.questions || []).length;
                  const meta = [
                    set.topic,
                    `${questionCount} ${questionCount === 1 ? 'question' : 'questions'}`,
                    Number(set.duration) > 0 ? `${set.duration} min` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  const best = stat?.best;
                  const primary = !statsAvailable
                    ? '—'
                    : best !== null && best !== undefined
                      ? `Best ${best}%`
                      : stat?.inProgress
                        ? 'In progress'
                        : 'Not started';
                  const secondary = statsAvailable && stat?.count
                    ? `${stat.count} ${stat.count === 1 ? 'attempt' : 'attempts'}${
                        stat.inProgress ? ' · in progress' : ''
                      }`
                    : null;

                  return (
                    <li key={set.id}>
                      <button type="button" className="student-practice-row" onClick={() => openSet(set)}>
                        <span className="student-practice-row-main">
                          <span className="student-practice-row-title">{set.title}</span>
                          {meta ? <span className="student-practice-row-meta">{meta}</span> : null}
                        </span>
                        <span className="student-practice-row-side">
                          <span
                            className={`student-practice-row-score${
                              primary === 'Not started' ? ' is-idle' : ''
                            }`}
                          >
                            {primary}
                          </span>
                          {secondary ? (
                            <span className="student-practice-row-attempts">{secondary}</span>
                          ) : null}
                        </span>
                        <ArrowIcon />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
