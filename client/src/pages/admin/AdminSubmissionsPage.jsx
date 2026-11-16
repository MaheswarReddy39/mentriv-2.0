import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { getAdminSubmissionOverview } from '../../services/submission.service.js';

const LEVELS = [
  { value: 'all', label: 'All levels' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const numberFormatter = new Intl.NumberFormat('en-IN');

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'S';

const formatLevel = (level) =>
  level ? level.charAt(0).toUpperCase() + level.slice(1) : '';

const formatProgress = (row) => {
  if (!row.totalAssignments) return '0%';
  return `${row.progress}%`;
};

function SearchIcon() {
  return (
    <svg
      className="admin-submissions-search-icon"
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
      className="admin-submissions-chevron"
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
      className="admin-submissions-select-check"
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

function FilterSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const openMenu = useCallback(
    (nextIndex = selectedIndex) => {
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
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
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
    <div className="admin-submissions-filter" ref={containerRef}>
      <span className="admin-submissions-filter-label" id={labelId}>
        {label}
      </span>
      <div className="admin-submissions-select-wrap">
        <button
          ref={buttonRef}
          type="button"
          className={`admin-submissions-select${open ? ' is-open' : ''}`}
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
          <span className="admin-submissions-select-value" id={valueId}>
            {selectedOption?.title}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul
            className="admin-submissions-select-menu"
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
                className={`admin-submissions-select-option${
                  index === activeIndex ? ' is-active' : ''
                }${option.id === value ? ' is-selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.id)}
              >
                <span>{option.title}</span>
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
    <div className="admin-submissions-metric">
      <span className="admin-submissions-metric-label">{label}</span>
      {value === null ? (
        loading ? (
          <span className="skeleton admin-submissions-metric-skeleton" aria-hidden="true" />
        ) : (
          <span className="admin-submissions-metric-value">—</span>
        )
      ) : (
        <span className="admin-submissions-metric-value">
          {numberFormatter.format(value)}
        </span>
      )}
    </div>
  );
}

function SubmissionTableSkeleton() {
  return (
    <div className="admin-submissions-skeleton" role="status">
      <span className="sr-only">Loading submissions</span>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div className="admin-submissions-skeleton-row" aria-hidden="true" key={row}>
          <span className="admin-submissions-skeleton-identity">
            <span className="skeleton admin-submissions-skeleton-avatar" />
            <span className="admin-submissions-skeleton-lines">
              <span className="skeleton admin-submissions-skeleton-name" />
              <span className="skeleton admin-submissions-skeleton-email" />
            </span>
          </span>
          <span className="admin-submissions-skeleton-course">
            <span className="skeleton admin-submissions-skeleton-course-title" />
            <span className="skeleton admin-submissions-skeleton-course-level" />
          </span>
          <span className="admin-submissions-skeleton-progress">
            <span className="skeleton admin-submissions-skeleton-progress-label" />
            <span className="skeleton admin-submissions-skeleton-progress-bar" />
          </span>
          <span className="skeleton admin-submissions-skeleton-status" />
        </div>
      ))}
    </div>
  );
}

export default function AdminSubmissionsPage() {
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState({
    totalStudents: null,
    totalSubmissions: null,
    pendingSubmissions: null,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 0,
    hasNextPage: false,
    totalItems: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    level: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const loadSubmissions = async (activeFilters = filters, page = 1) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminSubmissionOverview({
        search: (activeFilters.search || '').trim(),
        courseId: activeFilters.courseId,
        level: activeFilters.level,
        page,
        limit: 50,
      });

      if (requestId !== requestIdRef.current) return;

      setRows(response.data.rows || []);
      setCourses(response.data.courses || []);
      setSummary({
        totalStudents: response.data.totalStudents ?? 0,
        totalSubmissions: response.data.totalSubmissions ?? 0,
        pendingSubmissions: response.data.pendingSubmissions ?? 0,
      });
      setPagination(
        response.data.pagination ?? {
          page: 1,
          limit: 50,
          totalPages: 0,
          hasNextPage: false,
          totalItems: 0,
        }
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load submissions.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const activeFilters = { ...filters };
    const timer = window.setTimeout(
      () => loadSubmissions(activeFilters, 1),
      filters.search.trim() ? 250 : 0
    );
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.courseId, filters.level]);

  const setFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePageChange = (nextPage) => {
    if (loading || nextPage < 1 || nextPage > pagination.totalPages) return;
    loadSubmissions(filters, nextPage);
  };

  const clearFilters = () => {
    setFilters({ search: '', courseId: 'all', level: 'all' });
  };

  const initialLoading = loading && rows.length === 0 && !error;
  const hasActiveFilters =
    Boolean(filters.search.trim()) || filters.courseId !== 'all' || filters.level !== 'all';
  const matchingRows = pagination.totalItems ?? rows.length;
  const rangeStart = rows.length ? (pagination.page - 1) * (pagination.limit || 50) + 1 : 0;
  const rangeEnd = rows.length
    ? Math.min(pagination.page * (pagination.limit || 50), matchingRows)
    : 0;
  const rangeLabel = rows.length
    ? `${numberFormatter.format(rangeStart)}–${numberFormatter.format(rangeEnd)} of ${numberFormatter.format(
        matchingRows
      )}`
    : '';
  const courseOptions = [
    { id: 'all', title: 'All courses' },
    ...courses.map((course) => ({ id: course.id, title: course.title })),
  ];
  const levelOptions = LEVELS.map((level) => ({ id: level.value, title: level.label }));

  return (
    <div className="admin-submissions-view">
      <header className="admin-submissions-masthead">
        <h1 className="admin-submissions-title">Submissions</h1>
        <div className="admin-submissions-metrics">
          <Metric
            label="Students"
            value={summary.totalStudents}
            loading={loading}
          />
          <Metric
            label="Submissions"
            value={summary.totalSubmissions}
            loading={loading}
          />
          <Metric
            label="Pending"
            value={summary.pendingSubmissions}
            loading={loading}
          />
        </div>
      </header>

      <section className="admin-submissions-directory" aria-label="Submission overview">
        <div className="admin-submissions-controls">
          <div className="admin-submissions-filter admin-submissions-search">
            <label className="admin-submissions-filter-label" htmlFor="submission-search">
              Search
            </label>
            <div className="admin-submissions-input-wrap">
              <SearchIcon />
              <input
                id="submission-search"
                className="admin-submissions-input"
                type="search"
                placeholder="Name, email, phone or course"
                value={filters.search}
                onChange={(event) => setFilter('search', event.target.value)}
              />
            </div>
          </div>

          <FilterSelect
            label="Course"
            value={filters.courseId}
            options={courseOptions}
            onChange={(courseId) => setFilter('courseId', courseId)}
          />

          <FilterSelect
            label="Level"
            value={filters.level}
            options={levelOptions}
            onChange={(level) => setFilter('level', level)}
          />
        </div>

        {initialLoading ? (
          <SubmissionTableSkeleton />
        ) : error ? (
          <div className="admin-submissions-state">
            <ErrorState
              message={error}
              onRetry={() => loadSubmissions(filters, pagination.page)}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="admin-submissions-state">
            <EmptyState
              title={hasActiveFilters ? 'No submissions match' : 'No submissions yet'}
              message={
                hasActiveFilters
                  ? 'Try a different search or clear the filters.'
                  : 'Student submission progress will appear here.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="admin-submissions-clear"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="admin-submissions-table-wrap">
              <table
                className={`admin-submissions-table${loading ? ' is-refreshing' : ''}`}
                aria-busy={loading}
              >
                <caption className="sr-only">Student submission overview</caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Course</th>
                    <th scope="col">Progress</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const complete = row.progress >= 100;

                    return (
                      <tr key={row.id}>
                        <td className="admin-submissions-cell admin-submissions-cell--student">
                          <div className="admin-submissions-identity">
                            <span className="admin-submissions-avatar" aria-hidden="true">
                              {getInitials(row.student.name)}
                            </span>
                            <div className="admin-submissions-identity-text">
                              <span className="admin-submissions-name">{row.student.name}</span>
                              <span className="admin-submissions-email">
                                {row.student.email || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="admin-submissions-cell admin-submissions-cell--course">
                          <span className="admin-submissions-course-title">
                            {row.course.title}
                          </span>
                          {row.course.level ? (
                            <span className="admin-submissions-course-level">
                              {formatLevel(row.course.level)}
                            </span>
                          ) : null}
                        </td>

                        <td className="admin-submissions-cell admin-submissions-cell--progress">
                          <div className="admin-submissions-progress">
                            <div className="admin-submissions-progress-head">
                              <span className="admin-submissions-progress-value">
                                {formatProgress(row)}
                              </span>
                              <span className="admin-submissions-progress-meta">
                                {row.submittedCount} of {row.totalAssignments} submitted
                              </span>
                            </div>
                            <div
                              className="admin-submissions-progress-track"
                              role="progressbar"
                              aria-valuenow={row.progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${row.student.name} progress`}
                            >
                              <span
                                className={`admin-submissions-progress-fill${complete ? ' is-complete' : ''}`}
                                style={{ width: `${Math.min(Math.max(row.progress, 0), 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="admin-submissions-cell admin-submissions-cell--status">
                          <span
                            className={`admin-submissions-status admin-submissions-tone--${
                              row.status === 'submitted' ? 'submitted' : 'pending'
                            }`}
                          >
                            {row.status === 'submitted' ? 'Submitted' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <nav className="admin-submissions-pagination" aria-label="Submission pagination">
              <p className="admin-submissions-range" aria-live="polite">
                {rangeLabel}
              </p>
              <div className="admin-submissions-pager">
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
  );
}
