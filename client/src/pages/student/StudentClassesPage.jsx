import { useEffect, useMemo, useState } from 'react';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { listCourseClasses } from '../../services/class.service.js';
import { completeLesson } from '../../services/progress.service.js';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';

const ACTIVE_STATUSES = ['approved', 'completed'];

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const getNotesUrl = (recordedClass) => {
  const notes = (recordedClass.resources || []).find((resource) =>
    String(resource.title || '').toLowerCase().includes('note')
  );
  return notes?.url || recordedClass.resources?.[0]?.url || '';
};

const openExternalLink = (url) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default function StudentClassesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [classes, setClasses] = useState([]);

  const handleWatchClass = (recordedClass, videoUrl) => {
    const courseId = getCourseId(selectedEnrollment);
    if (courseId) {
      completeLesson(courseId, recordedClass.id)
        .then((res) => {
          if (res?.data && res.data.alreadyCompleted === false) {
            toast.success('Class marked as complete.');
          }
        })
        .catch((err) => toast.error(err.message || 'Could not update class progress.'));
    }
    openExternalLink(videoUrl);
  };

  const loadClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const enrollmentRes = await getMyEnrollments({ limit: 50 });
      const enrollments = enrollmentRes?.data?.enrollments || [];
      const activeEnrollments = enrollments.filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );
      const enrollment = activeEnrollments[0] || null;
      setSelectedEnrollment(enrollment);

      const courseId = getCourseId(enrollment);
      if (!courseId) {
        setClasses([]);
        return;
      }

      const classesRes = await listCourseClasses(courseId);
      setClasses(classesRes?.data?.lessons || []);
    } catch (err) {
      setError(err.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const selectedCourseTitle = selectedEnrollment?.course?.title || '';
  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [classes]
  );

  return (
    <div className="admin-dashboard student-classes-page fade-in">
      <header className="admin-dashboard-header">
        <div>
          <h1>Classes</h1>
          {selectedCourseTitle ? <p className="admin-welcome">{selectedCourseTitle}</p> : null}
        </div>
      </header>

      <section className="admin-quick-actions" aria-labelledby="recorded-classes-heading">
        <h2 id="recorded-classes-heading" className="student-classes-heading">
          Recorded Classes
        </h2>

        {loading ? (
          <div className="student-classes-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="card">
                <Skeleton height="1.1rem" width="70%" />
                <Skeleton height="2.25rem" width="55%" style={{ marginTop: 'var(--space-4)' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadClasses} />
        ) : sortedClasses.length === 0 ? (
          <EmptyState title="No recorded classes" message="Recorded classes will appear here." />
        ) : (
          <div className="student-classes-grid">
            {sortedClasses.map((recordedClass) => {
              const notesUrl = getNotesUrl(recordedClass);
              const videoUrl = recordedClass.videoUrl || '';

              return (
                <Card key={recordedClass.id} variant="student-class-card">
                  <h3>{recordedClass.title}</h3>
                  <div className="student-class-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={!notesUrl}
                      onClick={() => openExternalLink(notesUrl)}
                    >
                      Notes
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={!videoUrl}
                      onClick={() => handleWatchClass(recordedClass, videoUrl)}
                    >
                      Watch Class
                    </button>
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
