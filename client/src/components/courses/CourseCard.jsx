import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format.js';

const LEVEL_LABELS = {
  basic: 'Beginner',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const capitalize = (value = '') =>
  String(value).replace(/\b\w/g, (char) => char.toUpperCase());

export default function CourseCard({ course }) {
  const {
    slug,
    title = 'Course',
    shortDescription,
    thumbnail,
    price,
    currency = 'INR',
    duration,
    level,
    category,
  } = course;
  const [imageFailed, setImageFailed] = useState(false);

  const levelLabel = LEVEL_LABELS[level] || (level ? capitalize(level) : '');
  const hours = Number(duration);
  const durationLabel = hours > 0
    ? `${hours} ${hours === 1 ? 'hour' : 'hours'}`
    : 'Self-paced';
  const priceLabel = Number(price) === 0 ? 'Free' : formatCurrency(price, currency);
  const showImage = Boolean(thumbnail) && !imageFailed;

  return (
    <article className="catalog-card">
      <div className="catalog-card-media">
        {showImage ? (
          <img
            className="catalog-card-image"
            src={thumbnail}
            alt={`Cover image for ${title}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="catalog-card-fallback" aria-hidden="true">
            <span className="catalog-card-mark">M</span>
          </div>
        )}
        {levelLabel ? (
          <span className="course-level course-level--overlay">{levelLabel}</span>
        ) : null}
      </div>

      <div className="catalog-card-body">
        {category ? (
          <div className="catalog-card-meta">
            <span className="catalog-card-category">{capitalize(category)}</span>
          </div>
        ) : null}

        <h2 className="catalog-card-title clamp-2">
          <Link to={`/courses/${slug}`} className="catalog-card-link">
            {title}
          </Link>
        </h2>

        {shortDescription ? (
          <p className="catalog-card-desc clamp-2">{shortDescription}</p>
        ) : null}

        <div className="catalog-card-footer">
          <span className="catalog-card-duration">{durationLabel}</span>
          {priceLabel ? <span className="catalog-card-price">{priceLabel}</span> : null}
          <span className="catalog-card-arrow" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
