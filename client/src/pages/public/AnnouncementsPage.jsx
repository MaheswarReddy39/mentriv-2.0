import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAnnouncements } from '../../services/announcement.service.js';
import Button from '../../components/common/Button.jsx';
import { formatDate, truncateText } from '../../utils/format.js';

const PAGE_SIZE = 10;
const PREVIEW_LENGTH = 240;

const TYPE_LABELS = {
  general: 'General',
  class: 'Class',
  assignment: 'Assignment',
  payment: 'Payment',
  system: 'System',
};

const getAnnouncementDate = (announcement) =>
  announcement.publishedAt || announcement.createdAt || null;

const formatDateParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: date.toLocaleDateString('en-IN', { month: 'short' }),
    year: date.toLocaleDateString('en-IN', { year: 'numeric' }),
  };
};

function AnnouncementType({ type }) {
  const key = TYPE_LABELS[type] ? type : 'general';
  return (
    <span className={`announcement-type announcement-type--${key}`}>
      <span className="announcement-type-dot" aria-hidden="true" />
      {TYPE_LABELS[key]}
    </span>
  );
}

function AnnouncementDate({ value, variant = 'row' }) {
  const parts = formatDateParts(value);
  if (!parts) return null;
  return (
    <time className={`announcement-date announcement-date--${variant}`} dateTime={value}>
      <span className="announcement-date-day">{parts.day}</span>
      <span className="announcement-date-rest">
        <span className="announcement-date-month">{parts.month}</span>
        <span className="announcement-date-year">{parts.year}</span>
      </span>
    </time>
  );
}

function ExpandToggle({ expanded, contentId, onClick }) {
  return (
    <button
      type="button"
      className="announcement-toggle"
      aria-expanded={expanded}
      aria-controls={contentId}
      onClick={onClick}
    >
      {expanded ? 'Show less' : 'Read update'}
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {expanded ? <path d="M3.5 8h9" /> : <path d="M8 3.5v9M3.5 8h9" />}
      </svg>
    </button>
  );
}

