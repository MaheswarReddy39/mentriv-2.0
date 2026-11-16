import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { listAdminCourses } from '../../services/course.service.js';
import {
  createAdminNotification,
  listAdminNotifications,
} from '../../services/notification.service.js';

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
];

const AUDIENCE_LABELS = {
  all: 'Everyone',
  students: 'Students',
  teachers: 'Teachers',
};

const numberFormatter = new Intl.NumberFormat('en-IN');

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateFormatter.format(parsed);
};

const formatAudience = (audience) => {
  if (!audience) return 'Everyone';
  return (
    AUDIENCE_LABELS[audience] ||
    audience.charAt(0).toUpperCase() + audience.slice(1)
  );
};

function ChevronDownIcon() {
  return (
    <svg
      className="admin-notifications-chevron"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="admin-notifications-select-check"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function FormSelect({ label, value, options, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState('bottom');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();
  const labelId = useId();
  const valueId = useId();
  const errorId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value)
  );
  const selectedOption = options[selectedIndex] || options[0];
  const activeOption = options[activeIndex];

  const openMenu = useCallback(
    (nextIndex = selectedIndex) => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setPlacement(spaceBelow < 300 && spaceAbove > spaceBelow ? 'top' : 'bottom');
      }
      setActiveIndex(nextIndex);
      setOpen(true);
    },
    [selectedIndex]
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectOption = (nextValue) => {
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    const { key } = event;

    if (!open) {
      if (key === 'ArrowDown') {
        event.preventDefault();
        openMenu(selectedIndex);
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openMenu(options.length - 1);
      }
      return;
    }

    if (key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + options.length) % options.length
      );
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (activeOption) selectOption(activeOption.id);
    } else if (key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="admin-notifications-field" ref={containerRef}>
      <span className="admin-notifications-label" id={labelId}>
        {label}
      </span>
      <div className="admin-notifications-select-wrap">
        <button
          ref={buttonRef}
          type="button"
          className={`admin-notifications-select${open ? ' is-open' : ''}${
            error ? ' is-invalid' : ''
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => {
            if (open) setOpen(false);
            else openMenu();
          }}
          onKeyDown={handleKeyDown}
        >
          <span className="admin-notifications-select-value" id={valueId}>
            {selectedOption?.label}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul
            className={`admin-notifications-select-menu${
              placement === 'top' ? ' is-top' : ''
            }`}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
          >
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${index}`}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={option.id === value}
                className={`admin-notifications-select-option${
                  index === activeIndex ? ' is-active' : ''
                }${option.id === value ? ' is-selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.id)}
              >
                <span>{option.label}</span>
                {option.id === value ? <CheckIcon /> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <span className="admin-notifications-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Metric({ label, value, loading, compact = false }) {
  return (
    <div className="admin-notifications-metric">
      <span className="admin-notifications-metric-label">{label}</span>
      {loading ? (
        <span
          className={`skeleton admin-notifications-metric-skeleton${
            compact ? ' is-compact' : ''
          }`}
          aria-hidden="true"
        />
      ) : (
        <span
          className={`admin-notifications-metric-value${
            compact ? ' is-compact' : ''
          }`}
        >
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="admin-notifications-skeleton-wrap">
      <span className="sr-only" role="status">
        Loading notifications
      </span>
      <div className="admin-notifications-layout" aria-hidden="true">
        <section className="admin-notifications-panel">
          <div className="admin-notifications-panel-head">
            <span className="skeleton admin-notifications-skeleton-heading" />
          </div>
          <div className="admin-notifications-skeleton-form">
            <div className="admin-notifications-skeleton-field">
              <span className="skeleton admin-notifications-skeleton-label" />
              <span className="skeleton admin-notifications-skeleton-input" />
            </div>
            <div className="admin-notifications-skeleton-field">
              <span className="skeleton admin-notifications-skeleton-label" />
              <span className="skeleton admin-notifications-skeleton-textarea" />
            </div>
            <div className="admin-notifications-skeleton-row">
              <div className="admin-notifications-skeleton-field">
                <span className="skeleton admin-notifications-skeleton-label" />
                <span className="skeleton admin-notifications-skeleton-input" />
              </div>
              <div className="admin-notifications-skeleton-field">
                <span className="skeleton admin-notifications-skeleton-label" />
                <span className="skeleton admin-notifications-skeleton-input" />
              </div>
            </div>
            <span className="skeleton admin-notifications-skeleton-button" />
          </div>
        </section>

        <section className="admin-notifications-panel">
          <div className="admin-notifications-panel-head">
            <span className="skeleton admin-notifications-skeleton-heading" />
            <span className="skeleton admin-notifications-skeleton-meta" />
          </div>
          <div className="admin-notifications-skeleton-list">
            {[0, 1, 2, 3, 4].map((row) => (
              <div className="admin-notifications-skeleton-item" key={row}>
                <div className="admin-notifications-skeleton-copy">
                  <span className="skeleton admin-notifications-skeleton-title" />
                  <span className="skeleton admin-notifications-skeleton-message" />
                  <span className="skeleton admin-notifications-skeleton-message is-short" />
                  <span className="skeleton admin-notifications-skeleton-detail" />
                </div>
                <span className="skeleton admin-notifications-skeleton-date" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    message: '',
    audience: 'all',
    courseId: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  const titleId = useId();
  const titleErrorId = `${titleId}-error`;
  const messageId = useId();
  const messageErrorId = `${messageId}-error`;
  const titleRef = useRef(null);
  const messageRef = useRef(null);

  const loadPageData = async () => {
    setLoading(true);
    setError(null);
    setHistoryError(null);

    const [coursesResult, notificationsResult] = await Promise.allSettled([
      listAdminCourses({ limit: 50 }),
      listAdminNotifications({ limit: 20 }),
    ]);

    if (coursesResult.status === 'fulfilled') {
      setCourses(coursesResult.value?.data?.courses || []);
    } else {
      setError(coursesResult.reason?.message || 'Failed to load notifications.');
    }

    if (notificationsResult.status === 'fulfilled') {
      setNotifications(
        notificationsResult.value?.data?.notifications || []
      );
    } else {
      setHistoryError(
        notificationsResult.reason?.message ||
          'Failed to load notification history.'
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      ),
    [notifications]
  );

  const setFieldValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setField = (field) => (event) => {
    setFieldValue(field, event.target.value);
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Notification Title is required';
    if (!form.message.trim()) errors.message = 'Notification Message is required';
    if (!form.audience) errors.audience = 'Send To is required';
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.title) titleRef.current?.focus();
      else if (errors.message) messageRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await createAdminNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        courseId: form.courseId || undefined,
      });

      const created = response?.data?.notification;
      if (created) {
        const course =
          created.course ||
          courses.find((item) => item.id === created.courseId);
        setNotifications((current) => [
          {
            ...created,
            course: course
              ? { id: course.id, title: course.title }
              : undefined,
          },
          ...current,
        ]);
      } else {
        await loadPageData();
      }

      setForm({ title: '', message: '', audience: 'all', courseId: '' });
      setFieldErrors({});
      toast.success('Notification published successfully.');
    } catch (err) {
      const errorsFromApi = {};
      (err.details || []).forEach((detail) => {
        if (detail.path) errorsFromApi[detail.path] = detail.msg;
      });
      setFieldErrors(errorsFromApi);
      toast.error(err.message || 'Could not publish notification.');
    } finally {
      setSubmitting(false);
    }
  };

  const courseOptions = [
    { id: '', label: 'All courses' },
    ...courses.map((course) => ({ id: course.id, label: course.title })),
  ];
  const audienceOptions = AUDIENCES.map((audience) => ({
    id: audience.value,
    label: audience.label,
  }));

  const latestNotification = sortedNotifications[0];
  const lastSentLabel = latestNotification?.createdAt
    ? formatDate(latestNotification.createdAt)
    : null;
  const publishedValue =
    error || historyError ? null : numberFormatter.format(notifications.length);

  const getCourseTitle = (notification) => {
    if (notification.course?.title) return notification.course.title;
    if (!notification.courseId) return 'All courses';
    return (
      courses.find((course) => course.id === notification.courseId)?.title ||
      'Selected course'
    );
  };

  return (
    <div className="admin-notifications-view">
      <header className="admin-notifications-masthead">
        <h1 className="admin-notifications-title">Notifications</h1>
        <div className="admin-notifications-metrics">
          <Metric label="Published" value={publishedValue} loading={loading} />
          <Metric
            label="Last sent"
            value={lastSentLabel}
            loading={loading}
            compact
          />
        </div>
      </header>

      {loading ? (
        <NotificationsSkeleton />
      ) : error ? (
        <div className="admin-notifications-page-state">
          <ErrorState message={error} onRetry={loadPageData} />
        </div>
      ) : (
        <div className="admin-notifications-layout">
          <section
            className="admin-notifications-panel admin-notifications-compose"
            aria-labelledby="notification-compose-heading"
          >
            <header className="admin-notifications-panel-head">
              <h2
                className="admin-notifications-panel-title"
                id="notification-compose-heading"
              >
                New notification
              </h2>
            </header>

            <form className="admin-notifications-form" onSubmit={handleSubmit}>
              <div className="admin-notifications-field">
                <label
                  className="admin-notifications-label"
                  htmlFor={titleId}
                >
                  Title
                </label>
                <input
                  id={titleId}
                  ref={titleRef}
                  className={`admin-notifications-input${
                    fieldErrors.title ? ' is-invalid' : ''
                  }`}
                  type="text"
                  value={form.title}
                  onChange={setField('title')}
                  placeholder="What is this about?"
                  maxLength={150}
                  aria-invalid={Boolean(fieldErrors.title) || undefined}
                  aria-describedby={
                    fieldErrors.title ? titleErrorId : undefined
                  }
                />
                {fieldErrors.title ? (
                  <span
                    className="admin-notifications-error"
                    id={titleErrorId}
                  >
                    {fieldErrors.title}
                  </span>
                ) : null}
              </div>

              <div className="admin-notifications-field">
                <label
                  className="admin-notifications-label"
                  htmlFor={messageId}
                >
                  Message
                </label>
                <textarea
                  id={messageId}
                  ref={messageRef}
                  className={`admin-notifications-textarea${
                    fieldErrors.message ? ' is-invalid' : ''
                  }`}
                  rows={6}
                  value={form.message}
                  onChange={setField('message')}
                  placeholder="Write the update students and teachers will see."
                  maxLength={1000}
                  aria-invalid={Boolean(fieldErrors.message) || undefined}
                  aria-describedby={
                    fieldErrors.message ? messageErrorId : undefined
                  }
                />
                <div className="admin-notifications-message-meta">
                  {fieldErrors.message ? (
                    <span
                      className="admin-notifications-error"
                      id={messageErrorId}
                    >
                      {fieldErrors.message}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="admin-notifications-count">
                    {form.message.length} / 1000
                  </span>
                </div>
              </div>

              <div className="admin-notifications-form-row">
                <FormSelect
                  label="Send to"
                  value={form.audience}
                  options={audienceOptions}
                  onChange={(audience) =>
                    setFieldValue('audience', audience)
                  }
                  error={fieldErrors.audience}
                />
                <FormSelect
                  label="Course"
                  value={form.courseId}
                  options={courseOptions}
                  onChange={(courseId) =>
                    setFieldValue('courseId', courseId)
                  }
                  error={fieldErrors.courseId}
                />
              </div>

              <Button
                type="submit"
                className="admin-notifications-submit"
                loading={submitting}
                disabled={submitting}
              >
                Publish notification
              </Button>
            </form>
          </section>

          <section
            className="admin-notifications-panel admin-notifications-history"
            aria-labelledby="notification-history-heading"
          >
            <header className="admin-notifications-panel-head">
              <h2
                className="admin-notifications-panel-title"
                id="notification-history-heading"
              >
                History
              </h2>
              <span className="admin-notifications-panel-meta">
                {notifications.length} sent
              </span>
            </header>

            {historyError ? (
              <div className="admin-notifications-panel-state">
                <ErrorState
                  message={historyError}
                  onRetry={loadPageData}
                />
              </div>
            ) : sortedNotifications.length === 0 ? (
              <div className="admin-notifications-panel-state">
                <EmptyState
                  title="No notifications sent"
                  message="Notifications you publish will appear here."
                />
              </div>
            ) : (
              <div className="admin-notifications-list">
                {sortedNotifications.map((notification) => (
                  <article
                    className="admin-notifications-item"
                    key={notification.id}
                  >
                    <div className="admin-notifications-item-body">
                      <h3 className="admin-notifications-item-title">
                        {notification.title}
                      </h3>
                      <p className="admin-notifications-item-message">
                        {notification.message}
                      </p>
                      <div className="admin-notifications-meta">
                        <span className="admin-notifications-audience">
                          {formatAudience(notification.audience)}
                        </span>
                        <span className="admin-notifications-course">
                          {getCourseTitle(notification)}
                        </span>
                      </div>
                    </div>
                    <time
                      className="admin-notifications-item-date"
                      dateTime={notification.createdAt || undefined}
                    >
                      {formatDate(notification.createdAt)}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
