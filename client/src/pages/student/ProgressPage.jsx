import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getProgressOverview } from '../../services/progress.service.js';
import { getAttemptById, getMcqTestById } from '../../services/mcq.service.js';
import { decodeDescription } from '../../utils/practiceLevels.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const EMPTY_OVERALL = {
  pct: 0,
  completedActivities: 0,
  totalActivities: 0,
  classes: { completed: 0, total: 0, pct: 0 },
  assignments: { completed: 0, total: 0, pct: 0 },
  mcq: { attempted: 0, total: 0, pct: 0 },
};

const ASSIGNMENT_STATUS = {
  completed: { label: 'Completed', tone: 'is-positive' },
  overdue: { label: 'Overdue', tone: 'is-negative' },
  pending: { label: 'Pending', tone: 'is-negative' },
};

const ACTIVITY_STATUS = {
  completed: { label: 'Completed', tone: 'is-positive' },
  submitted: { label: 'Submitted', tone: 'is-positive' },
  passed: { label: 'Passed', tone: 'is-positive' },
  failed: { label: 'Needs practice', tone: 'is-negative' },
};

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '');

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-IN') : 'Not submitted');

const optionLetter = (index) => String.fromCharCode(65 + index);

const clampPct = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const displayPct = (value) => Math.round(Number(value) || 0);

