import { useEffect, useState } from 'react';
import { listAnnouncements } from '../../services/announcement.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { formatDate, truncateText } from '../../utils/format.js';

export default function AnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await listAnnouncements({ page, limit: 10 });
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
  }, [page]);

  if (loading) return <Loading label="Loading announcementsâ€¦" />;
  if (error) return <ErrorState message={error} onRetry={() => setPage((p) => p)} />;

  return (
    <>
      <h1>Announcements</h1>
      <p className="text-body-lg" style={{ color: 'var(--color-text-secondary)' }}>
        Updates and news from the Mentriv team.
      </p>

      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          message="Published announcements will appear here."
        />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
            {announcements.map((announcement) => {
              const expanded = expandedId === announcement.id;
              return (
                <Card key={announcement.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <Badge status={announcement.type}>{announcement.type}</Badge>
                    <time className="text-caption" dateTime={announcement.publishedAt}>
                      Published {formatDate(announcement.publishedAt)}
                    </time>
                  </div>

                  <h2 className="text-h4" style={{ marginTop: 'var(--space-3)' }}>{announcement.title}</h2>

                  <p style={{ whiteSpace: 'pre-line' }}>
                    {expanded || announcement.content.length <= 220
                      ? announcement.content
                      : truncateText(announcement.content, 220)}
                  </p>

                  {announcement.content.length > 220 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={expanded}
                      onClick={() => setExpandedId(expanded ? null : announcement.id)}
                    >
                      {expanded ? 'Show less' : 'Read more'}
                    </Button>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <nav aria-label="Announcement pages" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span style={{ alignSelf: 'center' }} className="text-sm">
              Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}
            </span>
            <Button variant="secondary" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        </>
      )}
    </>
  );
}
