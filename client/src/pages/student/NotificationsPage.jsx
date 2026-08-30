import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../services/notification.service.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const TYPES = ['class', 'assignment', 'payment', 'enrollment', 'announcement', 'system'];

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  ...TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isReadFilter, setIsReadFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [unreadCount, setUnreadCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: 10 };
        if (isReadFilter !== '') params.isRead = isReadFilter;
        if (typeFilter) params.type = typeFilter;

        const res = await listNotifications(params);
        if (!cancelled) {
          setNotifications(res.data.notifications);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [page, isReadFilter, typeFilter]);

  useEffect(() => {
    let cancelled = false;
    getUnreadCount()
      .then((res) => { if (!cancelled) setUnreadCount(res.data.unreadCount); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [notifications]);

  const markOneRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((current) =>
        current.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, (c ?? 1) - 1));
    } catch {
      // silent â€” backend is authoritative and idempotent
    }
  };

  const markAllRead = async () => {
    try {
      const res = await markAllNotificationsRead();
      setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent â€” best-effort UI refresh happens on next visit anyway
    }
  };

  const openNotification = (notification) => {
    if (!notification.isRead) {
      markOneRead(notification.id);
    }
    if (notification.link && notification.link.startsWith('/')) {
      navigate(notification.link);
    }
  };

  if (loading) return <Loading label="Loading notificationsâ€¦" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <>
      <div className="page-head fade-in">
        <div>
          <h1>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {unreadCount === null ? '' : unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          Mark all as read
        </Button>
      </div>

      {/* Filters */}
      <div className="card" style={{
        display: 'grid',
        gap: 'var(--space-4)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        alignItems: 'end',
        marginBottom: 'var(--space-6)',
      }}>
        <div className="field">
          <span className="field-label">Read state</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {[['', 'All'], ['false', 'Unread'], ['true', 'Read']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`tab-pill${isReadFilter === value ? ' active' : ''}`}
                onClick={() => { setPage(1); setIsReadFilter(value); }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <select
          className="select"
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(event) => { setPage(1); setTypeFilter(event.target.value); }}
        >
          <option value="">All types</option>
          {TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" message="You're all caught up." />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {notifications.map((n) => (
            <Card
              key={n.id}
              variant={`card-notification${n.isRead ? '' : ' card-notification-unread'}`}
              className="fade-in"
            >
              {!n.isRead ? <span className="due-dot" style={{ background: 'var(--indigo)' }} aria-hidden="true" /> : null}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={n.type}>{n.type}</Badge>
                  <span className="text-meta">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                </div>

                <h3 className="text-h4" style={{ margin: 'var(--space-2) 0 var(--space-1)' }}>{n.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>{n.message}</p>

                {n.link ? (
                  <Link to={n.link} className="link-arrow text-sm" style={{ marginTop: 'var(--space-2)', display: 'inline-flex' }}
                    onClick={() => { if (!n.isRead) markOneRead(n.id); }}
                  >
                    View details
                  </Link>
                ) : null}
              </div>

              {!n.isRead ? (
                <Button variant="ghost" size="sm" onClick={() => markOneRead(n.id)}>
                  Mark as read
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <nav aria-label="Notification pages" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
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
  );
}
