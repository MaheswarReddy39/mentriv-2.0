import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClassById } from '../../services/class.service.js';
import { getCourseProgress, completeLesson } from '../../services/progress.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';

export default function ClassDetailPage() {
  const { classId } = useParams();
  const toast = useToast();

  const [lesson, setLesson] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getClassById(classId);
        if (cancelled) return;
        setLesson(res.data.lesson);

        const courseIdValue =
          res.data.lesson.courseId || res.data.lesson.course?.id;
        if (courseIdValue) {
          setCourseId(courseIdValue);
          try {
            const p = await getCourseProgress(courseIdValue);
            if (!cancelled) {
              setAlreadyCompleted(
                (p.data.progress.completedLessons || []).some((l) => l.lessonId === classId)
              );
            }
          } catch {
            // progress state is optional here
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err.statusCode === 403) {
            setError('You do not have active access to this lesson.');
          } else if (err.statusCode === 404) {
            setError('Lesson not found.');
          } else {
            setError(err.message || 'Failed to load this lesson');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [classId]);

  const handleMarkComplete = async () => {
    if (!courseId || alreadyCompleted || marking) return;
    setMarking(true);
    try {
      await completeLesson(courseId, classId);
      setAlreadyCompleted(true);
      toast.success('Lesson marked as complete.');
    } catch (err) {
      toast.error(err.message || 'Could not mark this lesson complete.');
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <Loading label="Loading lessonâ€¦" />;

  if (error && !lesson) {
    return (
      <>
        <Link to="/my-courses" className="back-link">Back to My Courses</Link>
        <ErrorState title="Lesson unavailable" message={error} onRetry={() => window.location.reload()} />
      </>
    );
  }

  return (
    <>
      <Link to={`/courses/${courseId}/learn`} className="back-link">
        â† Back to course
      </Link>

      {lesson.videoUrl ? (
        <div className="class-video-card">
          <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Watch Class
          </a>
        </div>
      ) : (
        <div className="video-frame video-placeholder" aria-label="Video coming soon">
          <p style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
            No Class
          </p>
        </div>
      )}

      <section className="fade-in" aria-labelledby="lesson-heading" style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h1 id="lesson-heading">{lesson.title}</h1>
          <Badge status={lesson.status}>{lesson.status}</Badge>
        </div>

        {lesson.module ? <p className="text-meta uppercase">Module: {lesson.module}</p> : null}

        {lesson.description ? (
          <Card style={{ marginTop: 'var(--space-4)' }}>
            <p style={{ margin: 0 }}>{lesson.description}</p>
          </Card>
        ) : null}

        <Card style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ marginBottom: 2 }}>Mark as completed</h3>
              <p className="text-meta" style={{ margin: 0 }}>
                {alreadyCompleted ? 'This lesson is in your completed list.' : 'Add this lesson to your course progress.'}
              </p>
            </div>
            <Button onClick={handleMarkComplete} disabled={alreadyCompleted} variant={alreadyCompleted ? 'secondary' : 'primary'}>
              {alreadyCompleted ? 'âœ“ Completed' : 'Mark as completed'}
            </Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="resources-heading" style={{ marginTop: 'var(--space-8)' }}>
        <h2 id="resources-heading">Resources</h2>
        {Array.isArray(lesson.resources) && lesson.resources.length > 0 ? (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {lesson.resources.map((resource) => (
              <a
                key={resource.title}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-row"
              >
                <span aria-hidden="true">ðŸ“„</span>
                <span style={{ flex: 1 }}>{resource.title}</span>
                <span className="link-arrow text-sm">Open</span>
              </a>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>No Notes</p>
          </Card>
        )}
      </section>
    </>
  );
}
