import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { listTeachers, updateTeacherStatus } from '../../services/admin-teacher.service.js';

const numberFormatter = new Intl.NumberFormat('en-IN');

const isPending = (teacher) =>
  String(teacher.displayStatus || teacher.status || '').toLowerCase() === 'pending';

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'T';

function SearchIcon() {
  return (
    <svg
      className="admin-teachers-search-icon"
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
      className="admin-teachers-chevron"
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
      className="admin-teachers-select-check"
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

function CourseFilter({ value, courses, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();
  const labelId = useId();
  const valueId = useId();

  const options = [{ id: 'all', title: 'All courses' }, ...courses];
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
    <div
      className="admin-teachers-filter admin-teachers-filter--course"
      ref={containerRef}
    >
      <span className="admin-teachers-filter-label" id={labelId}>
        Course
      </span>
      <div className="admin-teachers-select-wrap">
        <button
          ref={buttonRef}
          type="button"
          className={`admin-teachers-select${open ? ' is-open' : ''}`}
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
          <span className="admin-teachers-select-value" id={valueId}>
            {selectedOption.title}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul
            className="admin-teachers-select-menu"
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
                className={`admin-teachers-select-option${
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

function TeacherTableSkeleton() {
  return (
    <div className="admin-teachers-skeleton" role="status">
      <span className="sr-only">Loading teachers</span>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div className="admin-teachers-skeleton-row" aria-hidden="true" key={row}>
          <span className="admin-teachers-skeleton-identity">
            <span className="skeleton admin-teachers-skeleton-avatar" />
            <span className="admin-teachers-skeleton-lines">
              <span className="skeleton admin-teachers-skeleton-name" />
              <span className="skeleton admin-teachers-skeleton-email" />
            </span>
          </span>
          <span className="skeleton admin-teachers-skeleton-phone" />
          <span className="skeleton admin-teachers-skeleton-course" />
          <span className="skeleton admin-teachers-skeleton-action" />
        </div>
      ))}
    </div>
  );
}

export default function AdminTeachersPage() {
  const toast = useToast();
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [totalTeachers, setTotalTeachers] = useState(null);
  const [filteredTeachers, setFilteredTeachers] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 0,
    hasNextPage: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const requestIdRef = useRef(0);

  const loadTeachers = async (activeFilters = filters, page = 1) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await listTeachers({
        search: activeFilters.search.trim(),
        courseId: activeFilters.courseId,
        page,
        limit: 50,
      });
      if (requestId !== requestIdRef.current) return;

      setTeachers(response.data.teachers || []);
      setCourses(response.data.courses || []);
      setTotalTeachers(response.data.totalTeachers ?? 0);
      setFilteredTeachers(response.data.filteredTeachers ?? 0);
      setPagination(
        response.data.pagination ?? { page: 1, limit: 50, totalPages: 0, hasNextPage: false }
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load teachers.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const activeFilters = { ...filters };
    const timer = window.setTimeout(
      () => loadTeachers(activeFilters, 1),
      filters.search.trim() ? 250 : 0
    );
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.courseId]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleCourseChange = (nextCourseId) => {
    setFilters((current) => ({
      ...current,
      courseId: nextCourseId,
    }));
  };

  const handlePageChange = (nextPage) => {
    if (loading || nextPage < 1 || nextPage > pagination.totalPages) return;
    loadTeachers(filters, nextPage);
  };

  const clearFilters = () => {
    setFilters({ search: '', courseId: 'all' });
  };

  const handleStatusChange = async (teacher, nextStatus) => {
    setUpdating((current) => ({ ...current, [teacher.id]: nextStatus }));

    try {
      const response = await updateTeacherStatus(teacher.id, nextStatus);
      const updated = response.data.teacher;

      setTeachers((current) =>
        current.map((item) =>
          item.id === teacher.id
            ? {
                ...item,
                status: updated.status,
                displayStatus: updated.displayStatus || updated.status || nextStatus,
              }
            : item
        )
      );

      toast.success(
        `${teacher.name} ${nextStatus === 'accepted' ? 'accepted' : 'rejected'}.`
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update teacher status.');
    } finally {
      setUpdating((current) => {
        const next = { ...current };
        delete next[teacher.id];
        return next;
      });
    }
  };

  const initialLoading = loading && teachers.length === 0 && !error;
  const hasActiveFilters = Boolean(filters.search.trim()) || filters.courseId !== 'all';
  const matchingTeachers = filteredTeachers || teachers.length;
  const rangeStart = teachers.length ? (pagination.page - 1) * (pagination.limit || 50) + 1 : 0;
  const rangeEnd = teachers.length
    ? Math.min(pagination.page * (pagination.limit || 50), matchingTeachers)
    : 0;
  const rangeLabel = teachers.length
    ? `${numberFormatter.format(rangeStart)}–${numberFormatter.format(rangeEnd)} of ${numberFormatter.format(
        matchingTeachers
      )}`
    : '';

  return (
    <div className="admin-teachers-view">
      <header className="admin-teachers-masthead">
        <h1 className="admin-teachers-title">Teachers</h1>
        <div className="admin-teachers-total">
          <span className="admin-teachers-total-label">Total teachers</span>
          {totalTeachers === null ? (
            loading ? (
              <span className="skeleton admin-teachers-total-skeleton" aria-hidden="true" />
            ) : (
              <span className="admin-teachers-total-value">—</span>
            )
          ) : (
            <span className="admin-teachers-total-value">
              {numberFormatter.format(totalTeachers)}
            </span>
          )}
        </div>
      </header>

      <section className="admin-teachers-directory" aria-label="Teacher directory">
        <div className="admin-teachers-controls">
          <div className="admin-teachers-filter admin-teachers-search">
            <label className="admin-teachers-filter-label" htmlFor="teacher-search">
              Search
            </label>
            <div className="admin-teachers-input-wrap">
              <SearchIcon />
              <input
                id="teacher-search"
                className="admin-teachers-input"
                type="search"
                placeholder="Name or phone"
                value={filters.search}
                onChange={handleFilterChange('search')}
              />
            </div>
          </div>

          <CourseFilter
            value={filters.courseId}
            onChange={handleCourseChange}
            courses={courses}
          />
        </div>

        {initialLoading ? (
          <TeacherTableSkeleton />
        ) : error ? (
          <div className="admin-teachers-state">
            <ErrorState
              message={error}
              onRetry={() => loadTeachers(filters, pagination.page)}
            />
          </div>
        ) : teachers.length === 0 ? (
          <div className="admin-teachers-state">
            <EmptyState
              title={hasActiveFilters ? 'No teachers match' : 'No teachers yet'}
              message={
                hasActiveFilters
                  ? 'Try a different search or clear the filters.'
                  : 'Teacher accounts will appear here.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="admin-teachers-clear"
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
            <div className="admin-teachers-table-wrap">
              <table
                className={`admin-teachers-table${loading ? ' is-refreshing' : ''}`}
                aria-busy={loading}
              >
                <caption className="sr-only">Teacher directory</caption>
                <thead>
                  <tr>
                    <th scope="col">Teacher</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Course</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => {
                    const pending = isPending(teacher);
                    const busyStatus = updating[teacher.id];

                    return (
                      <tr key={teacher.id}>
                        <td className="admin-teachers-cell admin-teachers-cell--teacher">
                          <div className="admin-teachers-identity">
                            <span className="admin-teachers-avatar" aria-hidden="true">
                              {getInitials(teacher.name)}
                            </span>
                            <div className="admin-teachers-identity-text">
                              <span className="admin-teachers-name">{teacher.name}</span>
                              <span className="admin-teachers-email">{teacher.email || '—'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="admin-teachers-cell admin-teachers-cell--phone">
                          {teacher.phone || <span className="admin-teachers-empty-value">—</span>}
                        </td>

                        <td className="admin-teachers-cell admin-teachers-cell--course">
                          {teacher.courses?.length ? (
                            <ul className="admin-teachers-course-list">
                              {teacher.courses.map((course) => (
                                <li key={course.id}>{course.title}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="admin-teachers-empty-value">No course</span>
                          )}
                        </td>

                        <td className="admin-teachers-cell admin-teachers-cell--action">
                          {pending ? (
                            <div className="admin-teachers-actions">
                              <Button
                                size="sm"
                                className="admin-teachers-action admin-teachers-action--accept"
                                loading={busyStatus === 'accepted'}
                                disabled={Boolean(busyStatus) || loading}
                                aria-label={`Accept ${teacher.name}`}
                                onClick={() => handleStatusChange(teacher, 'accepted')}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="admin-teachers-action admin-teachers-action--reject"
                                loading={busyStatus === 'rejected'}
                                disabled={Boolean(busyStatus) || loading}
                                aria-label={`Reject ${teacher.name}`}
                                onClick={() => handleStatusChange(teacher, 'rejected')}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <nav className="admin-teachers-pagination" aria-label="Teacher pagination">
              <p className="admin-teachers-range" aria-live="polite">
                {rangeLabel}
              </p>
              <div className="admin-teachers-pager">
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
