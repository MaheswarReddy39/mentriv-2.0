import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notification.service.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const TYPES = ['class', 'assignment', 'payment', 'enrollment', 'announcement', 'system'];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...TYPES.map((type) => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) })),
];

const STATE_OPTIONS = [
  { value: '', label: 'All notifications' },
  { value: 'false', label: 'Unread only' },
  { value: 'true', label: 'Read only' },
];

const typeLabel = (type) => {
  const match = TYPE_OPTIONS.find((option) => option.value === type);
  return match ? match.label : 'Notification';
};

// Keeps the sidebar unread badge in step with the page without a reload.
const announceInboxChange = () => {
  window.dispatchEvent(new Event('mentriv:notifications-changed'));
};

const formatWhen = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

function CaretIcon() {
  return (
    <svg
      className="student-notifications-caret"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="student-notifications-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="student-notifications-skeleton" role="status">
      <span className="sr-only">Loading notifications…</span>
      <div className="student-notifications-skeleton-panel" aria-hidden="true">
        <div className="student-notifications-skeleton-head">
          <span className="skeleton student-notifications-skeleton-title" />
          <span className="skeleton student-notifications-skeleton-count" />
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="student-notifications-skeleton-row" key={row}>
            <div className="student-notifications-skeleton-copy">
              <span className="skeleton student-notifications-skeleton-line" />
              <span className="skeleton student-notifications-skeleton-meta" />
              <span className="skeleton student-notifications-skeleton-stamp" />
            </div>
            <span className="skeleton student-notifications-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  // Inbox totals come from an unfiltered read of the same endpoints, so the
  // masthead keeps describing the whole inbox while the list is filtered.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [countResult, totalResult] = await Promise.allSettled([
        getUnreadCount(),
        listNotifications({ page: 1, limit: 1 }),
      ]);
      if (cancelled) return;

      setSummary({
        unread:
          countResult.status === 'fulfilled'
            ? Number(countResult.value?.data?.unreadCount ?? 0)
            : null,
        total:
          totalResult.status === 'fulfilled'
            ? Number(totalResult.value?.data?.pagination?.totalItems ?? 0)
            : null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const params = { page, limit: 10 };
        if (stateFilter !== '') params.isRead = stateFilter;
        if (typeFilter) params.type = typeFilter;

        const res = await listNotifications(params);
        if (cancelled) return;
        setNotifications(res?.data?.notifications || []);
        setPagination(res?.data?.pagination || null);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, stateFilter, typeFilter, reloadKey]);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const markOneRead = async (id) => {
    // Under an unread-only filter the row no longer belongs in the list.
    if (stateFilter === 'false') {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
      setPagination((current) =>
        current
          ? { ...current, totalItems: Math.max(0, current.totalItems - 1) }
          : current
      );
    } else {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );
    }

    setSummary((current) =>
      current && current.unread !== null
        ? { ...current, unread: Math.max(0, current.unread - 1) }
        : current
    );

    try {
      await markNotificationRead(id);
      announceInboxChange();
    } catch {
      // Backend is authoritative; the next fetch reconciles the row.
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        stateFilter === 'false'
          ? []
          : current.map((notification) => ({ ...notification, isRead: true }))
      );
      setSummary((current) => (current ? { ...current, unread: 0 } : current));
      announceInboxChange();
    } catch {
      // Keep the current rows; a retry reloads from the server.
    } finally {
      setMarkingAll(false);
    }
  };

  const isNavigable = (notification) =>
    Boolean(notification.link && notification.link.startsWith('/'));

  const openNotification = (notification) => {
    if (!notification.isRead) markOneRead(notification.id);
    if (isNavigable(notification)) navigate(notification.link);
  };

  const changeState = (value) => {
    setPage(1);
    setStateFilter(value);
  };

  const changeType = (value) => {
    setPage(1);
    setTypeFilter(value);
  };

  const unread = summary?.unread ?? null;
  const total = summary?.total ?? null;
  const readCount = total !== null && unread !== null ? Math.max(0, total - unread) : null;
  const readPct = readCount !== null && total > 0 ? (readCount / total) * 100 : 0;
  const filtered = Boolean(stateFilter || typeFilter);
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;
  const typeValue = TYPE_OPTIONS.find((option) => option.value === typeFilter)?.label || 'All types';
  const stateValue =
    STATE_OPTIONS.find((option) => option.value === stateFilter)?.label || 'All notifications';

  return (
    <div className="student-notifications fade-in">
      <header className="student-notifications-masthead">
        <div className="student-notifications-head">
          <h1 className="student-notifications-title">Notifications</h1>

          <div className="student-notifications-scope">
            <label className="student-notifications-switch">
              <span className="student-notifications-switch-label" aria-hidden="true">
                <span>{typeValue}</span>
                <CaretIcon />
              </span>
              <select
                className="student-notifications-switch-select"
                aria-label="Type"
                value={typeFilter}
                onChange={(event) => changeType(event.target.value)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="student-notifications-switch">
              <span className="student-notifications-switch-label" aria-hidden="true">
                <span>{stateValue}</span>
                <CaretIcon />
              </span>
              <select
                className="student-notifications-switch-select"
                aria-label="Read state"
                value={stateFilter}
                onChange={(event) => changeState(event.target.value)}
              >
                {STATE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="student-notifications-stat">
          <span className="student-notifications-stat-label">Unread</span>
          {summary === null ? (
            <span className="skeleton student-notifications-stat-skeleton" aria-hidden="true" />
          ) : (
            <span className="student-notifications-stat-value">
              {unread === null ? '—' : unread.toLocaleString('en-IN')}
              {total !== null && total > 0 && unread !== null ? (
                <span className="student-notifications-stat-total"> of {total.toLocaleString('en-IN')}</span>
              ) : null}
            </span>
          )}

          {total !== null && total > 0 && readCount !== null ? (
            <>
              <span className="student-notifications-bar" aria-hidden="true">
                <span style={{ width: `${readPct}%` }} />
              </span>
              <span className="student-notifications-stat-caption">
                {unread === 0 ? `All ${total.toLocaleString('en-IN')} read` : `${readCount.toLocaleString('en-IN')} read`}
              </span>
            </>
          ) : null}

          {unread !== null && unread > 0 ? (
            <button
              type="button"
              className="student-notifications-markall"
              onClick={markAllRead}
              disabled={markingAll}
            >
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className="student-notifications-state">
          <ErrorState
            title="Failed to load notifications"
            message={loadError}
            onRetry={retryLoad}
          />
        </div>
      ) : loading ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <div className="student-notifications-state">
          {filtered ? (
            <EmptyState
              title="Nothing matches these filters"
              message="Try a different type or read state."
              action={
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setPage(1);
                    setStateFilter('');
                    setTypeFilter('');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No notifications"
              message="Class, assignment and announcement updates will appear here."
            />
          )}
        </div>
      ) : (
        <section className="student-notifications-panel" aria-labelledby="notifications-inbox">
          <header className="student-notifications-panel-head">
            <h2 id="notifications-inbox">Inbox</h2>
            <span className="student-notifications-panel-count">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </header>

          <ol className="student-notifications-list">
            {notifications.map((notification) => {
              const navigable = isNavigable(notification);
              const actionable = navigable || !notification.isRead;
              const RowTag = actionable ? 'button' : 'div';

              return (
                <li key={notification.id}>
                  <RowTag
                    type={actionable ? 'button' : undefined}
                    className={`student-notifications-row${
                      notification.isRead ? '' : ' is-unread'
                    }${actionable ? '' : ' is-static'}`}
                    onClick={actionable ? () => openNotification(notification) : undefined}
                  >
                    <span className="student-notifications-row-main">
                      <span className="student-notifications-row-title">{notification.title}</span>
                      {notification.message ? (
                        <span className="student-notifications-row-copy">{notification.message}</span>
                      ) : null}
                      <span className="student-notifications-row-meta">
                        {typeLabel(notification.type)}
                        <span aria-hidden="true"> · </span>
                        <time dateTime={notification.createdAt}>{formatWhen(notification.createdAt)}</time>
                      </span>
                    </span>

                    <span className="student-notifications-row-side">
                      <span
                        className={`student-notifications-status${
                          notification.isRead ? ' is-read' : ' is-unread'
                        }`}
                      >
                        {notification.isRead ? 'Read' : 'Unread'}
                      </span>
                      {navigable ? <ArrowIcon /> : null}
                    </span>
                  </RowTag>
                </li>
              );
            })}
          </ol>

          {totalPages > 1 ? (
            <nav className="student-notifications-pager" aria-label="Notification pages">
              <button
                type="button"
                className="student-notifications-page"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="student-notifications-page-count">
                Page {pagination?.page ?? page} of {totalPages}
              </span>
              <button
                type="button"
                className="student-notifications-page"
                disabled={!pagination?.hasNextPage}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </section>
      )}
    </div>
  );
}
