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
import { thumbClassFor } from '../../utils/course-visuals.js';

const PILLARS = [
  { num: '01', color: 'stat-indigo', label: 'Structured courses' },
  { num: '02', color: 'stat-coral', label: 'Graded assignments' },
  { num: '03', color: 'stat-teal', label: 'Auto-evaluated MCQs' },
  { num: '04', color: 'stat-amber', label: 'Visible progress' },
];

function FeaturedCourseCard({ course }) {
  const title = course.title || 'Course';

  return (
    <article className="home-course-card">
      {course.thumbnail ? (
        <img
          className="home-course-image"
          src={course.thumbnail}
          alt={`Cover image for ${title}`}
          loading="lazy"
        />
      ) : (
        <div className={`home-course-image home-course-thumb ${thumbClassFor(course.category, title)}`}>
          <span>Course</span>
        </div>
      )}

      <div className="home-course-body">
        <h3 className="clamp-2">{title}</h3>
        <div className="home-course-actions">
          <Link
            to={`/courses/${course.slug}`}
            className="btn btn-outline btn-sm"
            aria-label={`Explore ${title}`}
          >
            Course Explorer
          </Link>
          <Link
            to="/register"
            className="btn btn-primary btn-sm"
            aria-label={`Get started with ${title}`}
          >
            Get Started
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
    <div className="page-home">
      {/* Decorative background blobs — behind all content */}
      <div className="blob blob-b1" aria-hidden="true" />
      <div className="blob blob-b2" aria-hidden="true" />
      <div className="blob blob-b3" aria-hidden="true" />

      <div className="home-content container">
        <HeroSection />

        <section className="homepage-section" aria-label="What Mentriv covers">
          <div className="stat-strip">
            {PILLARS.map((pillar) => (
              <div key={pillar.num} className="stat-strip-item">
                <p className={`stat-strip-number ${pillar.color}`}>{pillar.num}</p>
                <p className="stat-strip-label">{pillar.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="homepage-section" aria-labelledby="featured-heading">
          <div className="section-head">
            <div>
              <h2 id="featured-heading">Featured courses</h2>
              <p>Published courses you can enroll in right away.</p>
            </div>
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
