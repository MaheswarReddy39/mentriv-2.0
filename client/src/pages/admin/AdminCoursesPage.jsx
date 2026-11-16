import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import {
  archiveCourse,
  listAdminCourses,
  updateCourse,
} from '../../services/course.service.js';
import { formatCurrency } from '../../utils/format.js';

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];

const LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LEVEL_LABELS = Object.fromEntries(
  LEVELS.map((level) => [level.value, level.label])
);

const numberFormatter = new Intl.NumberFormat('en-IN');

const capitalize = (value = '') =>
  String(value).replace(/\b\w/g, (char) => char.toUpperCase());

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return '—';
  if (Number(price) === 0) return 'Free';
  return formatCurrency(price) || '—';
};

const formatDuration = (duration) => {
  const hours = Number(duration);
  if (!Number.isFinite(hours) || hours <= 0) return 'Self-paced';
  return `${numberFormatter.format(hours)} ${hours === 1 ? 'hour' : 'hours'}`;
};

function SearchIcon() {
  return (
    <svg
      className="admin-courses-search-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3 3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="admin-courses-chevron"
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
      className="admin-courses-select-check"
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

function SelectField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState('bottom');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();
  const labelId = useId();
  const valueId = useId();

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
    <div className="admin-courses-filter admin-courses-level" ref={containerRef}>
      <span className="admin-courses-filter-label sr-only" id={labelId}>
        {label}
      </span>
      <div className="admin-courses-select-wrap">
        <button
          ref={buttonRef}
          type="button"
          className={`admin-courses-select${open ? ' is-open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          onClick={() => {
            if (open) setOpen(false);
            else openMenu();
          }}
          onKeyDown={handleKeyDown}
        >
          <span className="admin-courses-select-value" id={valueId}>
            {selectedOption?.label}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul
            className={`admin-courses-select-menu${
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
                className={`admin-courses-select-option${
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
    </div>
  );
}

function Metric({ label, value, loading }) {
  return (
    <div className="admin-courses-metric">
      <span className="admin-courses-metric-label">{label}</span>
      {loading ? (
        <span
          className="skeleton admin-courses-metric-skeleton"
          aria-hidden="true"
        />
      ) : (
        <span className="admin-courses-metric-value">{value ?? '—'}</span>
      )}
    </div>
  );
}

function CourseTableSkeleton() {
  return (
    <div className="admin-courses-skeleton" role="status">
      <span className="sr-only">Loading courses</span>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div className="admin-courses-skeleton-row" aria-hidden="true" key={row}>
          <div className="admin-courses-skeleton-identity">
            <span className="skeleton admin-courses-skeleton-name" />
            <span className="skeleton admin-courses-skeleton-desc" />
          </div>
          <span className="skeleton admin-courses-skeleton-level" />
          <span className="skeleton admin-courses-skeleton-duration" />
          <span className="skeleton admin-courses-skeleton-price" />
          <span className="skeleton admin-courses-skeleton-actions" />
        </div>
      ))}
    </div>
  );
}

export default function AdminCoursesPage() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [counts, setCounts] = useState({
    published: null,
    draft: null,
    archived: null,
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('published');
  const [levelFilter, setLevelFilter] = useState('all');
  const [search, setSearch] = useState('');
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
  const [confirmState, setConfirmState] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const requestIdRef = useRef(0);
  const createdNoticeRef = useRef(false);
  const updatedNoticeRef = useRef(false);

  // Surface course editor results once, then clear the history state.
  useEffect(() => {
    const createdTitle = location.state?.createdCourseTitle;
    const updatedTitle = location.state?.updatedCourseTitle;

    if (createdTitle && !createdNoticeRef.current) {
      createdNoticeRef.current = true;
      toast.success(`“${createdTitle}” published`);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (updatedTitle && !updatedNoticeRef.current) {
      updatedNoticeRef.current = true;
      toast.success(`“${updatedTitle}” updated`);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate, toast]);

  const loadCourses = async ({
    status = statusFilter,
    level = levelFilter,
    term = search,
    nextPage = 1,
  } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const params = {
        status,
        page: nextPage,
        limit: PAGE_SIZE,
      };
      if (level && level !== 'all') params.level = level;
      if (term.trim()) params.search = term.trim();

      const response = await listAdminCourses(params);
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
        loadCourses({ status, level, term, nextPage: nextPagination.totalPages });
        return;
      }

      setCourses(data.courses || []);
      setPagination(nextPagination);
      setPage(nextPagination.page || nextPage);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setCourses([]);
      setError(err.message || 'Failed to load courses.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadCounts = async () => {
    setCountsLoading(true);
    const results = await Promise.allSettled(
      STATUS_TABS.map((tab) =>
        listAdminCourses({ status: tab.value, limit: 1 })
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
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => loadCourses({ nextPage: 1 }),
      search.trim() ? 250 : 0
    );
    return () => window.clearTimeout(timer);
  }, [statusFilter, levelFilter, search]);

  const selectStatus = (status) => {
    if (status === statusFilter) return;
    setStatusFilter(status);
    setPage(1);
  };

  const selectLevel = (level) => {
    if (level === levelFilter) return;
    setLevelFilter(level);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setLevelFilter('all');
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    if (loading || nextPage < 1 || nextPage > (pagination.totalPages || 0)) {
      return;
    }
    setPage(nextPage);
    loadCourses({ nextPage });
  };

  const openConfirm = (course, action) => {
    setConfirmState({ course, action });
  };

  const closeConfirm = () => {
    if (!pendingAction) setConfirmState(null);
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    const { course, action } = confirmState;
    setPendingAction(action);

    try {
      if (action === 'publish') {
        await updateCourse(course.id, { status: 'published' });
        toast.success(`“${course.title}” published`);
      } else {
        await archiveCourse(course.id);
        toast.success(`“${course.title}” archived`);
      }

      setConfirmState(null);
      await Promise.all([
        loadCourses({ nextPage: page }),
        loadCounts(),
      ]);
    } catch (err) {
      toast.error(
        action === 'publish' ? 'Could not publish course' : 'Could not archive course',
        { description: err.message || 'Please try again.' }
      );
    } finally {
      setPendingAction(null);
    }
  };

  const initialLoading = loading && courses.length === 0 && !error;
  const hasActiveFilters = Boolean(search.trim()) || levelFilter !== 'all';
  const matchingCourses = pagination.totalItems ?? courses.length;
  const rangeStart = courses.length
    ? (pagination.page - 1) * (pagination.limit || PAGE_SIZE) + 1
    : 0;
  const rangeEnd = courses.length
    ? Math.min(
        pagination.page * (pagination.limit || PAGE_SIZE),
        matchingCourses
      )
    : 0;
  const rangeLabel = courses.length
    ? `${numberFormatter.format(rangeStart)}–${numberFormatter.format(
        rangeEnd
      )} of ${numberFormatter.format(matchingCourses)}`
    : '';

  const levelOptions = [
    { id: 'all', label: 'All levels' },
    ...LEVELS.map((level) => ({ id: level.value, label: level.label })),
  ];

  const emptyTitle = hasActiveFilters
    ? 'No courses match'
    : statusFilter === 'draft'
      ? 'No draft courses'
      : statusFilter === 'archived'
        ? 'No archived courses'
        : 'No published courses';
  const emptyMessage = hasActiveFilters
    ? 'Try a different search or clear the filters.'
    : statusFilter === 'draft'
      ? 'Courses saved as drafts will appear here.'
      : statusFilter === 'archived'
        ? 'Archived courses will appear here.'
        : 'Courses you publish will appear here.';

  const confirmCourse = confirmState?.course;

  return (
    <div className="admin-courses-view">
      <header className="admin-courses-masthead">
        <h1 className="admin-courses-title">Courses</h1>
        <div className="admin-courses-metrics">
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

      <section className="admin-courses-directory" aria-label="Course catalog">
        <div className="admin-courses-controls">
          <div
            className="admin-courses-tabs"
            role="group"
            aria-label="Filter by status"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`admin-courses-tab${
                  statusFilter === tab.value ? ' is-active' : ''
                }`}
                aria-pressed={statusFilter === tab.value}
                onClick={() => selectStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="admin-courses-filters">
            <div className="admin-courses-filter admin-courses-search">
              <label className="admin-courses-filter-label sr-only" htmlFor="course-search">
                Search
              </label>
              <div className="admin-courses-input-wrap">
                <SearchIcon />
                <input
                  id="course-search"
                  className="admin-courses-input"
                  type="search"
                  placeholder="Search courses"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <SelectField
              label="Level"
              value={levelFilter}
              options={levelOptions}
              onChange={selectLevel}
            />

            <Link
              to="/admin/courses/new"
              className="btn btn-primary admin-courses-create"
            >
              New course
            </Link>
          </div>
        </div>

        {initialLoading ? (
          <CourseTableSkeleton />
        ) : error ? (
          <div className="admin-courses-state">
            <ErrorState
              message={error}
              onRetry={() => {
                loadCourses({ nextPage: page });
                loadCounts();
              }}
            />
          </div>
        ) : courses.length === 0 ? (
          <div className="admin-courses-state">
            <EmptyState
              title={emptyTitle}
              message={emptyMessage}
              action={
                hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="admin-courses-clear"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : statusFilter === 'published' ? (
                  <Link
                    to="/admin/courses/new"
                    className="btn btn-primary btn-sm"
                  >
                    New course
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="admin-courses-table-wrap">
              <table
                className={`admin-courses-table${loading ? ' is-refreshing' : ''}`}
                aria-busy={loading}
              >
                <caption className="sr-only">Course catalog</caption>
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col">Level</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Price</th>
                    <th scope="col" className="admin-courses-cell--actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td className="admin-courses-cell admin-courses-cell--course">
                        <div className="admin-courses-identity">
                          <span className="admin-courses-name">
                            {course.title}
                          </span>
                          {course.shortDescription ? (
                            <span className="admin-courses-desc">
                              {course.shortDescription}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="admin-courses-cell admin-courses-cell--level">
                        <span className="admin-courses-cell-label">Level</span>
                        {LEVEL_LABELS[course.level] ||
                          capitalize(course.level) ||
                          '—'}
                      </td>

                      <td className="admin-courses-cell admin-courses-cell--duration">
                        <span className="admin-courses-cell-label">
                          Duration
                        </span>
                        {formatDuration(course.duration)}
                      </td>

                      <td className="admin-courses-cell admin-courses-cell--price">
                        <span className="admin-courses-cell-label">Price</span>
                        {formatPrice(course.price)}
                      </td>

                      <td className="admin-courses-cell admin-courses-cell--actions">
                        <div className="admin-courses-actions">
                          <Link
                            to={`/admin/courses/${course.id}/edit`}
                            className="admin-courses-action"
                          >
                            Edit
                          </Link>
                          <a
                            href={`/courses/${course.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-courses-action"
                          >
                            View
                          </a>
                          {course.status !== 'archived' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="admin-courses-action admin-courses-action--archive"
                              aria-label={`Archive ${course.title}`}
                              disabled={Boolean(pendingAction)}
                              onClick={() => openConfirm(course, 'archive')}
                            >
                              Archive
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="admin-courses-action admin-courses-action--publish"
                              aria-label={`Publish ${course.title}`}
                              disabled={Boolean(pendingAction)}
                              onClick={() => openConfirm(course, 'publish')}
                            >
                              Publish
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className="admin-courses-pagination" aria-label="Course pagination">
              <p className="admin-courses-range" aria-live="polite">
                {rangeLabel}
              </p>
              <div className="admin-courses-pager">
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

      <Modal
        open={Boolean(confirmState)}
        onClose={closeConfirm}
        title={
          confirmState?.action === 'publish'
            ? 'Publish this course?'
            : 'Archive this course?'
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
        <p className="admin-courses-confirm-copy">
          {confirmState?.action === 'publish' ? (
            <>
              This will add <strong>{confirmCourse?.title}</strong> to the
              public catalog immediately.
            </>
          ) : (
            <>
              This will remove <strong>{confirmCourse?.title}</strong> from the
              public catalog. You can publish it again later.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
