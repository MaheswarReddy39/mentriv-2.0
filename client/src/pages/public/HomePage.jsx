import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedCourses } from '../../services/course.service.js';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import HeroSection from '../../components/home/HeroSection.jsx';
import WhyMentrivSection from '../../components/home/WhyMentrivSection.jsx';
import LearningExperienceSection from '../../components/home/LearningExperienceSection.jsx';
import CtaSection from '../../components/home/CtaSection.jsx';

const LEVEL_LABELS = {
  basic: 'Beginner',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function FeaturedCourseCard({ course }) {
  const title = course.title || 'Course';
  const level = LEVEL_LABELS[course.level] || course.level;

  return (
    <article className="featured-course-card">
      <div className="featured-course-media">
        <Link to={`/courses/${course.slug}`} className="featured-course-image-link" aria-label={`View ${title}`}>
          {course.thumbnail ? (
            <img
              className="featured-course-image"
              src={course.thumbnail}
              alt={`Cover image for ${title}`}
              loading="lazy"
            />
          ) : (
            <div className="featured-course-image featured-course-fallback" aria-hidden="true">
              <span className="featured-course-mark">M</span>
            </div>
          )}
        </Link>
      </div>

      <div className="featured-course-body">
        <div className="featured-course-meta">
          {course.category ? <p className="featured-course-category">{course.category}</p> : null}
          {level ? <span className="course-level">{level}</span> : null}
        </div>

        <h3 className="featured-course-title clamp-2">
          <Link to={`/courses/${course.slug}`} className="featured-course-title-link">{title}</Link>
        </h3>

        {course.shortDescription ? (
          <p className="featured-course-desc clamp-2">{course.shortDescription}</p>
        ) : null}

        <div className="featured-course-actions">
          <Link
            to={`/courses/${course.slug}`}
            className="featured-course-cta"
            aria-label={`View ${title}`}
          >
            Explore course
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" />
            </svg>
          </Link>
          <Link
            to="/register"
            className="featured-course-link"
            aria-label={`Get started with ${title}`}
          >
            Get started
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listPublishedCourses({ limit: 3 });
        if (!cancelled) setCourses(response.data.courses.slice(0, 3));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load courses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-home page-marketing">
      <HeroSection />

      <div className="home-content container">
        <section className="homepage-section" aria-labelledby="featured-heading">
          <div className="section-head">
            <h2 id="featured-heading">Featured courses</h2>
            <Link to="/courses" className="link-arrow">View all courses</Link>
          </div>

          {loading ? (
            <Loading label="Loading courses…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => window.location.reload()} />
          ) : courses.length === 0 ? (
            <EmptyState
              title="No courses published yet"
              message="New courses are added regularly. Check back soon."
              action={<Link to="/register" className="btn btn-primary">Create an account</Link>}
            />
          ) : (
            <div className="home-course-grid">
              {courses.map((course) => (
                <FeaturedCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>

        <WhyMentrivSection />
        <LearningExperienceSection />
        <CtaSection />
      </div>
    </div>
  );
}
