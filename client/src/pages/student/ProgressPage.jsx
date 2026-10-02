import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Select from '../../components/common/Select.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getProgressOverview } from '../../services/progress.service.js';
import { getAttemptById, getMcqTestById } from '../../services/mcq.service.js';
import { LEVEL_BADGE_CLASS, decodeDescription } from '../../utils/practiceLevels.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const EMPTY_OVERALL = {
  pct: 0,
  completedActivities: 0,
  totalActivities: 0,
  classes: { completed: 0, total: 0, pct: 0 },
  assignments: { completed: 0, total: 0, pct: 0 },
  mcq: { attempted: 0, total: 0, pct: 0 },
};

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '');

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-IN') : 'Not submitted');

const optionLetter = (index) => String.fromCharCode(65 + index);

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
  const [openHistory, setOpenHistory] = useState(null);

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
        course.classes.items.map((item) => ({
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
        course.assignments.items.map((item) => ({
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
        course.mcq.items.map((item) => ({
          ...item,
          courseId: course.id,
          courseTitle: course.title,
        }))
      ),
    [courses]
  );

  const assignmentsPending = assignmentItems.filter((item) => item.status === 'pending').length;
  const assignmentsOverdue = assignmentItems.filter((item) => item.status === 'overdue').length;
  const classesPending = overall.classes.total - overall.classes.completed;

  const mcqBestScore = mcqItems.reduce(
    (max, item) => (item.bestScore !== null && item.bestScore !== undefined ? Math.max(max, item.bestScore) : max),
    0
  );
  const mcqHasScores = mcqItems.some((item) => item.bestScore !== null && item.bestScore !== undefined);
  const mcqTotalAttempts = mcqItems.reduce((sum, item) => sum + (item.attemptsCount || 0), 0);

  const go = (nextView) => {
    setView(nextView);
    setOpenHistory(null);
  };

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

  const scrollToReview = () => {
    document.getElementById('review-answers')?.scrollIntoView({ behavior: 'smooth' });
  };

  const backLink = (
    <Link to="/progress" className="back-link" onClick={() => go('home')}>
      Back to Progress
    </Link>
  );

  const pageHeader = (title, subtitle) => (
    <header className="admin-dashboard-header">
      <div>
        <h1>{title}</h1>
        <p className="admin-welcome">{subtitle}</p>
      </div>
    </header>
  );

  const coursePicker =
    enrollments.length > 1 ? (
      <div style={{ maxWidth: '360px', marginBottom: 'var(--space-5)' }}>
        <Select
          label="Course"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
        >
          <option value="">All courses</option>
          {enrollments.map((enrollment) => (
            <option key={getCourseId(enrollment)} value={getCourseId(enrollment)}>
              {enrollment.course?.title || 'Course'}
            </option>
          ))}
        </Select>
      </div>
    ) : null;

  if (loadError) {
    return (
      <div className="admin-dashboard fade-in">
        {pageHeader('My Progress', 'Track your classes, assignments, and practice in one place.')}
        <ErrorState message={loadError} onRetry={retryLoad} />
      </div>
    );
  }

  if (!enrollmentsReady || (!overview && overviewLoading)) {
    return (
      <div className="admin-dashboard fade-in">
        {pageHeader('My Progress', 'Track your classes, assignments, and practice in one place.')}
        <Loading label="Loading your progress..." />
      </div>
    );
  }

  if (!overview || enrollments.length === 0) {
    return (
      <div className="admin-dashboard fade-in">
        {pageHeader('My Progress', 'Track your classes, assignments, and practice in one place.')}
        <EmptyState
          title="No courses yet"
          message="Enroll in a course to start tracking your progress."
        />
      </div>
    );
  }

  if (view === 'result') {
    if (resultLoading) {
      return (
        <div className="admin-dashboard fade-in">
          {backLink}
          <Loading label="Loading result..." />
        </div>
      );
    }

    if (resultError) {
      return (
        <div className="admin-dashboard fade-in">
          {backLink}
          <ErrorState
            message={resultError}
            onRetry={() => (resultSource ? openResult(resultSource) : go('mcq'))}
          />
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
      <div className="admin-dashboard fade-in">
        {backLink}

        <section className="asg-head fade-in" aria-labelledby="result-heading">
          <p className="text-meta uppercase">{passed ? 'Passed' : 'Not passed'}</p>
          <h1 id="result-heading">{test?.title || 'Practice result'}</h1>
          <div className="student-assignment-meta" style={{ marginTop: 'var(--space-3)' }}>
            {levelInfo.level ? (
              <span className={`badge ${LEVEL_BADGE_CLASS[levelInfo.level] || 'badge-neutral'}`}>
                {levelInfo.level}
              </span>
            ) : null}
            {levelInfo.topic ? <span>{levelInfo.topic}</span> : null}
            <span>{courseTitle}</span>
          </div>

          <dl className="meta-grid" style={{ marginTop: 'var(--space-5)' }}>
            <div>
              <dt>Attempt number</dt>
              <dd>#{attempt?.attemptNumber ?? '-'}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{evaluated ? formatDateTime(attempt?.submittedAt) : 'Not submitted yet'}</dd>
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
            <section
              className={`result-hero ${passed ? 'result-pass' : 'result-fail'} fade-in`}
              aria-label="Result summary"
            >
              <p className="text-meta uppercase">{passed ? 'Passed' : 'Not passed'}</p>
              <p className="result-percentage">{percentage}%</p>
              <p className="result-score">
                {passed ? 'PASSED' : 'NOT PASSED'} {' · '}You scored {attempt?.score ?? 0} out of{' '}
                {totalMarks} {' · '}Passing score {passingScore}%
              </p>

              <div style={{ maxWidth: '420px', margin: 'var(--space-5) auto 0' }}>
                <ProgressBar
                  value={percentage}
                  label={`Score ${attempt?.score ?? 0}/${totalMarks}`}
                />
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
                {questions.length === 0 ? (
                  <EmptyState title="No questions available" message="Review is unavailable for this attempt." />
                ) : (
                  questions.map((question, index) => {
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
                          <Badge status={isCorrect ? 'passed' : notAnswered ? 'pending' : 'rejected'}>
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
                            {selectedIndex === null
                              ? 'Not answered'
                              : question.options[selectedIndex] || optionLetter(selectedIndex)}
                          </span>
                        </p>

                        <p className="text-sm" style={{ margin: 'var(--space-2) 0 0' }}>
                          <strong>Correct answer:</strong>{' '}
                          {correctIndex === null
                            ? 'Unavailable'
                            : question.options[correctIndex] || optionLetter(correctIndex)}
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
                  })
                )}
              </div>
            </section>

            <div
              className="student-assignment-submit"
              style={{
                marginTop: 'var(--space-6)',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <Button type="button" variant="outline" onClick={scrollToReview}>
                Review Answers
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/mcqs', { state: { retryTestId: test?.id } })}
              >
                Retry Practice
              </Button>
              <Button type="button" onClick={() => go('home')}>
                Back to Progress
              </Button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Card>
              <h3>Attempt submitted</h3>
              <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
                This attempt is waiting for evaluation. Check back soon for your score.
              </p>
            </Card>
            <div
              className="student-assignment-submit"
              style={{
                marginTop: 'var(--space-6)',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/mcqs', { state: { retryTestId: test?.id } })}
              >
                Retry Practice
              </Button>
              <Button type="button" onClick={() => go('home')}>
                Back to Progress
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'classes') {
    const completedClasses = classItems.filter((item) => item.completed);
    const incompleteClasses = classItems.filter((item) => !item.completed);

    const renderClassCard = (item) => (
      <Card key={item.id} variant="student-class-card">
        <div>
          <div className="student-assignment-meta">
            <span>{item.courseTitle}</span>
            <span>
              {item.completed
                ? `Watched ${formatDate(item.completedAt)}`
                : item.module
                  ? `Module: ${item.module}`
                  : 'Not watched'}
            </span>
          </div>
          <h3>{item.title}</h3>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <ProgressBar value={item.completed ? 100 : 0} label="Progress" />
          </div>
        </div>
        <div className="student-class-actions">
          <Badge status={item.completed ? 'completed' : 'pending'}>
            {item.completed ? 'Completed' : 'Not started'}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => navigate(`/classes/${item.id}`)}>
            {item.completed ? 'View' : 'Continue'}
          </Button>
        </div>
      </Card>
    );

    return (
      <div className="admin-dashboard fade-in">
        {backLink}
        {pageHeader('Classes Progress', 'Watch published classes to build your class progress.')}
        {coursePicker}

        <section className="admin-stat-grid" aria-label="Classes summary">
          <Card>
            <p className="admin-stat-value stat-teal">
              {overall.classes.completed} / {overall.classes.total}
            </p>
            <p className="admin-stat-label">Completed</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <ProgressBar value={overall.classes.pct} />
            </div>
          </Card>
          <Card>
            <p className="admin-stat-value stat-amber">{classesPending}</p>
            <p className="admin-stat-label">Pending</p>
          </Card>
          <Card>
            <p className="admin-stat-value stat-indigo">{courses.length}</p>
            <p className="admin-stat-label">Courses</p>
          </Card>
        </section>

        <section className="admin-quick-actions" aria-labelledby="completed-classes-heading">
          <div className="section-head">
            <div>
              <h2 id="completed-classes-heading">Completed Classes</h2>
            </div>
          </div>
          {completedClasses.length === 0 ? (
            <EmptyState
              title="No completed classes"
              message="Classes you watch will appear here."
            />
          ) : (
            <div className="student-classes-grid">{completedClasses.map(renderClassCard)}</div>
          )}
        </section>

        <section className="admin-quick-actions" aria-labelledby="incomplete-classes-heading">
          <div className="section-head">
            <div>
              <h2 id="incomplete-classes-heading">Incomplete Classes</h2>
            </div>
          </div>
          {incompleteClasses.length === 0 ? (
            <EmptyState title="All classes completed" message="Every published class is watched." />
          ) : (
            <div className="student-classes-grid">{incompleteClasses.map(renderClassCard)}</div>
          )}
        </section>
      </div>
    );
  }

  if (view === 'assignments') {
    return (
      <div className="admin-dashboard fade-in">
        {backLink}
        {pageHeader(
          'Assignments Progress',
          'Assignments count as completed once your submission succeeds.'
        )}
        {coursePicker}

        <section className="admin-stat-grid" aria-label="Assignments summary">
          <Card>
            <p className="admin-stat-value stat-indigo">{overall.assignments.pct}%</p>
            <p className="admin-stat-label">Completion</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <ProgressBar value={overall.assignments.pct} />
            </div>
          </Card>
          <Card>
            <p className="admin-stat-value stat-teal">{overall.assignments.completed}</p>
            <p className="admin-stat-label">Completed</p>
          </Card>
          <Card>
            <p className="admin-stat-value stat-amber">{assignmentsPending}</p>
            <p className="admin-stat-label">Pending</p>
          </Card>
          <Card>
            <p className="admin-stat-value stat-coral">{assignmentsOverdue}</p>
            <p className="admin-stat-label">Overdue</p>
          </Card>
        </section>

        <section className="admin-quick-actions" aria-labelledby="assignment-list-heading">
          <div className="section-head">
            <div>
              <h2 id="assignment-list-heading">All Assignments</h2>
            </div>
          </div>
          {assignmentItems.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              message="Published assignments for your courses will appear here."
            />
          ) : (
            <div className="student-mcq-result-list">
              {assignmentItems.map((assignment) => (
                <div key={assignment.id} className="student-mcq-result-row">
                  <div className="student-mcq-result-row-head">
                    <div>
                      <h3>{assignment.title}</h3>
                      <div className="student-assignment-meta">
                        <span>{assignment.courseTitle}</span>
                        <span>
                          {assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : 'No due date'}
                        </span>
                        {assignment.submittedAt ? (
                          <span>Submitted {formatDate(assignment.submittedAt)}</span>
                        ) : null}
                        {assignment.marks !== null && assignment.marks !== undefined ? (
                          <span>
                            Score {assignment.marks} / {assignment.maxMarks}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Badge status={assignment.status === 'overdue' ? 'late' : assignment.status}>
                      {assignment.status === 'completed'
                        ? 'Completed'
                        : assignment.status === 'overdue'
                          ? 'Overdue'
                          : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (view === 'mcq') {
    return (
      <div className="admin-dashboard fade-in">
        {backLink}
        {pageHeader('MCQ / Practice Progress', 'Your latest attempt score drives your current performance.')}
        {coursePicker}

        <section className="admin-stat-grid" aria-label="Practice summary">
          <Card>
            <p className="admin-stat-value stat-teal">
              {overall.mcq.attempted} / {overall.mcq.total}
            </p>
            <p className="admin-stat-label">Sets Practiced</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <ProgressBar value={overall.mcq.pct} />
            </div>
          </Card>
          <Card>
            <p className="admin-stat-value stat-indigo">
              {mcqHasScores ? `${mcqBestScore}%` : '-'}
            </p>
            <p className="admin-stat-label">Best Score</p>
          </Card>
          <Card>
            <p className="admin-stat-value stat-amber">{mcqTotalAttempts}</p>
            <p className="admin-stat-label">Total Attempts</p>
          </Card>
        </section>

        <section className="admin-quick-actions" aria-labelledby="practice-list-heading">
          <div className="section-head">
            <div>
              <h2 id="practice-list-heading">Practice Sets</h2>
            </div>
          </div>
          {mcqItems.length === 0 ? (
            <EmptyState
              title="No practice sets yet"
              message="Practice sets published for your courses will appear here."
            />
          ) : (
            <div className="student-classes-grid">
              {mcqItems.map((item) => {
                const { level, topic } = decodeDescription(item.description);
                const badge = !item.attempted
                  ? { status: 'pending', label: 'Not attempted' }
                  : item.latestPassed
                    ? { status: 'passed', label: 'Passed' }
                    : { status: 'failed', label: 'Needs practice' };
                const historyOpen = openHistory === item.id;

                return (
                  <Card key={item.id} variant="student-class-card">
                    <div>
                      <div className="student-assignment-meta">
                        {level ? (
                          <span className={`badge ${LEVEL_BADGE_CLASS[level] || 'badge-neutral'}`}>
                            {level}
                          </span>
                        ) : null}
                        {topic ? <span>{topic}</span> : null}
                        <span>{item.courseTitle}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
                        {item.attemptsCount > 0
                          ? `Latest ${item.latestScore}% · Best ${item.bestScore}% · ${item.attemptsCount} attempt${
                              item.attemptsCount > 1 ? 's' : ''
                            }`
                          : 'Not attempted yet'}
                      </p>
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <Badge status={badge.status}>{badge.label}</Badge>
                      </div>

                      {historyOpen ? (
                        <div
                          style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}
                        >
                          <p className="text-meta uppercase" style={{ margin: 0 }}>
                            Attempt History
                          </p>
                          {item.history.length === 0 ? (
                            <p className="text-meta" style={{ margin: 0 }}>
                              No attempts yet.
                            </p>
                          ) : (
                            item.history.map((attempt) => (
                              <div
                                key={attempt.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 'var(--space-2)',
                                  alignItems: 'center',
                                }}
                              >
                                <span className="text-sm">
                                  #{attempt.attemptNumber} · {formatDate(attempt.submittedAt)}
                                </span>
                                <Badge status={attempt.passed ? 'passed' : 'failed'}>
                                  {attempt.percentage}%
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="student-class-actions">
                      {item.attemptsCount > 0 ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openResult(item)}>
                            View Result
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startPractice(item)}>
                            Reattempt
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => startPractice(item)}>
                          Start Practice
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpenHistory(historyOpen ? null : item.id)}
                      >
                        {historyOpen ? 'Hide History' : 'Attempt History'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
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

  const courseStatus = (course) => {
    if (course.overallPct >= 100) return { status: 'completed', label: 'Completed' };
    if (course.overallPct > 0) return { status: 'in_progress', label: 'In progress' };
    return { status: 'pending', label: 'Not started' };
  };

  return (
    <div className="admin-dashboard fade-in">
      {pageHeader('My Progress', 'Track your classes, assignments, and practice in one place.')}
      {coursePicker}

      <section className="admin-stat-grid" aria-label="Progress summary">
        <Card>
          <p className="admin-stat-value stat-indigo">{overall.pct}%</p>
          <p className="admin-stat-label">Overall Progress</p>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <ProgressBar value={overall.pct} />
          </div>
          <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
            {overall.completedActivities} of {overall.totalActivities} activities complete
          </p>
        </Card>
        <Card>
          <p className="admin-stat-value stat-teal">
            {overall.classes.completed} / {overall.classes.total}
          </p>
          <p className="admin-stat-label">Classes</p>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={() => go('classes')}>
              View
            </Button>
          </div>
        </Card>
        <Card>
          <p className="admin-stat-value stat-amber">
            {overall.assignments.completed} / {overall.assignments.total}
          </p>
          <p className="admin-stat-label">Assignments</p>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={() => go('assignments')}>
              View
            </Button>
          </div>
        </Card>
        <Card>
          <p className="admin-stat-value stat-coral">
            {overall.mcq.attempted} / {overall.mcq.total}
          </p>
          <p className="admin-stat-label">MCQ Practice</p>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="outline" onClick={() => go('mcq')}>
              View
            </Button>
          </div>
        </Card>
      </section>

      <section className="admin-quick-actions" aria-labelledby="continue-heading">
        <div className="section-head">
          <div>
            <h2 id="continue-heading">Continue Learning</h2>
          </div>
        </div>

        {!continueLearning ? (
          <Card>
            <p className="text-meta" style={{ margin: 0 }}>
              You are all caught up — nothing incomplete left in this selection.
            </p>
          </Card>
        ) : (
          <Card variant="student-class-card">
            <div>
              <div className="student-assignment-meta">
                <span>{continueKind(continueLearning.type)}</span>
                <span>{continueLearning.courseTitle}</span>
              </div>
              <h3>{continueLearning.title}</h3>
              <p className="text-meta" style={{ margin: 'var(--space-2) 0 0' }}>
                {continueDetail(continueLearning)}
              </p>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <ProgressBar value={continueLearning.pct || 0} label="Course progress" />
              </div>
            </div>
            <div className="student-class-actions">
              <Button size="sm" onClick={handleContinue}>
                Continue
              </Button>
            </div>
          </Card>
        )}
      </section>

      <section className="admin-quick-actions" aria-labelledby="course-wise-heading">
        <div className="section-head">
          <div>
            <h2 id="course-wise-heading">Course-wise Progress</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {courses.map((course) => {
            const status = courseStatus(course);
            return (
              <Card key={course.id}>
                <div className="student-assignment-card-head">
                  <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-h4)' }}>{course.title}</h3>
                    <p className="text-meta" style={{ margin: 'var(--space-1) 0 0' }}>
                      {course.classes.total} classes · {course.assignments.total} assignments ·{' '}
                      {course.mcq.total} practice sets
                    </p>
                  </div>
                  <Badge status={status.status}>{status.label}</Badge>
                </div>

                <div style={{ marginTop: 'var(--space-4)' }}>
                  <ProgressBar value={course.overallPct} label="Course progress" />
                </div>

                <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  {course.classes.topics.length > 0 ? (
                    course.classes.topics.map((topic) => (
                      <ProgressBar key={topic.name} value={topic.pct} label={topic.name} />
                    ))
                  ) : (
                    <p className="text-meta" style={{ margin: 0 }}>
                      No classes published yet.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="admin-quick-actions" aria-labelledby="activity-heading">
        <div className="section-head">
          <div>
            <h2 id="activity-heading">Recent Activity</h2>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            message="Your class completions, submissions, and attempts will appear here."
          />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {recentActivity.map((item) => (
              <Card key={item.id} variant="card-notification">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-2)',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Badge status={item.status}>{item.kind}</Badge>
                    <span className="text-meta">{formatDate(item.at)}</span>
                  </div>
                  <h3 className="text-h4" style={{ margin: 'var(--space-2) 0 var(--space-1)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
