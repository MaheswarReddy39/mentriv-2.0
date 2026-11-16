import { useEffect, useId, useRef, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import {
  archiveAnnouncement,
  createAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from '../../services/announcement.service.js';

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];

const TYPES = [
  { value: 'general', label: 'General' },
  { value: 'class', label: 'Class' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'payment', label: 'Payment' },
  { value: 'system', label: 'System' },
];

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'admins', label: 'Admins' },
];

const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const TYPE_LABELS = Object.fromEntries(
  TYPES.map((type) => [type.value, type.label])
);

const AUDIENCE_LABELS = Object.fromEntries(
  AUDIENCES.map((audience) => [audience.value, audience.label])
);

const EMPTY_FORM = {
  title: '',
  content: '',
  type: 'general',
  audience: 'all',
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

const getDisplayDate = (announcement) =>
  announcement.publishedAt || announcement.createdAt;

function ChevronDownIcon() {
  return (
    <svg
      className="admin-announcements-chevron"
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
      className="admin-announcements-select-check"
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

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  className = '',
  hideLabel = false,
}) {
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

  const openMenu = (nextIndex = selectedIndex) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPlacement(
        spaceBelow < 300 && spaceAbove > spaceBelow ? 'top' : 'bottom'
      );
    }
    setActiveIndex(nextIndex);
    setOpen(true);
  };

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
    <div
      className={`admin-announcements-field${
        className ? ` ${className}` : ''
      }`}
      ref={containerRef}
    >
      <span
        className={`admin-announcements-label${hideLabel ? ' sr-only' : ''}`}
        id={labelId}
      >
        {label}
      </span>
      <div className="admin-announcements-select-wrap">
        <button
          ref={buttonRef}
          type="button"
          className={`admin-announcements-select${open ? ' is-open' : ''}${
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
          <span className="admin-announcements-select-value" id={valueId}>
            {selectedOption?.label}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul
            className={`admin-announcements-select-menu${
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
                className={`admin-announcements-select-option${
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
        <span className="admin-announcements-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Metric({ label, value, loading }) {
  return (
    <div className="admin-announcements-metric">
      <span className="admin-announcements-metric-label">{label}</span>
      {loading ? (
        <span
          className="skeleton admin-announcements-metric-skeleton"
          aria-hidden="true"
        />
      ) : (
        <span className="admin-announcements-metric-value">{value ?? '—'}</span>
      )}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="admin-announcements-skeleton" role="status">
      <span className="sr-only">Loading announcements</span>
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          className="admin-announcements-skeleton-item"
          aria-hidden="true"
          key={row}
        >
          <div className="admin-announcements-skeleton-copy">
            <span className="skeleton admin-announcements-skeleton-title" />
            <span className="skeleton admin-announcements-skeleton-content" />
            <span className="skeleton admin-announcements-skeleton-content is-short" />
            <span className="skeleton admin-announcements-skeleton-meta" />
          </div>
          <div className="admin-announcements-skeleton-side">
            <span className="skeleton admin-announcements-skeleton-date" />
            <div className="admin-announcements-skeleton-actions">
              <span className="skeleton admin-announcements-skeleton-action" />
              <span className="skeleton admin-announcements-skeleton-action is-wide" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [counts, setCounts] = useState({
    published: null,
    draft: null,
    archived: null,
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('published');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
    hasNextPage: false,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);
  const composerRef = useRef(null);
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const titleId = useId();
  const contentId = useId();
  const titleErrorId = `${titleId}-error`;
  const contentErrorId = `${contentId}-error`;

  const loadAnnouncements = async (status, type, nextPage = 1) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const params = {
        status,
        page: nextPage,
        limit: PAGE_SIZE,
      };
      if (type && type !== 'all') params.type = type;

      const response = await listAnnouncements(params);
      if (requestId !== requestIdRef.current) return;

      const data = response?.data || {};
      const nextPagination = data.pagination || {
        page: nextPage,
        limit: PAGE_SIZE,
        totalPages: 0,
        hasNextPage: false,
        totalItems: 0,
      };

      if (
        nextPagination.totalPages > 0 &&
        nextPage > nextPagination.totalPages
      ) {
        setPage(nextPagination.totalPages);
        loadAnnouncements(status, type, nextPagination.totalPages);
        return;
      }

      setAnnouncements(data.announcements || []);
      setPagination(nextPagination);
      setPage(nextPagination.page || nextPage);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setAnnouncements([]);
      setError(err.message || 'Failed to load announcements.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const loadCounts = async () => {
    setCountsLoading(true);
    const results = await Promise.allSettled(
      STATUS_TABS.map((tab) =>
        listAnnouncements({ status: tab.value, limit: 1 })
      )
    );

    const nextCounts = {};
    STATUS_TABS.forEach((tab, index) => {
      const result = results[index];
      nextCounts[tab.value] =
        result.status === 'fulfilled'
          ? result.value?.data?.pagination?.totalItems ?? 0
          : null;
    });
    setCounts(nextCounts);
    setCountsLoading(false);
  };

  useEffect(() => {
    loadCounts();
    loadAnnouncements('published', 'all', 1);
  }, []);

  const setFieldValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setField = (field) => (event) => {
    setFieldValue(field, event.target.value);
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.content.trim()) errors.content = 'Content is required';
    return errors;
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
    setEditingStatus(null);
  };

  const startEdit = (announcement) => {
    setEditingId(announcement.id);
    setEditingStatus(announcement.status);
    setForm({
      title: announcement.title || '',
      content: announcement.content || '',
      type: announcement.type || 'general',
      audience: announcement.audience || 'all',
    });
    setFieldErrors({});
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleRef.current?.focus({ preventScroll: true });
    });
  };

  const cancelEdit = () => {
    resetForm();
  };

  const focusFirstError = (errors) => {
    if (errors.title) titleRef.current?.focus();
    else if (errors.content) contentRef.current?.focus();
  };

  const handleSubmit = async (intent) => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

    const publishing = intent === 'publish';
    setSubmitting(intent);
    setFieldErrors({});

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        audience: form.audience,
      };
      if (publishing) payload.status = 'published';

      const response = editingId
        ? await updateAnnouncement(editingId, payload)
        : await createAnnouncement({
            ...payload,
            status: publishing ? 'published' : 'draft',
          });

      const saved = response?.data?.announcement;
      const resultStatus =
        saved?.status || (publishing ? 'published' : editingStatus || 'draft');

      if (publishing) toast.success('Announcement published.');
      else if (editingId) toast.success('Announcement updated.');
      else toast.success('Draft saved.');

      resetForm();
      setStatusFilter(resultStatus);
      setTypeFilter('all');
      setPage(1);
      setAnnouncements([]);

      await Promise.all([
        loadAnnouncements(resultStatus, 'all', 1),
        loadCounts(),
      ]);
    } catch (err) {
      const errorsFromApi = {};
      (err.details || []).forEach((detail) => {
        const field = detail.path || detail.field;
        if (field) errorsFromApi[field] = detail.msg;
      });
      setFieldErrors(errorsFromApi);
      focusFirstError(errorsFromApi);
      toast.error(err.message || 'Could not save announcement.');
    } finally {
      setSubmitting(null);
    }
  };

  const selectStatus = (status) => {
    if (status === statusFilter) return;
    setStatusFilter(status);
    setPage(1);
    setAnnouncements([]);
    loadAnnouncements(status, typeFilter, 1);
  };

  const selectType = (type) => {
    if (type === typeFilter) return;
    setTypeFilter(type);
    setPage(1);
    setAnnouncements([]);
    loadAnnouncements(statusFilter, type, 1);
  };

  const clearTypeFilter = () => {
    selectType('all');
  };

  const handlePageChange = (nextPage) => {
    if (
      loading ||
      nextPage < 1 ||
      nextPage > (pagination.totalPages || 0)
    ) {
      return;
    }
    setPage(nextPage);
    loadAnnouncements(statusFilter, typeFilter, nextPage);
  };

  const openConfirm = (announcement, action) => {
    setConfirmState({ announcement, action });
  };

  const closeConfirm = () => {
    if (!pendingAction) setConfirmState(null);
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    const { announcement, action } = confirmState;
    setPendingAction({ id: announcement.id, action });

    try {
      if (action === 'publish') {
        await updateAnnouncement(announcement.id, { status: 'published' });
        toast.success('Announcement published.');
      } else {
        await archiveAnnouncement(announcement.id);
        toast.success('Announcement archived.');
      }

      setConfirmState(null);
      if (editingId === announcement.id) {
        setEditingStatus(action === 'publish' ? 'published' : 'archived');
      }
      await Promise.all([
        loadAnnouncements(statusFilter, typeFilter, page),
        loadCounts(),
      ]);
    } catch (err) {
      toast.error(
        err.message ||
          `Could not ${action === 'publish' ? 'publish' : 'archive'} announcement.`
      );
    } finally {
      setPendingAction(null);
    }
  };

  const initialLoading = loading && announcements.length === 0 && !error;
  const hasTypeFilter = typeFilter !== 'all';
  const matchingItems = pagination.totalItems ?? announcements.length;
  const rangeStart = announcements.length
    ? (pagination.page - 1) * (pagination.limit || PAGE_SIZE) + 1
    : 0;
  const rangeEnd = announcements.length
    ? Math.min(
        pagination.page * (pagination.limit || PAGE_SIZE),
        matchingItems
      )
    : 0;
  const rangeLabel = announcements.length
    ? `${numberFormatter.format(rangeStart)}–${numberFormatter.format(
        rangeEnd
      )} of ${numberFormatter.format(matchingItems)}`
    : '';

  const typeOptions = [
    { id: 'all', label: 'All types' },
    ...TYPES.map((type) => ({ id: type.value, label: type.label })),
  ];
  const formTypeOptions = TYPES.map((type) => ({
    id: type.value,
    label: type.label,
  }));
  const audienceOptions = AUDIENCES.map((audience) => ({
    id: audience.value,
    label: audience.label,
  }));

  const canPublish = !editingId || editingStatus !== 'published';
  const saveLabel = !editingId
    ? 'Save draft'
    : editingStatus === 'draft'
      ? 'Save draft'
      : 'Save changes';

  const emptyTitle = hasTypeFilter
    ? 'No matching announcements'
    : statusFilter === 'draft'
      ? 'No draft announcements'
      : `No ${statusFilter} announcements`;
  const emptyMessage = hasTypeFilter
    ? 'Try a different type or clear the filter.'
    : statusFilter === 'draft'
      ? 'Drafts you save will appear here.'
      : statusFilter === 'archived'
        ? 'Archived announcements will appear here.'
        : 'Announcements you publish will appear here.';

  const confirmAnnouncement = confirmState?.announcement;

  return (
    <div className="admin-announcements-view">
      <header className="admin-announcements-masthead">
        <h1 className="admin-announcements-title">Announcements</h1>
        <div className="admin-announcements-metrics">
          <Metric
            label="Published"
            value={
              counts.published === null
                ? null
                : numberFormatter.format(counts.published)
            }
            loading={countsLoading}
          />
          <Metric
            label="Drafts"
            value={
              counts.draft === null
                ? null
                : numberFormatter.format(counts.draft)
            }
            loading={countsLoading}
          />
          <Metric
            label="Archived"
            value={
              counts.archived === null
                ? null
                : numberFormatter.format(counts.archived)
            }
            loading={countsLoading}
          />
        </div>
      </header>

      <div className="admin-announcements-layout">
        <section
          className="admin-announcements-panel admin-announcements-compose"
          aria-labelledby="announcement-compose-heading"
          ref={composerRef}
        >
          <header className="admin-announcements-panel-head">
            <h2
              className="admin-announcements-panel-title"
              id="announcement-compose-heading"
            >
              {editingId ? 'Edit announcement' : 'New announcement'}
            </h2>
            {editingStatus ? (
              <span
                className={`admin-announcements-editing-status admin-announcements-tone--${editingStatus}`}
              >
                {STATUS_LABELS[editingStatus]}
              </span>
            ) : null}
          </header>

          <form
            className="admin-announcements-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit('save');
            }}
          >
            <div className="admin-announcements-form-main">
              <div className="admin-announcements-field">
                <label className="admin-announcements-label" htmlFor={titleId}>
                  Title
                </label>
                <input
                  id={titleId}
                  ref={titleRef}
                  className={`admin-announcements-input${
                    fieldErrors.title ? ' is-invalid' : ''
                  }`}
                  type="text"
                  value={form.title}
                  onChange={setField('title')}
                  placeholder="What do you need to share?"
                  maxLength={150}
                  aria-invalid={Boolean(fieldErrors.title) || undefined}
                  aria-describedby={
                    fieldErrors.title ? titleErrorId : undefined
                  }
                />
                {fieldErrors.title ? (
                  <span className="admin-announcements-error" id={titleErrorId}>
                    {fieldErrors.title}
                  </span>
                ) : null}
              </div>

              <div className="admin-announcements-field">
                <label className="admin-announcements-label" htmlFor={contentId}>
                  Content
                </label>
                <textarea
                  id={contentId}
                  ref={contentRef}
                  className={`admin-announcements-textarea${
                    fieldErrors.content ? ' is-invalid' : ''
                  }`}
                  rows={6}
                  value={form.content}
                  onChange={setField('content')}
                  placeholder="Write the full announcement here."
                  maxLength={5000}
                  aria-invalid={Boolean(fieldErrors.content) || undefined}
                  aria-describedby={
                    fieldErrors.content ? contentErrorId : undefined
                  }
                />
                <div className="admin-announcements-message-meta">
                  {fieldErrors.content ? (
                    <span
                      className="admin-announcements-error"
                      id={contentErrorId}
                    >
                      {fieldErrors.content}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="admin-announcements-count">
                    {form.content.length} / 5000
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-announcements-form-side">
              <SelectField
                label="Type"
                value={form.type}
                options={formTypeOptions}
                onChange={(type) => setFieldValue('type', type)}
                error={fieldErrors.type}
              />
              <SelectField
                label="Audience"
                value={form.audience}
                options={audienceOptions}
                onChange={(audience) => setFieldValue('audience', audience)}
                error={fieldErrors.audience}
              />

              <div className="admin-announcements-form-actions">
                {canPublish ? (
                  <>
                    <Button
                      variant="outline"
                      className="admin-announcements-save"
                      loading={submitting === 'save'}
                      disabled={Boolean(submitting)}
                      onClick={() => handleSubmit('save')}
                    >
                      {saveLabel}
                    </Button>
                    <Button
                      className="admin-announcements-publish"
                      loading={submitting === 'publish'}
                      disabled={Boolean(submitting)}
                      onClick={() => handleSubmit('publish')}
                    >
                      Publish announcement
                    </Button>
                  </>
                ) : (
                  <Button
                    className="admin-announcements-publish"
                    loading={submitting === 'save'}
                    disabled={Boolean(submitting)}
                    onClick={() => handleSubmit('save')}
                  >
                    Save changes
                  </Button>
                )}
                {editingId ? (
                  <Button
                    variant="ghost"
                    className="admin-announcements-cancel"
                    disabled={Boolean(submitting)}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        </section>

        <section
          className="admin-announcements-panel admin-announcements-directory"
          aria-label="Announcement directory"
        >
          <div className="admin-announcements-controls">
            <div
              className="admin-announcements-tabs"
              role="group"
              aria-label="Filter by status"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`admin-announcements-tab${
                    statusFilter === tab.value ? ' is-active' : ''
                  }`}
                  aria-pressed={statusFilter === tab.value}
                  onClick={() => selectStatus(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <SelectField
              label="Type"
              value={typeFilter}
              options={typeOptions}
              onChange={selectType}
              className="admin-announcements-filter"
              hideLabel
            />
          </div>

          {initialLoading ? (
            <DirectorySkeleton />
          ) : error ? (
            <div className="admin-announcements-state">
              <ErrorState
                message={error}
                onRetry={() => {
                  loadAnnouncements(statusFilter, typeFilter, page);
                  loadCounts();
                }}
              />
            </div>
          ) : announcements.length === 0 ? (
            <div className="admin-announcements-state">
              <EmptyState
                title={emptyTitle}
                message={emptyMessage}
                action={
                  hasTypeFilter ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="admin-announcements-clear"
                      onClick={clearTypeFilter}
                    >
                      Clear filter
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <>
              <div
                className={`admin-announcements-list${
                  refreshing ? ' is-refreshing' : ''
                }`}
                aria-busy={loading}
              >
                {announcements.map((announcement) => (
                  <article
                    className="admin-announcements-item"
                    key={announcement.id}
                  >
                    <div className="admin-announcements-item-body">
                      <h3 className="admin-announcements-item-title">
                        {announcement.title}
                      </h3>
                      <p className="admin-announcements-item-content">
                        {announcement.content}
                      </p>
                      <div className="admin-announcements-meta">
                        <span className="admin-announcements-type">
                          {TYPE_LABELS[announcement.type] || announcement.type}
                        </span>
                        <span className="admin-announcements-audience">
                          {AUDIENCE_LABELS[announcement.audience] ||
                            announcement.audience}
                        </span>
                      </div>
                    </div>

                    <div className="admin-announcements-item-side">
                      <time
                        className="admin-announcements-item-date"
                        dateTime={getDisplayDate(announcement) || undefined}
                      >
                        {formatDate(getDisplayDate(announcement))}
                      </time>
                      <div className="admin-announcements-actions">
                        <Button
                          variant="outline"
                          size="sm"
                          className="admin-announcements-action"
                          aria-label={`Edit ${announcement.title}`}
                          disabled={loading || Boolean(pendingAction)}
                          onClick={() => startEdit(announcement)}
                        >
                          Edit
                        </Button>
                        {announcement.status !== 'published' ? (
                          <Button
                            size="sm"
                            className="admin-announcements-action admin-announcements-action--publish"
                            aria-label={`Publish ${announcement.title}`}
                            disabled={loading || Boolean(pendingAction)}
                            onClick={() =>
                              openConfirm(announcement, 'publish')
                            }
                          >
                            Publish
                          </Button>
                        ) : null}
                        {announcement.status !== 'archived' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="admin-announcements-action admin-announcements-action--archive"
                            aria-label={`Archive ${announcement.title}`}
                            disabled={loading || Boolean(pendingAction)}
                            onClick={() =>
                              openConfirm(announcement, 'archive')
                            }
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <nav
                className="admin-announcements-pagination"
                aria-label="Announcement pagination"
              >
                <p className="admin-announcements-range" aria-live="polite">
                  {rangeLabel}
                </p>
                <div className="admin-announcements-pager">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={loading || pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={loading || !pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </nav>
            </>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(confirmState)}
        onClose={closeConfirm}
        title={
          confirmState?.action === 'publish'
            ? 'Publish this announcement?'
            : 'Archive this announcement?'
        }
        width={460}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeConfirm}
              disabled={Boolean(pendingAction)}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmState?.action === 'archive' ? 'danger' : 'primary'
              }
              loading={Boolean(pendingAction)}
              disabled={Boolean(pendingAction)}
              onClick={handleConfirm}
            >
              {confirmState?.action === 'archive' ? 'Archive' : 'Publish'}
            </Button>
          </>
        }
      >
        <p className="admin-announcements-confirm-copy">
          {confirmState?.action === 'publish' ? (
            <>
              This will publish{' '}
              <strong>{confirmAnnouncement?.title}</strong> immediately and
              notify its audience.
            </>
          ) : (
            <>
              This will archive{' '}
              <strong>{confirmAnnouncement?.title}</strong>. It will no longer
              appear publicly, but you can publish it again later.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