function CaretIcon() {
  return (
    <svg
      className="student-progress-course-caret"
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
      className="student-progress-arrow"
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

function ProgressSkeleton({ panels = 3 }) {
  return (
    <div className="student-progress-skeleton" role="status">
      <span className="sr-only">Loading progress.</span>
      {Array.from({ length: panels }, (_, panel) => (
        <div className="student-progress-skeleton-panel" key={panel} aria-hidden="true">
          <div className="student-progress-skeleton-head">
            <span className="skeleton student-progress-skeleton-title" />
            <span className="skeleton student-progress-skeleton-count" />
          </div>
          {[0, 1, 2].map((row) => (
            <div className="student-progress-skeleton-row" key={row}>
              <div className="student-progress-skeleton-copy">
                <span className="skeleton student-progress-skeleton-line" />
                <span className="skeleton student-progress-skeleton-meta" />
              </div>
              <span className="skeleton student-progress-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsReady, setEnrollmentsReady] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [view, setView] = useState('home');

  const [resultSource, setResultSource] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState(null);

  // Load the student's active courses once (plus on explicit retry).
  useEffect(() => {
    let cancelled = false;

    setEnrollmentsReady(false);
    setLoadError(null);

    (async () => {
      try {
        const res = await getMyEnrollments({ limit: 50 });
        if (cancelled) return;
        const list = (res?.data?.enrollments || []).filter(
          (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
        );
        setEnrollments(list);
        setEnrollmentsReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load your courses');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Recalculate the whole overview whenever the selected course changes.
  useEffect(() => {
    if (!enrollmentsReady) return undefined;
    let cancelled = false;

    setOverviewLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const res = await getProgressOverview(
          selectedCourseId ? { courseId: selectedCourseId } : {}
        );
        if (!cancelled) setOverview(res?.data || null);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load your progress');
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enrollmentsReady, selectedCourseId, reloadKey]);

  const retryLoad = useCallback(() => {
    setSelectedResult(null);
    setResultSource(null);
    setOverview(null);
    setReloadKey((key) => key + 1);
  }, []);

  const courses = overview?.courses || [];
  const overall = overview?.overall || EMPTY_OVERALL;
  const continueLearning = overview?.continueLearning || null;
  const recentActivity = overview?.recentActivity || [];

  const classItems = useMemo(
    () =>
      courses.flatMap((course) =>
        (course.classes?.items || []).map((item) => ({
          ...item,
          courseId: course.id,
          courseTitle: course.title,
        }))
      ),
    [courses]
  );

  const assignmentItems = useMemo(
    () =>
      courses.flatMap((course) =>
        (course.assignments?.items || []).map((item) => ({
          ...item,
          courseId: course.id,
          courseTitle: course.title,
        }))
      ),
    [courses]
  );

  const mcqItems = useMemo(
    () =>
      courses.flatMap((course) =>
        (course.mcq?.items || []).map((item) => ({
          ...item,
          courseId: course.id,
          courseTitle: course.title,
        }))
      ),
    [courses]
  );

  const go = (nextView) => setView(nextView);

  const startPractice = (item) => {
    navigate('/mcqs', { state: { retryTestId: item.id } });
  };

  const handleContinue = () => {
    if (!continueLearning) return;
    const { type, id } = continueLearning;
    if (type === 'class') navigate(`/classes/${id}`);
    else if (type === 'assignment') navigate(`/assignments/${id}`);
    else navigate('/mcqs', { state: { retryTestId: id } });
  };

  const selectCourse = (courseId) => {
    if (courseId === selectedCourseId) return;
    setSelectedCourseId(courseId);
    setView('home');
  };

  const openResult = useCallback(async (item) => {
    if (!item?.latestAttemptId) return;
    setResultSource(item);
    setView('result');
    setSelectedResult(null);
    setResultLoading(true);
    setResultError(null);

    try {
      const [attemptRes, testRes] = await Promise.all([
        getAttemptById(item.latestAttemptId),
        getMcqTestById(item.id),
      ]);
      setSelectedResult({
        attempt: attemptRes?.data?.attempt,
        test: testRes?.data?.mcqTest,
        courseTitle: item.courseTitle,
      });
    } catch (err) {
      setResultError(err.message || 'Failed to load this result');
    } finally {
      setResultLoading(false);
    }
  }, []);

  const backButton = (label, nextView) => (
    <button type="button" className="student-progress-back" onClick={() => go(nextView)}>
      <span aria-hidden="true">&larr;</span> Back to {label}
    </button>
  );

  const selectedCourse = enrollments.find(
    (enrollment) => getCourseId(enrollment) === selectedCourseId
  );
  const courseLabel = selectedCourse?.course?.title || 'All courses';

  const courseScope =
    enrollments.length > 1 ? (
      <label className="student-progress-course">
        <span className="student-progress-course-value" aria-hidden="true">
          <span>{courseLabel}</span>
          <CaretIcon />
        </span>
        <select
          className="student-progress-course-select"
          aria-label="Course"
          value={selectedCourseId}
          onChange={(event) => selectCourse(event.target.value)}
        >
          <option value="">All courses</option>
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
    ) : enrollments.length === 1 ? (
      <p className="student-progress-course-title">{courseLabel}</p>
    ) : null;

  const masthead = ({ title, label, value, pct, loadingStat = false }) => (
    <header className="student-progress-masthead">
      <div className="student-progress-head">
        <h1 className="student-progress-title">{title}</h1>
        {enrollmentsReady || loadError ? (
          courseScope
        ) : (
          <span className="skeleton student-progress-course-skeleton" aria-hidden="true" />
        )}
      </div>

      <div className="student-progress-stat">
        <span className="student-progress-stat-label">{label}</span>
        {loadingStat ? (
          <span className="skeleton student-progress-stat-skeleton" aria-hidden="true" />
        ) : (
          <span className="student-progress-stat-value">{value}</span>
        )}
        {!loadingStat && pct !== null && pct !== undefined ? (
          <span className="student-progress-bar" aria-hidden="true">
            <span style={{ width: `${clampPct(pct)}%` }} />
          </span>
        ) : null}
      </div>
    </header>
  );

  const stat = (done, total) => (
    <>
      {done} <span className="student-progress-stat-total"> / {total}</span>
    </>
  );

  if (loadError) {
    return (
      <div className="student-progress fade-in">
        {masthead({ title: 'Progress', label: 'Overall', value: '—', pct: null })}
        <div className="student-progress-state">
          <ErrorState message={loadError} onRetry={retryLoad} />
        </div>
      </div>
    );
  }

  if (!enrollmentsReady || (!overview && overviewLoading)) {
    return (
      <div className="student-progress fade-in">
        {masthead({ title: 'Progress', label: 'Overall', value: '', pct: null, loadingStat: true })}
        <ProgressSkeleton />
      </div>
    );
  }

  if (!overview || enrollments.length === 0) {
    return (
      <div className="student-progress fade-in">
        {masthead({ title: 'Progress', label: 'Overall', value: '—', pct: null })}
        <div className="student-progress-state">
          <EmptyState
            title="No courses yet"
            message="Progress appears here once you are enrolled in a course."
          />
        </div>
      </div>
    );
  }

  if (view === 'result') {
    if (resultLoading) {
      return (
        <div className="student-progress fade-in">
          {backButton('practice', 'mcq')}
          <ProgressSkeleton panels={2} />
        </div>
      );
    }

    if (resultError) {
      return (
        <div className="student-progress fade-in">
          {backButton('practice', 'mcq')}
          <div className="student-progress-state">
            <ErrorState
              message={resultError}
              onRetry={() => (resultSource ? openResult(resultSource) : go('mcq'))}
            />
          </div>
        </div>
      );
    }

    if (!selectedResult) return null;

    const { attempt, test, courseTitle } = selectedResult;
    const questions = [...(test?.questions || [])].sort(
      (a, b) => Number(a.order || 0) - Number(b.order || 0)
    );
    const answerByOrder = new Map(
      (attempt?.answers || []).map((answer) => [Number(answer.questionOrder), answer])
    );

    const evaluated = attempt?.status === 'evaluated';
    const levelInfo = decodeDescription(test?.description || '');
    const passingScore = Number(test?.passingScore ?? attempt?.test?.passingScore ?? 0);

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
    const totalMarks =
      Number(attempt?.totalMarks || 0) > 0 ? Number(attempt.totalMarks) : questionTotalMarks;
    const percentage =
      attempt?.percentage !== null && attempt?.percentage !== undefined
        ? Number(attempt.percentage)
        : totalMarks > 0
          ? Math.round((Number(attempt?.score || 0) / totalMarks) * 10000) / 100
          : 0;
    const passed = evaluated && Boolean(attempt?.passed ?? percentage >= passingScore);

    return (
      <div className="student-progress fade-in">
        {backButton('practice', 'mcq')}

        <section
          className="student-progress-detail"
          aria-labelledby="student-progress-result-title"
        >
          <p className="student-progress-eyebrow">
            {[levelInfo.level, levelInfo.topic, courseTitle].filter(Boolean).join(' · ')}
          </p>
          <h1 id="student-progress-result-title">{test?.title || 'Practice result'}</h1>

          <dl className="student-progress-facts">
            <div>
              <dt>Attempt</dt>
              <dd>#{attempt?.attemptNumber ?? '—'}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{evaluated ? formatDateTime(attempt?.submittedAt) : 'Not submitted'}</dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>
                {attempt?.score ?? 0} / {totalMarks}
              </dd>
            </div>
            <div>
              <dt>Passing score</dt>
              <dd>{passingScore}%</dd>
            </div>
          </dl>
        </section>

        {evaluated ? (
          <>
            <section className="student-progress-panel" aria-label="Result summary">
              <div className="student-progress-panel-body is-flush">
                <div className="student-progress-score">
                  <div className="student-progress-score-main">
                    <p
                      className={`student-progress-score-eyebrow ${
                        passed ? 'is-positive' : 'is-negative'
                      }`}
                    >
                      {passed ? 'Passed' : 'Not passed'}
                    </p>
                    <p className="student-progress-score-value">{displayPct(percentage)}%</p>
                    <p className="student-progress-score-line">
                      {attempt?.score ?? 0} of {totalMarks} marks · Passing score {passingScore}%
                    </p>
                    <span className="student-progress-bar" aria-hidden="true">
                      <span style={{ width: `${clampPct(percentage)}%` }} />
                    </span>
                  </div>

                  <dl className="student-progress-score-stats">
                    <div>
                      <dt>Correct</dt>
                      <dd>{correctCount}</dd>
                    </div>
                    <div>
                      <dt>Wrong</dt>
                      <dd>{wrongCount}</dd>
                    </div>
                    <div>
                      <dt>Unanswered</dt>
                      <dd>{unansweredCount}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            <section
              className="student-progress-panel"
              aria-labelledby="student-progress-review-heading"
            >
              <header className="student-progress-panel-head">
                <h2 id="student-progress-review-heading">Review answers</h2>
                <span className="student-progress-panel-count">
                  {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                </span>
              </header>

              {questions.length === 0 ? (
                <div className="student-progress-panel-body is-flush">
                  <p className="student-progress-row-meta">
                    Review is unavailable for this attempt.
                  </p>
                </div>
              ) : (
                <ol className="student-progress-list">
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
                      <li key={question.order}>
                        <div className="student-progress-row is-static student-progress-review-row">
                          <span className="student-progress-row-index" aria-hidden="true">
                            {index + 1}
                          </span>
                          <span className="student-progress-row-main">
                            <span className="student-progress-row-title">{question.question}</span>
                            <span className="student-progress-row-meta">
                              Your answer: {selectedIndex === null
                                ? 'Not answered'
                                : question.options?.[selectedIndex] || optionLetter(selectedIndex)}
                              {' · '}Correct answer:{' '}
                              {correctIndex === null
                                ? 'Unavailable'
                                : question.options?.[correctIndex] || optionLetter(correctIndex)}
                            </span>
                            {answer?.explanation ? (
                              <span className="student-progress-row-note">{answer.explanation}</span>
                            ) : null}
                          </span>
                          <span className="student-progress-row-side">
                            <span
                              className={`student-progress-status ${
                                isCorrect
                                  ? 'is-positive'
                                  : notAnswered
                                    ? 'is-idle'
                                    : 'is-negative'
                              }`}
                            >
                              {isCorrect ? 'Correct' : notAnswered ? 'Not answered' : 'Wrong'}
                            </span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <div className="student-progress-actions">
              <Button
                type="button"
                onClick={() => navigate('/mcqs', { state: { retryTestId: test?.id } })}
              >
                Retry practice
              </Button>
              <Button type="button" variant="outline" onClick={() => go('mcq')}>
                Back to practice
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="student-progress-panel">
              <div className="student-progress-panel-body is-flush">
                <p className="student-progress-row-title">Attempt submitted</p>
                <p className="student-progress-row-meta">
                  This attempt is waiting for evaluation. Check back soon for your score.
                </p>
              </div>
            </div>

            <div className="student-progress-actions">
              <Button
                type="button"
                onClick={() => navigate('/mcqs', { state: { retryTestId: test?.id } })}
              >
                Retry practice
              </Button>
              <Button type="button" variant="outline" onClick={() => go('mcq')}>
                Back to practice
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (view === 'classes') {
    const completedClasses = classItems.filter((item) => item.completed);
    const incompleteClasses = classItems.filter((item) => !item.completed);

    const renderClassRow = (item) => {
      const meta = [
        item.courseTitle,
        item.module ? `Module: ${item.module}` : null,
        item.completed ? `Watched ${formatDate(item.completedAt)}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      return (
        <li key={item.id}>
          <button
            type="button"
            className="student-progress-row"
            onClick={() => navigate(`/classes/${item.id}`)}
          >
            <span className="student-progress-row-main">
              <span className="student-progress-row-title">{item.title}</span>
              <span className="student-progress-row-meta">{meta}</span>
            </span>
            <span className="student-progress-row-side">
              <span
                className={`student-progress-status ${
                  item.completed ? 'is-positive' : 'is-idle'
                }`}
              >
                {item.completed ? 'Completed' : 'Not started'}
              </span>
            </span>
            <ArrowIcon />
          </button>
        </li>
      );
    };

    return (
      <div className="student-progress fade-in">
        {backButton('progress', 'home')}
        {masthead({
          title: 'Classes',
          label: 'Watched',
          value: stat(overall.classes.completed, overall.classes.total),
          pct: overall.classes.pct,
        })}

        <section className="student-progress-panel" aria-labelledby="student-progress-completed">
          <header className="student-progress-panel-head">
            <h2 id="student-progress-completed">Completed</h2>
            <span className="student-progress-panel-count">
              {completedClasses.length} {completedClasses.length === 1 ? 'class' : 'classes'}
            </span>
          </header>
          {completedClasses.length === 0 ? (
            <div className="student-progress-panel-body is-flush">
              <p className="student-progress-row-meta">Classes you watch appear here.</p>
            </div>
          ) : (
            <ol className="student-progress-list">{completedClasses.map(renderClassRow)}</ol>
          )}
        </section>

        <section className="student-progress-panel" aria-labelledby="student-progress-pending">
          <header className="student-progress-panel-head">
            <h2 id="student-progress-pending">Not started</h2>
            <span className="student-progress-panel-count">
              {incompleteClasses.length} {incompleteClasses.length === 1 ? 'class' : 'classes'}
            </span>
          </header>
          {incompleteClasses.length === 0 ? (
            <div className="student-progress-panel-body is-flush">
              <p className="student-progress-row-meta">
                Every published class in this selection is watched.
              </p>
            </div>
          ) : (
            <ol className="student-progress-list">{incompleteClasses.map(renderClassRow)}</ol>
          )}
        </section>
      </div>
    );
  }

  if (view === 'assignments') {
    return (
      <div className="student-progress fade-in">
        {backButton('progress', 'home')}
        {masthead({
          title: 'Assignments',
          label: 'Completed',
          value: stat(overall.assignments.completed, overall.assignments.total),
          pct: overall.assignments.pct,
        })}

        <section className="student-progress-panel" aria-labelledby="student-progress-assignment-list">
          <header className="student-progress-panel-head">
            <h2 id="student-progress-assignment-list">All assignments</h2>
            <span className="student-progress-panel-count">
              {assignmentItems.length}{' '}
              {assignmentItems.length === 1 ? 'assignment' : 'assignments'}
            </span>
          </header>

          {assignmentItems.length === 0 ? (
            <div className="student-progress-panel-body is-flush">
              <p className="student-progress-row-meta">
                Published assignments for your courses appear here.
              </p>
            </div>
          ) : (
            <ol className="student-progress-list">
              {assignmentItems.map((assignment) => {
                const status = ASSIGNMENT_STATUS[assignment.status] || {
                  label: 'Pending',
                  tone: 'is-negative',
                };
                const meta = [
                  assignment.courseTitle,
                  assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : 'No due date',
                  assignment.submittedAt ? `Submitted ${formatDate(assignment.submittedAt)}` : null,
                  assignment.marks !== null && assignment.marks !== undefined
                    ? `Score ${assignment.marks} / ${assignment.maxMarks}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      className="student-progress-row"
                      onClick={() => navigate(`/assignments/${assignment.id}`)}
                    >
                      <span className="student-progress-row-main">
                        <span className="student-progress-row-title">{assignment.title}</span>
                        <span className="student-progress-row-meta">{meta}</span>
                      </span>
                      <span className="student-progress-row-side">
                        <span className={`student-progress-status ${status.tone}`}>
                          {status.label}
                        </span>
                      </span>
                      <ArrowIcon />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    );
  }

  if (view === 'mcq') {
    return (
      <div className="student-progress fade-in">
        {backButton('progress', 'home')}
        {masthead({
          title: 'Practice',
          label: 'Practiced',
          value: stat(overall.mcq.attempted, overall.mcq.total),
          pct: overall.mcq.pct,
        })}

        <section className="student-progress-panel" aria-labelledby="student-progress-practice-list">
          <header className="student-progress-panel-head">
            <h2 id="student-progress-practice-list">Practice sets</h2>
            <span className="student-progress-panel-count">
              {mcqItems.length} {mcqItems.length === 1 ? 'set' : 'sets'}
            </span>
          </header>

          {mcqItems.length === 0 ? (
            <div className="student-progress-panel-body is-flush">
              <p className="student-progress-row-meta">
                Practice sets published for your courses appear here.
              </p>
            </div>
          ) : (
            <ol className="student-progress-list">
              {mcqItems.map((item) => {
                const { level, topic } = decodeDescription(item.description);
                const attempted = item.attemptsCount > 0;
                const meta = [
                  level,
                  topic,
                  selectedCourseId ? null : item.courseTitle,
                  attempted
                    ? `${item.attemptsCount} ${item.attemptsCount === 1 ? 'attempt' : 'attempts'}`
                    : null,
                  item.bestScore !== null && item.bestScore !== undefined
                    ? `Best ${item.bestScore}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                const openSet = () =>
                  item.latestAttemptId ? openResult(item) : startPractice(item);

                return (
                  <li key={item.id}>
                    <button type="button" className="student-progress-row" onClick={openSet}>
                      <span className="student-progress-row-main">
                        <span className="student-progress-row-title">{item.title}</span>
                        <span className="student-progress-row-meta">{meta}</span>
                      </span>
                      <span className="student-progress-row-side">
                        <span
                          className={`student-progress-status ${
                            !attempted
                              ? 'is-idle'
                              : item.latestPassed
                                ? 'is-positive'
                                : 'is-negative'
                          }`}
                        >
                          {!attempted
                            ? 'Not started'
                            : item.latestScore !== null && item.latestScore !== undefined
                              ? `${displayPct(item.latestScore)}%`
                              : 'In progress'}
                        </span>
                      </span>
                      <ArrowIcon />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    );
  }

  const continueDetail = (item) => {
    if (item.type === 'class') return item.module ? `Module: ${item.module}` : 'Next class';
    if (item.type === 'assignment') {
      return item.dueDate ? `Due ${formatDate(item.dueDate)}` : 'No due date';
    }
    return 'Practice session';
  };

  const continueKind = (type) =>
    type === 'class' ? 'Class' : type === 'assignment' ? 'Assignment' : 'Practice';

  return (
    <div className="student-progress fade-in" aria-busy={overviewLoading}>
      {masthead({
        title: 'Progress',
        label: 'Overall',
        value: `${displayPct(overall.pct)}%`,
        pct: overall.pct,
      })}

      {continueLearning ? (
        <section className="student-progress-panel" aria-labelledby="student-progress-continue">
          <header className="student-progress-panel-head">
            <h2 id="student-progress-continue">Continue learning</h2>
          </header>
          <ol className="student-progress-list">
            <li>
              <button type="button" className="student-progress-row" onClick={handleContinue}>
                <span className="student-progress-row-main">
                  <span className="student-progress-row-title">{continueLearning.title}</span>
                  <span className="student-progress-row-meta">
                    {continueKind(continueLearning.type)} · {continueLearning.courseTitle} ·{' '}
                    {continueDetail(continueLearning)}
                  </span>
                </span>
                <span className="student-progress-row-side">
                  <span className="student-progress-status">Resume</span>
                </span>
                <ArrowIcon />
              </button>
            </li>
          </ol>
        </section>
      ) : null}

      <section className="student-progress-panel" aria-labelledby="student-progress-overview">
        <header className="student-progress-panel-head">
          <h2 id="student-progress-overview">Overview</h2>
          <span className="student-progress-panel-count">
            {overall.completedActivities} of {overall.totalActivities} done
          </span>
        </header>
        <ol className="student-progress-list">
          <li>
            <button type="button" className="student-progress-row" onClick={() => go('classes')}>
              <span className="student-progress-row-main">
                <span className="student-progress-row-title">Classes</span>
                <span className="student-progress-row-meta">
                  {overall.classes.completed} of {overall.classes.total} watched
                </span>
              </span>
              <span className="student-progress-row-side">
                <span className="student-progress-row-score">{displayPct(overall.classes.pct)}%</span>
              </span>
              <ArrowIcon />
            </button>
          </li>
          <li>
            <button type="button" className="student-progress-row" onClick={() => go('assignments')}>
              <span className="student-progress-row-main">
                <span className="student-progress-row-title">Assignments</span>
                <span className="student-progress-row-meta">
                  {overall.assignments.completed} of {overall.assignments.total} submitted
                </span>
              </span>
              <span className="student-progress-row-side">
                <span className="student-progress-row-score">{displayPct(overall.assignments.pct)}%</span>
              </span>
              <ArrowIcon />
            </button>
          </li>
          <li>
            <button type="button" className="student-progress-row" onClick={() => go('mcq')}>
              <span className="student-progress-row-main">
                <span className="student-progress-row-title">Practice</span>
                <span className="student-progress-row-meta">
                  {overall.mcq.attempted} of {overall.mcq.total} sets practiced
                </span>
              </span>
              <span className="student-progress-row-side">
                <span className="student-progress-row-score">{displayPct(overall.mcq.pct)}%</span>
              </span>
              <ArrowIcon />
            </button>
          </li>
        </ol>
      </section>

      <section className="student-progress-panel" aria-labelledby="student-progress-courses">
        <header className="student-progress-panel-head">
          <h2 id="student-progress-courses">Courses</h2>
          <span className="student-progress-panel-count">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </span>
        </header>
        <ol className="student-progress-list">
          {courses.map((course) => {
            const scoped = selectedCourseId === course.id;
            const meta = [
              `${course.classes?.total || 0} classes`,
              `${course.assignments?.total || 0} assignments`,
              `${course.mcq?.total || 0} practice sets`,
            ].join(' · ');

            const body = (
              <>
                <span className="student-progress-row-main">
                  <span className="student-progress-row-title">{course.title}</span>
                  <span className="student-progress-row-meta">{meta}</span>
                </span>
                <span className="student-progress-row-side">
                  <span className="student-progress-row-score">{displayPct(course.overallPct)}%</span>
                </span>
                {scoped ? null : <ArrowIcon />}
              </>
            );

            return (
              <li key={course.id}>
                {scoped ? (
                  <div className="student-progress-row is-static">{body}</div>
                ) : (
                  <button
                    type="button"
                    className="student-progress-row"
                    onClick={() => selectCourse(course.id)}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {recentActivity.length > 0 ? (
        <section className="student-progress-panel" aria-labelledby="student-progress-activity">
          <header className="student-progress-panel-head">
            <h2 id="student-progress-activity">Recent activity</h2>
            <span className="student-progress-panel-count">
              {recentActivity.length} {recentActivity.length === 1 ? 'update' : 'updates'}
            </span>
          </header>
          <ol className="student-progress-list">
            {recentActivity.map((item) => {
              const status = ACTIVITY_STATUS[item.status] || {
                label: item.status || 'Update',
                tone: 'is-idle',
              };

              return (
                <li key={item.id}>
                  <div className="student-progress-row is-static">
                    <span className="student-progress-row-main">
                      <span className="student-progress-row-title">{item.title}</span>
                      <span className="student-progress-row-meta">{item.desc}</span>
                    </span>
                    <span className="student-progress-row-side">
                      <span className={`student-progress-status ${status.tone}`}>
                        {status.label}
                      </span>
                      <span className="student-progress-row-date">{formatDate(item.at)}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