function FeaturedAnnouncement({ announcement, expanded, onToggle }) {
  const contentId = `announcement-${announcement.id}-content`;
  const canExpand = announcement.content.length > PREVIEW_LENGTH;

  return (
    <article className="announcement-feature">
      <AnnouncementDate value={getAnnouncementDate(announcement)} variant="feature" />
      <div className="announcement-feature-main">
        <h2 className="announcement-feature-title">{announcement.title}</h2>
        <p className="announcement-feature-copy" id={contentId}>
          {expanded || !canExpand
            ? announcement.content
            : truncateText(announcement.content, PREVIEW_LENGTH)}
        </p>
        <div className="announcement-feature-footer">
          <div className="announcement-feature-meta">
            <span className="announcement-latest">Latest update</span>
            <AnnouncementType type={announcement.type} />
          </div>
          {canExpand ? (
            <ExpandToggle expanded={expanded} contentId={contentId} onClick={onToggle} />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AnnouncementRow({ announcement, expanded, onToggle }) {
  const contentId = `announcement-${announcement.id}-content`;
  const canExpand = announcement.content.length > PREVIEW_LENGTH;

  return (
    <article className="announcement-row">
      <AnnouncementDate value={getAnnouncementDate(announcement)} />
      <div className="announcement-row-main">
        <h2 className="announcement-row-title">{announcement.title}</h2>
        <p className="announcement-row-copy" id={contentId}>
          {expanded || !canExpand
            ? announcement.content
            : truncateText(announcement.content, PREVIEW_LENGTH)}
        </p>
        <div className="announcement-row-footer">
          <AnnouncementType type={announcement.type} />
          {canExpand ? (
            <ExpandToggle expanded={expanded} contentId={contentId} onClick={onToggle} />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AnnouncementsPager({ page, totalPages, hasNextPage, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="announcements-pager" aria-label="Announcement pages">
      <button
        type="button"
        className="announcements-pager-link"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10 3 5 8l5 5" />
        </svg>
        Previous
      </button>
      <span className="announcements-pager-status">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="announcements-pager-link announcements-pager-link--next"
        disabled={!hasNextPage}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m6 3 5 5-5 5" />
        </svg>
      </button>
    </nav>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="announcements-loading" role="status" aria-busy="true">
      <span className="sr-only">Loading announcements…</span>
      <div className="announcement-feature announcement-feature--skeleton" aria-hidden="true">
        <span className="skeleton announcement-skeleton-date" />
        <div className="announcement-skeleton-body">
          <span className="skeleton announcement-skeleton-title" />
          <span className="skeleton announcement-skeleton-title announcement-skeleton-title--short" />
          <span className="skeleton announcement-skeleton-line" />
          <span className="skeleton announcement-skeleton-line announcement-skeleton-line--short" />
          <span className="skeleton announcement-skeleton-toggle" />
        </div>
      </div>
      <div className="announcement-ledger" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div className="announcement-row announcement-row--skeleton" key={index}>
            <span className="skeleton announcement-skeleton-row-date" />
            <div className="announcement-skeleton-body">
              <span className="skeleton announcement-skeleton-row-title" />
              <span className="skeleton announcement-skeleton-line" />
              <span className="skeleton announcement-skeleton-line announcement-skeleton-line--short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnnouncementsPage({ embedded = false, emptyAction = null }) {
  const [page, setPage] = useState(1);
  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const shellRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listAnnouncements({ page, limit: PAGE_SIZE });
        if (!cancelled) {
          setAnnouncements(response.data.announcements);
          setPagination(response.data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load announcements');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, reloadToken]);

  const totalItems = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const currentPage = pagination?.page ?? page;
  const featured = !loading && !error && page === 1 ? announcements[0] || null : null;
  const ledger = featured ? announcements.slice(1) : announcements;
  const countLabel = totalItems === 1 ? '1 update' : `${totalItems} updates`;

  const toggleExpanded = (announcementId) => {
    setExpandedId((current) => (current === announcementId ? null : announcementId));
  };

  const goToPage = (nextPage) => {
    setExpandedId(null);
    setPage(nextPage);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    window.requestAnimationFrame(() => {
      shellRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const latestDate = announcements[0] ? getAnnouncementDate(announcements[0]) : null;

  return (
    <div className={`page-announcements${embedded ? ' is-embedded' : ' page-marketing'}`}>
      <div className="announcements-shell" ref={shellRef}>
        <header className="announcements-masthead">
          <h1 className="announcements-title">
            Announcements<span className="announcements-title-dot" aria-hidden="true">.</span>
          </h1>
          <div className="announcements-masthead-side">
            <p className="announcements-deck">Updates and news from the Mentriv team.</p>
            {!loading && !error && totalItems > 0 ? (
              <p className="announcements-count">{countLabel}</p>
            ) : null}
          </div>
        </header>

        {loading ? (
          <AnnouncementsSkeleton />
        ) : error ? (
          <div className="announcements-state" role="alert">
            <h2>Announcements didn’t load.</h2>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              Try again
            </Button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="announcements-state">
            <h2>No announcements yet.</h2>
            <p>Published announcements will appear here.</p>
            {emptyAction ?? (
              <Link className="announcements-state-link" to="/courses">
                Browse courses
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <>
            {featured ? (
              <FeaturedAnnouncement
                announcement={featured}
                expanded={expandedId === featured.id}
                onToggle={() => toggleExpanded(featured.id)}
              />
            ) : null}

            {ledger.length > 0 ? (
              <div className="announcement-ledger">
                {ledger.map((announcement) => (
                  <AnnouncementRow
                    key={announcement.id}
                    announcement={announcement}
                    expanded={expandedId === announcement.id}
                    onToggle={() => toggleExpanded(announcement.id)}
                  />
                ))}
              </div>
            ) : null}

            <AnnouncementsPager
              page={currentPage}
              totalPages={totalPages}
              hasNextPage={Boolean(pagination?.hasNextPage)}
              onPageChange={goToPage}
            />

            {currentPage === 1 && latestDate ? (
              <p className="announcements-updated">Last updated {formatDate(latestDate)}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
