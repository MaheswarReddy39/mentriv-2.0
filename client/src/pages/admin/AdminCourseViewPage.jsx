import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import NotFoundPage from '../NotFoundPage.jsx';
import { getAdminCourseById } from '../../services/course.service.js';
import { formatCurrency } from '../../utils/format.js';

const LEVEL_LABELS = {
  basic: 'Basic',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const capitalize = (value = '') =>
  String(value).replace(/\b\w/g, (char) => char.toUpperCase());

const formatDuration = (duration) => {
  const hours = Number(duration);
  if (!Number.isFinite(hours) || hours <= 0) return 'Self-paced';
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
};

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return '—';
  if (Number(price) === 0) return 'Free';
  return formatCurrency(price) || '—';
};

export default function AdminCourseViewPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const response = await getAdminCourseById(courseId);
        if (!cancelled) setCourse(response.data.course);
      } catch (err) {
        if (cancelled) return;
        if (err.statusCode === 404) setNotFound(true);
        else setError(err.message || 'Failed to load this course.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) return <Loading label="Loading course..." />;
  if (notFound) return <NotFoundPage />;
  if (error) {
    return (
      <ErrorState
        title="Failed to load course"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (!course) return <NotFoundPage />;

  const levelLabel = LEVEL_LABELS[course.level] || capitalize(course.level) || '—';
  const statusLabel =
    STATUS_LABELS[course.status] || capitalize(course.status) || '—';

  return (
    <div className="course-detail-page">
      <p className="course-detail-back">
        <Link to="/admin/courses" className="back-link">
          Back to courses
        </Link>
      </p>

      <div className="course-detail-shell">
        {course.thumbnail ? (
          <img
            className="course-detail-image"
            src={course.thumbnail}
            alt={`Cover image for ${course.title}`}
          />
        ) : (
          <div className="course-detail-image admin-course-view-fallback" aria-hidden="true">
            M
          </div>
        )}

        <div className="course-detail-content">
          <div>
            <h1>{course.title}</h1>
            {course.shortDescription ? (
              <p className="course-detail-description">{course.shortDescription}</p>
            ) : null}
          </div>

          {course.description ? (
            <section className="course-detail-section" aria-labelledby="admin-course-about-heading">
              <h2 id="admin-course-about-heading">About this course</h2>
              <p className="course-detail-description">{course.description}</p>
            </section>
          ) : null}

          {course.demoVideoUrl || course.demoVideoThumbnail ? (
            <section className="course-detail-section" aria-labelledby="admin-course-demo-heading">
              <h2 id="admin-course-demo-heading">Demo video</h2>
              {course.demoVideoThumbnail ? (
                <img
                  className="course-detail-demo"
                  src={course.demoVideoThumbnail}
                  alt={`Demo video thumbnail for ${course.title}`}
                />
              ) : null}
              {course.demoVideoUrl ? (
                <div>
                  <a
                    href={course.demoVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    Watch demo video
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="course-detail-section" aria-labelledby="admin-course-info-heading">
            <h2 id="admin-course-info-heading">Course information</h2>
            <dl className="course-info-panel">
              <div>
                <dt>Status</dt>
                <dd>{statusLabel}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{levelLabel}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{formatDuration(course.duration)}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{formatPrice(course.price)}</dd>
              </div>
              {course.category ? (
                <div>
                  <dt>Category</dt>
                  <dd>{capitalize(course.category)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <div className="course-detail-actions">
            <Link to={`/admin/courses/${course.id}/edit`} className="btn btn-primary">
              Edit course
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
