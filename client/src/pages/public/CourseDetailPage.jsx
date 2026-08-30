import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { archiveCourse, getCourseBySlug } from '../../services/course.service.js';
import { enrollInCourse } from '../../services/enrollment.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import NotFoundPage from '../NotFoundPage.jsx';
import useAuth from '../../hooks/useAuth.js';
import { formatCurrency } from '../../utils/format.js';

const isAdminRole = (role) => role === 'admin' || role === 'superAdmin';

const formatLevel = (level) => {
  if (!level) return '-';
  return String(level).charAt(0).toUpperCase() + String(level).slice(1);
};

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  const [course, setCourse] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(
    location.state?.updatedCourseTitle
      ? `Course "${location.state.updatedCourseTitle}" updated successfully.`
      : ''
  );
  const [enrolling, setEnrolling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setActionError(null);
      setNotFound(false);
      try {
        const response = await getCourseBySlug(slug);
        if (!cancelled) setCourse(response.data.course);
      } catch (err) {
        if (!cancelled) {
          if (err.statusCode === 404) setNotFound(true);
          else setError(err.message || 'Failed to load this course');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <Loading label="Loading course..." />;
  if (notFound) return <NotFoundPage />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const isAdmin = isAdminRole(role);

  const openDemoVideo = () => {
    if (course.demoVideoUrl) {
      window.open(course.demoVideoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEnroll = async () => {
    if (!course?.id || enrolling) return;

    setEnrolling(true);
    setActionError(null);
    setActionSuccess('');
    try {
      await enrollInCourse(course.id);
      setActionSuccess('Enrollment request submitted successfully.');
    } catch (err) {
      setActionError(err.message || 'Failed to submit enrollment request.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleArchive = async () => {
    if (!course?.id || deleting) return;

    setDeleting(true);
    setActionError(null);
    try {
      await archiveCourse(course.id);
      navigate('/admin/courses', { replace: true });
    } catch (err) {
      setActionError(err.message || 'Failed to delete course.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isAdmin) {
    return (
      <article className="admin-course-view-page">
        <section className="admin-course-view-shell" aria-labelledby="admin-course-view-title">
          <h1 id="admin-course-view-title">{course.title}</h1>

          {course.description ? (
            <p className="admin-course-view-description">{course.description}</p>
          ) : null}

          <section className="admin-course-view-section" aria-labelledby="admin-course-demo-heading">
            <h2 id="admin-course-demo-heading">WATCH THE DEMO VIDEO</h2>
            <div className="admin-course-view-demo-card">
              <div className="admin-course-view-demo-preview" aria-label="Demo video thumbnail preview">
                {course.demoVideoThumbnail ? (
                  <img src={course.demoVideoThumbnail} alt={`Demo video thumbnail for ${course.title}`} />
                ) : (
                  <div className="demo-video-empty">
                    <span className="demo-play-indicator" aria-hidden="true" />
                    <span>Demo video</span>
                  </div>
                )}
              </div>
              {course.demoVideoUrl ? (
                <button type="button" className="btn btn-primary btn-sm admin-course-view-watch" onClick={openDemoVideo}>
                  Watch Now
                </button>
              ) : null}
            </div>
          </section>

          <section className="admin-course-view-section" aria-labelledby="admin-course-info-heading">
            <h2 id="admin-course-info-heading">Course Information</h2>
            <dl className="course-info-panel admin-course-view-info">
              <div>
                <dt>Duration</dt>
                <dd>{course.duration ? `${course.duration} hours` : '-'}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{formatLevel(course.level)}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{formatCurrency(course.price)}</dd>
              </div>
            </dl>
          </section>

          {actionSuccess ? <p className="admin-course-notice" role="status">{actionSuccess}</p> : null}
          {actionError ? <ErrorState message={actionError} /> : null}

          <section className="admin-course-view-actions" aria-label="Admin course actions">
            <Link to={`/admin/courses/${course.id}/edit`} className="btn btn-primary">
              Edit
            </Link>
            <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </section>
        </section>

        <p className="course-detail-back">
          <Link to="/admin/courses">Back to courses</Link>
        </p>

        <Modal
          open={deleteOpen}
          onClose={deleting ? undefined : () => setDeleteOpen(false)}
          title="Delete Course?"
          footer={(
            <>
              <Button type="button" variant="ghost" disabled={deleting} onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" loading={deleting} disabled={deleting} onClick={handleArchive}>
                {deleting ? 'Deleting...' : 'Delete Course'}
              </Button>
            </>
          )}
        >
          <p>
            {course.title} will be removed from the website. Historical enrollments,
            progress, submissions, and payments will be preserved.
          </p>
        </Modal>
      </article>
    );
  }

  return (
    <article className="student-course-view-page">
      <section className="student-course-view-shell" aria-labelledby="student-course-view-title">
        <Badge status={course.level}>{formatLevel(course.level)}</Badge>
        <h1 id="student-course-view-title">{course.title}</h1>

        {course.description ? (
          <p className="student-course-view-description">{course.description}</p>
        ) : null}

        <section className="student-course-view-section" aria-labelledby="student-course-demo-heading">
          <h2 id="student-course-demo-heading">WATCH THE DEMO VIDEO</h2>
          <div className="student-course-view-demo-card">
            <div className="student-course-view-demo-preview" aria-label="Demo video thumbnail preview">
              {course.demoVideoThumbnail ? (
                <img src={course.demoVideoThumbnail} alt={`Demo video thumbnail for ${course.title}`} />
              ) : (
                <div className="demo-video-empty">
                  <span className="demo-play-indicator" aria-hidden="true" />
                  <span>Demo video</span>
                </div>
              )}
            </div>
            {course.demoVideoUrl ? (
              <button type="button" className="btn btn-primary btn-sm student-course-view-watch" onClick={openDemoVideo}>
                Watch Now
              </button>
            ) : null}
          </div>
        </section>

        <section className="student-course-view-section" aria-labelledby="student-course-info-heading">
          <h2 id="student-course-info-heading">Course Information</h2>
          <dl className="course-info-panel student-course-view-info">
            <div>
              <dt>Duration</dt>
              <dd>{course.duration ? `${course.duration} hours` : '-'}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{formatLevel(course.level)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{formatCurrency(course.price)}</dd>
            </div>
          </dl>
        </section>

        {actionSuccess ? <p className="admin-course-notice" role="status">{actionSuccess}</p> : null}
        {actionError ? <ErrorState message={actionError} /> : null}

        <section className="student-course-view-actions" aria-label="Course actions">
          {isAuthenticated ? (
            <Button type="button" loading={enrolling} disabled={enrolling} onClick={handleEnroll}>
              {enrolling ? 'Submitting...' : 'ENROLL NOW'}
            </Button>
          ) : (
            <Link to="/login" state={{ from: `/courses/${slug}` }} className="btn btn-primary">
              ENROLL NOW
            </Link>
          )}
        </section>
      </section>

      <p className="course-detail-back">
        <Link to="/courses">Back to all courses</Link>
      </p>
    </article>
  );
}
