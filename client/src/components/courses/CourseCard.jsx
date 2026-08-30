import { Link } from 'react-router-dom';
import { thumbClassFor } from '../../utils/course-visuals.js';
import { formatCurrency } from '../../utils/format.js';

const LEVEL_LABELS = {
  basic: 'Beginner',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function CourseCard({ course }) {
  const {
    slug,
    title,
    shortDescription,
    thumbnail,
    price,
    currency = 'INR',
    duration,
    level,
  } = course;
  const levelLabel = LEVEL_LABELS[level] || level;

  return (
    <article className="home-course-card public-course-card">
      <div className="public-course-media">
        {thumbnail ? (
          <img
            className="home-course-image"
            src={thumbnail}
            alt={`Cover image for ${title}`}
            loading="lazy"
          />
        ) : (
          <div className={`home-course-image home-course-thumb ${thumbClassFor(course.category, title)}`}>
            <span>{title}</span>
          </div>
        )}

        {levelLabel ? (
          <span className="thumb-badge">{levelLabel}</span>
        ) : null}
      </div>

      <div className="home-course-body public-course-body">
        <h3 className="clamp-2">{title}</h3>
        {shortDescription ? (
          <p className="text-sm clamp-2" style={{ margin: 0 }}>{shortDescription}</p>
        ) : null}
        {duration ? (
          <p className="text-meta" style={{ margin: 0 }}>≈ {duration} hours of learning</p>
        ) : null}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border)',
        }}>
          <span className="card-price">{formatCurrency(price, currency)}</span>
          <Link to={`/courses/${slug}`} className="link-arrow text-sm">
            View course
          </Link>
        </div>
      </div>
    </article>
  );
}
