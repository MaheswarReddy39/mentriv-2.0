import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { archiveCourse, getCourseBySlug } from '../../services/course.service.js';
import { enrollInCourse } from '../../services/enrollment.service.js';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import NotFoundPage from '../NotFoundPage.jsx';
import useAuth from '../../hooks/useAuth.js';
import { formatCurrency } from '../../utils/format.js';

const isAdminRole = (role) => role === 'admin' || role === 'superAdmin';

const LEVEL_LABELS = {
  basic: 'Beginner',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const capitalize = (value = '') =>
  String(value).replace(/\b\w/g, (char) => char.toUpperCase());

const formatLevel = (level) => {
  if (!level) return '-';
  return String(level).charAt(0).toUpperCase() + String(level).slice(1);
};

const formatPublicLevel = (level) => {
  if (!level) return '';
  return LEVEL_LABELS[level] || capitalize(level);
};

const formatDuration = (duration) => {
  const hours = Number(duration);
  if (!Number.isFinite(hours) || hours <= 0) return 'Self-paced';
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
};

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M15.5 10h-11M9 4.5 3.5 10 9 15.5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="6.75" />
    <path d="M10 6.5V10l2.4 1.6" />
  </svg>
);

const LevelIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4.5 15.5v-4M10 15.5v-7M15.5 15.5v-10" />
  </svg>
);

const TagIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3.5 9.2V4.8c0-.72.58-1.3 1.3-1.3h4.4c.35 0 .68.14.92.38l5.5 5.5a1.3 1.3 0 0 1 0 1.83l-4.4 4.4a1.3 1.3 0 0 1-1.83 0l-5.5-5.5a1.3 1.3 0 0 1-.39-.91Z" />
    <circle cx="7.1" cy="7.1" r="1.1" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M7 4.8v10.4c0 .62.68 1 1.22.68l8-5.2a.8.8 0 0 0 0-1.36l-8-5.2A.8.8 0 0 0 7 4.8Z" />
  </svg>
);

const ArrowUpRightIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
  </svg>
);

