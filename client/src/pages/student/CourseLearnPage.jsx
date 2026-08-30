import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { getCourseProgress } from '../../services/progress.service.js';
import { listCourseClasses } from '../../services/class.service.js';
import { listCourseAssignments } from '../../services/assignment.service.js';
import { listCourseMcqTests } from '../../services/mcq.service.js';
import { getMySubmissions } from '../../services/submission.service.js';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const TABS = ['Overview', 'Classes', 'Assignments', 'MCQs', 'Progress'];

const getNotesResource = (lesson) =>
  (lesson.resources || []).find((resource) => resource.title?.toLowerCase() === 'notes') ||
  (lesson.resources || [])[0] ||
  null;

export default function CourseLearnPage() {
  const { courseId } = useParams();
  const [activeTab, setActiveTab] = useState('Classes');

  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState(null); // lazy
  const [submissionByAssignment, setSubmissionByAssignment] = useState({}); // lazy
  const [mcqTests, setMcqTests] = useState(null); // lazy

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCore() {
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const enrRes = await getMyEnrollments({ limit: 50 });
        const match = enrRes.data.enrollments.find((e) => e.course.id === courseId);
        if (!match) {
          setForbidden(true);
          return;
        }
        setEnrollment(match);

        const [progressRes, classesRes] = await Promise.all([
          getCourseProgress(courseId),
          listCourseClasses(courseId),
        ]);
        if (cancelled) return;
        setProgress(progressRes.data.progress);
        setLessons(classesRes.data.lessons);
      } catch (err) {
        if (!cancelled) {
          if (err.statusCode === 403) setForbidden(true);
          else setError(err.message || 'Failed to load this course');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCore();
    return () => { cancelled = true; };
  }, [courseId]);

  // Lazy-load assignments / mcqs when their tab opens first
  useEffect(() => {
    let cancelled = false;

    async function loadTab() {
      try {
        if (activeTab === 'Assignments' && assignments === null) {
          const [asgRes, subRes] = await Promise.all([
            listCourseAssignments(courseId),
            getMySubmissions({ limit: 50 }).catch(() => ({ data: { submissions: [] } })),
          ]);
          if (!cancelled) {
            setAssignments(asgRes.data.assignments);
            const byAssignment = {};
            for (const s of subRes.data.submissions || []) {
              if (s.assignment?.id && !byAssignment[s.assignment.id]) {
                byAssignment[s.assignment.id] = s;
              }
            }
            setSubmissionByAssignment(byAssignment);
          }
        }
        if (activeTab === 'MCQs' && mcqTests === null) {
          const res = await listCourseMcqTests(courseId);
          if (!cancelled) setMcqTests(res.data.mcqTests);
        }
      } catch {
        if (!cancelled) {
          if (activeTab === 'Assignments') setAssignments([]);
          if (activeTab === 'MCQs') setMcqTests([]);
        }
      }
    }

    loadTab();
    return () => { cancelled = true; };
  }, [activeTab, courseId, assignments, mcqTests]);

  const completedLessonIds = useMemo(
    () => new Set((progress?.completedLessons || []).map((l) => l.lessonId)),
    [progress]
  );

  const modules = useMemo(() => {
    const map = new Map();
    lessons.forEach((lesson, index) => {
      const key = lesson.module || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...lesson, index });
    });
    return Array.from(map.entries());
  }, [lessons]);

  const nextLesson = lessons.find((l) => !completedLessonIds.has(l.id));

  if (loading) return <Loading label="Loading your courseâ€¦" />;

  if (forbidden) {
    return (
      <ErrorState
        title="No active access"
        message="An approved enrollment is required to open this course."
        onRetry={() => window.location.assign('/my-courses')}
      />
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const pct = progress?.overallPercentage ?? 0;
  const courseTitle = enrollment?.course.title || 'Your course';

  return (
    <>
      <Link to="/my-courses" className="back-link">Back to My Courses</Link>

      {/* Course header */}
      <section className="learn-header fade-in" aria-labelledby="learn-heading">
        <div className="learn-glow" aria-hidden="true" />
        <div className="learn-head-main">
          <h1 id="learn-heading">{courseTitle}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 'var(--space-2) 0 var(--space-4)' }}>
            {enrollment?.status === 'completed'
              ? 'You have completed this course â€” review any lesson whenever you like.'
              : 'Work through the modules in order to complete this course.'}
          </p>
          <ProgressBar value={pct} label="Overall course progress" />
        </div>
        <div className="learn-head-side">
          <Badge status={enrollment.status}>{enrollment.status}</Badge>
        </div>
      </section>

      {/* Tabs */}
      <div className="tab-pills" role="tablist" aria-label="Course sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`tab-pill${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ---------------- CLASSES ---------------- */}
      {activeTab === 'Classes' ? (
        lessons.length === 0 ? (
          <EmptyState title="No lessons published yet" message="Lessons will appear here as soon as they are published." />
        ) : (
          modules.map(([moduleName, moduleLessons], moduleIndex) => (
            <section key={moduleName} aria-label={`Module: ${moduleName}`} style={{ marginBottom: 'var(--space-6)' }}>
              <div className="module-block">
                <span className="text-meta uppercase">
                  Module {String(moduleIndex + 1).padStart(2, '0')}
                </span>
                <h3>{moduleName}</h3>
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {moduleLessons.map((lesson) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const isNext = nextLesson?.id === lesson.id;
                  const notes = getNotesResource(lesson);
                  void isNext;
                  return (
                    <article key={lesson.id} className={`lesson-class-card${isCompleted ? ' completed' : ''}`}>
                      <span className={`lesson-status ${isCompleted ? 'ic-check' : 'ic-dot'}`} aria-hidden="true">
                        {isCompleted ? 'âœ“' : 'â—'}
                      </span>
                      <span className="lesson-row-main">
                        <Link to={`/classes/${lesson.id}`} style={{ fontWeight: 500, color: 'var(--text)' }}>
                          {lesson.title}
                        </Link>
                        <span className="text-meta" style={{ display: 'block' }}>
                          {lesson.duration ? `${lesson.duration} min` : 'â€”'}
                        </span>
                      </span>
                      <span className="lesson-row-actions">
                        {lesson.videoUrl ? (
                          <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                            Watch Class
                          </a>
                        ) : (
                          <span className="text-meta">No Class</span>
                        )}
                        {notes ? (
                          <a href={notes.url} target="_blank" rel="noopener noreferrer" className="link-arrow text-sm">
                            Notes
                          </a>
                        ) : (
                          <span className="text-meta">No Notes</span>
                        )}
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )
      ) : null}

      {/* ---------------- ASSIGNMENTS ---------------- */}
      {activeTab === 'Assignments' ? (
        assignments === null ? (
          <Loading label="Loading assignments…" />
        ) : assignments.length === 0 ? (
          <EmptyState title="No assignments yet" message="Published assignments will appear here." />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {assignments.map((assignment) => {
              const submission = submissionByAssignment[assignment.id];
              const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
              const overdue = dueDate && dueDate.getTime() < Date.now();

              return (
                <Link
                  key={assignment.id}
                  to={`/assignments/${assignment.id}`}
                  className="card asg-row"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="clamp-1">{assignment.title}</h3>
                    {assignment.dueDate ? (
                      <p className={`text-meta ${overdue ? 'due-overdue' : ''}`} style={{ margin: 'var(--space-1) 0' }}>
                        Due {dueDate.toLocaleDateString('en-IN')}
                      </p>
                    ) : (
                      <p className="text-meta" style={{ margin: 'var(--space-1) 0' }}>No due date</p>
                    )}
                    <p className="text-meta" style={{ margin: 0 }}>Max marks: {assignment.maxMarks}</p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {submission ? (
                      <>
                        <Badge status={submission.status}>
                          {submission.status === 'late' ? 'Late' : submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </Badge>
                        {submission.marks !== null && submission.marks !== undefined ? (
                          <p className="text-meta" style={{ margin: 'var(--space-1) 0 0' }}>
                            {submission.marks} marks
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <Badge status={assignment.status === 'published' ? 'info' : 'neutral'}>
                        {assignment.status === 'published' ? 'Open to submit' : assignment.status}
                      </Badge>
                    )}
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        )
      ) : null}

      {/* ---------------- MCQS ---------------- */}
      {activeTab === 'MCQs' ? (
        mcqTests === null ? (
          <Loading label="Loading testsâ€¦" />
        ) : mcqTests.length === 0 ? (
          <EmptyState title="No MCQ tests yet" message="Published tests will appear here." />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {mcqTests.map((test) => (
              <Link key={test.id} to={`/mcq-tests/${test.id}`} className="card asg-row">
                <h3>{test.title}</h3>
                <p className="text-meta" style={{ margin: 0 }}>
                  {test.questions.length} questions
                  {test.duration ? ` Â· ${test.duration} minutes` : ''} Â· passing score {test.passingScore}%
                </p>
              </Link>
            ))}
          </div>
        )
      ) : null}

      {/* ---------------- OVERVIEW ---------------- */}
      {activeTab === 'Overview' ? (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Card>
            <h3>Course summary</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              {lessons.length} published lessons Â· {(progress?.completedAssignments || []).length} assignments
              submitted-and-graded items tracked Â· overall completion {pct}%.
            </p>
          </Card>

          <div className="stat-grid">
            <Card className="stat-card">
              <p className="stat-value stat-indigo">{lessons.length}</p>
              <p className="stat-label">Published lessons</p>
            </Card>
            {assignments !== null ? (
              <Card className="stat-card">
                <p className="stat-value stat-violet">{assignments.length}</p>
                <p className="stat-label">Assignments</p>
              </Card>
            ) : null}
            {mcqTests !== null ? (
              <Card className="stat-card">
                <p className="stat-value stat-teal">{mcqTests.length}</p>
                <p className="stat-label">MCQ tests</p>
              </Card>
            ) : null}
          </div>

          {nextLesson ? (
            <Card>
              <p className="text-meta uppercase" style={{ margin: 0 }}>Up next</p>
              <h3>{nextLesson.title}</h3>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('Classes')}>
                Go to Classes
              </button>
            </Card>
          ) : lessons.length > 0 ? (
            <EmptyState title="All lessons completed ðŸŽ‰" message="Great work finishing this course." />
          ) : null}
        </div>
      ) : null}

      {/* ---------------- PROGRESS ---------------- */}
      {activeTab === 'Progress' ? (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Card variant="card-elevated">
            <h3>Overall progress</h3>
            <ProgressBar value={pct} label={`${pct}% complete`} />
            <p className="text-meta" style={{ margin: 'var(--space-3) 0 0' }}>
              Based on published lessons, assignments and MCQ tests in this course.
            </p>
          </Card>

          <div className="stat-grid">
            <Card className="stat-card">
              <p className="stat-value stat-teal">{completedLessonIds.size}</p>
              <p className="stat-label">Lessons completed</p>
            </Card>
            <Card className="stat-card">
              <p className="stat-value stat-violet">{(progress?.completedAssignments || []).length}</p>
              <p className="stat-label">Assignments completed</p>
            </Card>
            <Card className="stat-card">
              <p className="stat-value stat-coral">{(progress?.completedMcqs || []).length}</p>
              <p className="stat-label">MCQ tests completed</p>
            </Card>
          </div>

          {progress?.lastCompletedAt ? (
            <p className="text-meta">
              Last activity: {new Date(progress.lastCompletedAt).toLocaleDateString('en-IN')}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