function CourseCover({ course, levelLabel }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(course.thumbnail) && !imageFailed;

  return (
    <div className="course-showcase-cover">
      {showImage ? (
        <img
          className="course-showcase-cover-image"
          src={course.thumbnail}
          alt={`Cover image for ${course.title}`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="course-showcase-cover-fallback" aria-hidden="true">
          <span className="course-showcase-cover-mark">M</span>
        </div>
      )}
      {levelLabel ? (
        <span className="course-level course-level--overlay">{levelLabel}</span>
      ) : null}
    </div>
  );
}

function DemoPreview({ course }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(course.demoVideoThumbnail) && !imageFailed;

  if (showImage) {
    return (
      <img
        className="course-showcase-demo-image"
        src={course.demoVideoThumbnail}
        alt=""
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className="course-showcase-demo-fallback" aria-hidden="true">
      <span className="course-showcase-demo-mark">M</span>
    </span>
  );
}

function EnrollAction({
  isAuthenticated,
  slug,
  enrolling,
  onEnroll,
  source,
  children,
  className = '',
}) {
  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        state={{ from: `/courses/${slug}` }}
        className={`btn btn-primary btn-lg${className ? ` ${className}` : ''}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      className={className}
      loading={enrolling}
      disabled={enrolling}
      onClick={() => onEnroll(source)}
    >
      {enrolling ? 'Enrolling…' : children}
    </Button>
  );
}

function EnrollmentNotice({ success, error }) {
  if (!success && !error) return null;

  return (
    <div className="course-showcase-notices">
      {success ? (
        <p className="course-showcase-notice is-success" role="status">{success}</p>
      ) : null}
      {error ? (
        <p className="course-showcase-notice is-error" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

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
  const [actionSource, setActionSource] = useState('aside');
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

  const handleEnroll = async (source = 'aside') => {
    if (!course?.id || enrolling) return;

    setEnrolling(true);
    setActionSource(source);
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

  const title = course.title || 'Course';
  const categoryLabel = course.category ? capitalize(course.category) : '';
  const levelLabel = formatPublicLevel(course.level);
  const durationLabel = formatDuration(course.duration);
  const hasDemoVideo = Boolean(course.demoVideoUrl);
  const hasDemo = hasDemoVideo || Boolean(course.demoVideoThumbnail);
  const modules = (Array.isArray(course.curriculum) ? course.curriculum : []).filter(
    (module) => module?.title
  );
  const topicCount = modules.reduce(
    (total, module) =>
      total + (Array.isArray(module.topics) ? module.topics.filter(Boolean).length : 0),
    0
  );
  const projects = (Array.isArray(course.projects) ? course.projects : []).filter(
    (project) => project?.title
  );
  const hasPrice = course.price !== null && course.price !== undefined && course.price !== '';
  const isFree = !hasPrice || Number(course.price) === 0;
  const priceLabel = isFree ? 'Free' : formatCurrency(course.price, course.currency);
  const priceNote = isFree
    ? 'No payment required to enroll.'
    : 'Enroll to request access to this course.';

  return (
    <article className="course-showcase page-marketing" aria-labelledby="course-showcase-title">
      <div className="course-showcase-shell">
        <div className="course-showcase-topbar">
          <Link to="/courses" className="course-showcase-back">
            <ArrowLeftIcon />
            Back to all courses
          </Link>
        </div>

        <div className="course-showcase-layout">
          <div className="course-showcase-main">
            <header className="course-showcase-intro">
              {categoryLabel || levelLabel ? (
                <div className="course-showcase-kicker">
                  {categoryLabel ? (
                    <span className="course-showcase-category">{categoryLabel}</span>
                  ) : null}
                  {categoryLabel && levelLabel ? (
                    <span className="course-showcase-kicker-dot" aria-hidden="true" />
                  ) : null}
                  {levelLabel ? <span>{levelLabel} level</span> : null}
                </div>
              ) : null}

              <h1 id="course-showcase-title" className="course-showcase-title">{title}</h1>

              {course.shortDescription ? (
                <p className="course-showcase-lede">{course.shortDescription}</p>
              ) : null}

              <ul className="course-showcase-meta">
                <li>
                  <ClockIcon />
                  {durationLabel}
                </li>
                {levelLabel ? (
                  <li>
                    <LevelIcon />
                    {levelLabel}
                  </li>
                ) : null}
                {categoryLabel ? (
                  <li>
                    <TagIcon />
                    {categoryLabel}
                  </li>
                ) : null}
              </ul>
            </header>

            {hasDemo ? (
              <section className="course-showcase-demo" aria-labelledby="course-demo-heading">
                <div className="course-showcase-section-head">
                  <div>
                    <p className="course-showcase-eyebrow">Preview</p>
                    <h2 id="course-demo-heading" className="course-showcase-section-title">
                      Watch the course demo
                    </h2>
                  </div>
                  {hasDemoVideo ? (
                    <span className="course-showcase-demo-hint">Opens in a new tab</span>
                  ) : null}
                </div>

                {hasDemoVideo ? (
                  <button
                    type="button"
                    className="course-showcase-demo-frame"
                    onClick={openDemoVideo}
                    aria-label={`Watch the demo video for ${title} (opens in a new tab)`}
                  >
                    <DemoPreview course={course} />
                    <span className="course-showcase-demo-scrim" aria-hidden="true" />
                    <span className="course-showcase-demo-play" aria-hidden="true">
                      <PlayIcon />
                    </span>
                    <span className="course-showcase-demo-label" aria-hidden="true">
                      Course demo
                    </span>
                    <span className="course-showcase-demo-watch" aria-hidden="true">
                      Watch preview
                      <ArrowUpRightIcon />
                    </span>
                  </button>
                ) : (
                  <div className="course-showcase-demo-frame is-static">
                    <DemoPreview course={course} />
                    <span className="course-showcase-demo-scrim" aria-hidden="true" />
                    <span className="course-showcase-demo-label" aria-hidden="true">
                      Course preview
                    </span>
                  </div>
                )}
              </section>
            ) : null}

            {course.description ? (
              <section className="course-showcase-section course-showcase-about" aria-labelledby="course-about-heading">
                <div className="course-showcase-section-head">
                  <div>
                    <p className="course-showcase-eyebrow">Overview</p>
                    <h2 id="course-about-heading" className="course-showcase-section-title">
                      About this course
                    </h2>
                  </div>
                </div>
                <p className="course-showcase-copy">{course.description}</p>
              </section>
            ) : null}

            {modules.length ? (
              <section
                className="course-showcase-section course-showcase-curriculum"
                aria-labelledby="course-curriculum-heading"
              >
                <div className="course-showcase-section-head">
                  <div>
                    <p className="course-showcase-eyebrow">Curriculum</p>
                    <h2 id="course-curriculum-heading" className="course-showcase-section-title">
                      What you’ll cover
                    </h2>
                  </div>
                  <p className="course-showcase-section-meta">
                    {modules.length} {modules.length === 1 ? 'module' : 'modules'}
                    {topicCount > 0 ? (
                      <span>
                        {' · '}
                        {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
                      </span>
                    ) : null}
                  </p>
                </div>

                <ol className="course-showcase-modules">
                  {modules.map((module, index) => {
                    const topics = Array.isArray(module.topics)
                      ? module.topics.filter(Boolean)
                      : [];

                    return (
                      <li className="course-showcase-module" key={`${module.title}-${index}`}>
                        <span className="course-showcase-module-index">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="course-showcase-module-body">
                          <h3 className="course-showcase-module-title">{module.title}</h3>
                          {topics.length ? (
                            <ul className="course-showcase-topics">
                              {topics.map((topic, topicIndex) => (
                                <li
                                  className="course-showcase-topic"
                                  key={`${topic}-${topicIndex}`}
                                >
                                  {topic}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            {projects.length ? (
              <section className="course-showcase-section course-showcase-projects" aria-labelledby="course-projects-heading">
                <div className="course-showcase-section-head">
                  <div>
                    <p className="course-showcase-eyebrow">Projects</p>
                    <h2 id="course-projects-heading" className="course-showcase-section-title">
                      Projects you’ll build
                    </h2>
                  </div>
                  <p className="course-showcase-section-meta">
                    {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                  </p>
                </div>

                <div className="course-showcase-project-grid">
                  {projects.map((project, index) => (
                    <article className="course-showcase-project" key={`${project.title}-${index}`}>
                      <span className="course-showcase-project-label">
                        {`PROJECT ${String(index + 1).padStart(2, '0')}`}
                      </span>
                      <h3 className="course-showcase-project-title">{project.title}</h3>
                      {project.description ? (
                        <p className="course-showcase-project-copy">{project.description}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="course-showcase-final" aria-labelledby="course-final-heading">
              <div className="course-showcase-final-copy">
                <p className="course-showcase-final-eyebrow">Get started</p>
                <h2 id="course-final-heading">Ready to start this course?</h2>
                <p>Send your enrollment request and take the next step.</p>
              </div>
              <div className="course-showcase-final-actions">
                <EnrollAction
                  isAuthenticated={isAuthenticated}
                  slug={slug}
                  enrolling={enrolling}
                  onEnroll={handleEnroll}
                  source="footer"
                  className="course-showcase-final-action"
                >
                  Enroll now
                </EnrollAction>
                {actionSource === 'footer' ? (
                  <EnrollmentNotice success={actionSuccess} error={actionError} />
                ) : null}
              </div>
            </section>
          </div>

          <aside className="course-showcase-aside" aria-label="Course enrollment">
            <div className="course-showcase-enroll">
              <CourseCover course={course} levelLabel={levelLabel} />

              <div className="course-showcase-enroll-body">
                <p className="course-showcase-enroll-eyebrow">Enrollment</p>

                <div className="course-showcase-price-row">
                  <span className="course-showcase-price">{priceLabel}</span>
                  {!isFree ? <span className="course-showcase-price-suffix">one-time</span> : null}
                </div>
                <p className="course-showcase-price-note">{priceNote}</p>

                <EnrollAction
                  isAuthenticated={isAuthenticated}
                  slug={slug}
                  enrolling={enrolling}
                  onEnroll={handleEnroll}
                  source="aside"
                  className="course-showcase-enroll-action"
                >
                  Enroll now
                </EnrollAction>

                {!isAuthenticated ? (
                  <p className="course-showcase-signin-note">You’ll sign in before enrolling.</p>
                ) : null}

                {actionSource === 'aside' ? (
                  <EnrollmentNotice success={actionSuccess} error={actionError} />
                ) : null}

                <dl className="course-showcase-facts">
                  <div>
                    <dt>Duration</dt>
                    <dd>{durationLabel}</dd>
                  </div>
                  {levelLabel ? (
                    <div>
                      <dt>Level</dt>
                      <dd>{levelLabel}</dd>
                    </div>
                  ) : null}
                  {categoryLabel ? (
                    <div>
                      <dt>Category</dt>
                      <dd>{categoryLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
