import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { listStudents, updateStudentStatus } from '../../services/student.service.js';

const LEVELS = [
  { value: 'all', label: 'All levels' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const numberFormatter = new Intl.NumberFormat('en-IN');

const isPending = (student) =>
  String(student.displayStatus || student.status || '').toLowerCase() === 'pending';

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'S';

function SearchIcon() {
  return (
    <svg
      className="admin-students-search-icon"
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
      className="admin-students-chevron"
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
      className="admin-students-select-check"
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
    <div className="admin-students-filter" ref={containerRef}>
      <span className="admin-students-filter-label" id={labelId}>
        {label}
      </span>
      <div className="admin-students-select-wrap">
        <button
          ref={buttonRef}
          type="button"
          className={`admin-students-select${open ? ' is-open' : ''}`}
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
          <span className="admin-students-select-value" id={valueId}>
            {selectedOption?.title}
          </span>
          <ChevronDownIcon />
        </button>

        {open ? (
          <ul
            className="admin-students-select-menu"
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
                className={`admin-students-select-option${
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

function StudentTableSkeleton() {
  return (
    <div className="admin-students-skeleton" role="status">
      <span className="sr-only">Loading students</span>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div className="admin-students-skeleton-row" aria-hidden="true" key={row}>
          <span className="admin-students-skeleton-identity">
            <span className="skeleton admin-students-skeleton-avatar" />
            <span className="skeleton admin-students-skeleton-name" />
          </span>
          <span className="skeleton admin-students-skeleton-email" />
          <span className="skeleton admin-students-skeleton-phone" />
          <span className="skeleton admin-students-skeleton-course" />
          <span className="skeleton admin-students-skeleton-action" />
        </div>
      ))}
    </div>
  );
}

export default function AdminStudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 0,
    hasNextPage: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    level: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const requestIdRef = useRef(0);

  const loadStudents = async (activeFilters = filters, page = 1) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await listStudents({
        search: activeFilters.search.trim(),
        courseId: activeFilters.courseId,
        level: activeFilters.level,
        page,
        limit: 50,
      });
      if (requestId !== requestIdRef.current) return;

      setStudents(response.data.students || []);
      setCourses(response.data.courses || []);
      setTotalStudents(response.data.totalStudents ?? 0);
      setFilteredStudents(response.data.filteredStudents ?? 0);
      setPagination(
        response.data.pagination ?? { page: 1, limit: 50, totalPages: 0, hasNextPage: false }
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load students.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const activeFilters = { ...filters };
    const timer = window.setTimeout(
      () => loadStudents(activeFilters, 1),
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
    loadStudents(filters, nextPage);
  };

  const clearFilters = () => {
    setFilters({ search: '', courseId: 'all', level: 'all' });
  };

  const handleStatusChange = async (student, nextStatus) => {
    setUpdating((current) => ({ ...current, [student.id]: nextStatus }));

    try {
      const response = await updateStudentStatus(student.id, nextStatus);
      const updated = response.data.student;

      setStudents((current) =>
        current.map((item) =>
          item.id === student.id
            ? {
                ...item,
                status: updated.status,
                displayStatus: updated.displayStatus || updated.status || nextStatus,
              }
            : item
        )
      );

      toast.success(
        `${student.name} ${nextStatus === 'accepted' ? 'accepted' : 'rejected'}.`
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update student status.');
    } finally {
      setUpdating((current) => {
        const next = { ...current };
        delete next[student.id];
        return next;
      });
    }
  };

  const initialLoading = loading && students.length === 0 && !error;
  const hasActiveFilters =
    Boolean(filters.search.trim()) || filters.courseId !== 'all' || filters.level !== 'all';
  const matchingStudents = filteredStudents || students.length;
  const rangeStart = students.length ? (pagination.page - 1) * (pagination.limit || 50) + 1 : 0;
  const rangeEnd = students.length
    ? Math.min(pagination.page * (pagination.limit || 50), matchingStudents)
    : 0;
  const rangeLabel = students.length
    ? `${numberFormatter.format(rangeStart)}–${numberFormatter.format(rangeEnd)} of ${numberFormatter.format(
        matchingStudents
      )}`
    : '';
  const courseOptions = [
    { id: 'all', title: 'All courses' },
    ...courses.map((course) => ({ id: course.id, title: course.title })),
  ];
  const levelOptions = LEVELS.map((level) => ({ id: level.value, title: level.label }));

  return (
    <div className="admin-students-view">
      <header className="admin-students-masthead">
        <h1 className="admin-students-title">Students</h1>
        <div className="admin-students-total">
          <span className="admin-students-total-label">Total students</span>
          {totalStudents === null ? (
            loading ? (
              <span className="skeleton admin-students-total-skeleton" aria-hidden="true" />
            ) : (
              <span className="admin-students-total-value">—</span>
            )
          ) : (
            <span className="admin-students-total-value">
              {numberFormatter.format(totalStudents)}
            </span>
          )}
        </div>
      </header>

      <section className="admin-students-directory" aria-label="Student directory">
        <div className="admin-students-controls">
          <div className="admin-students-filter admin-students-search">
            <label className="admin-students-filter-label" htmlFor="student-search">
              Search
            </label>
            <div className="admin-students-input-wrap">
              <SearchIcon />
              <input
                id="student-search"
                className="admin-students-input"
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
          <StudentTableSkeleton />
        ) : error ? (
          <div className="admin-students-state">
            <ErrorState
              message={error}
              onRetry={() => loadStudents(filters, pagination.page)}
            />
          </div>
        ) : students.length === 0 ? (
          <div className="admin-students-state">
            <EmptyState
              title={hasActiveFilters ? 'No students match' : 'No students yet'}
              message={
                hasActiveFilters
                  ? 'Try a different search or clear the filters.'
                  : 'Student accounts will appear here.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="admin-students-clear"
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
            <div className="admin-students-table-wrap">
              <table
                className={`admin-students-table${loading ? ' is-refreshing' : ''}`}
                aria-busy={loading}
              >
                <caption className="sr-only">Student directory</caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Course</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const pending = isPending(student);
                    const busyStatus = updating[student.id];

                    return (
                      <tr key={student.id}>
                        <td className="admin-students-cell admin-students-cell--student">
                          <div className="admin-students-identity">
                            <span className="admin-students-avatar" aria-hidden="true">
                              {getInitials(student.name)}
                            </span>
                            <div className="admin-students-identity-text">
                              <span className="admin-students-name">{student.name}</span>
                            </div>
                          </div>
                        </td>

                        <td className="admin-students-cell admin-students-cell--email">
                          {student.email || <span className="admin-students-empty-value">—</span>}
                        </td>

                        <td className="admin-students-cell admin-students-cell--phone">
                          {student.phone || <span className="admin-students-empty-value">—</span>}
                        </td>

                        <td className="admin-students-cell admin-students-cell--course">
                          {student.courses?.length ? (
                            <ul className="admin-students-course-list">
                              {student.courses.map((course) => (
                                <li key={course.id}>{course.title}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="admin-students-empty-value">No course</span>
                          )}
                        </td>

                        <td className="admin-students-cell admin-students-cell--action">
                          {pending ? (
                            <div className="admin-students-actions">
                              <Button
                                size="sm"
                                className="admin-students-action admin-students-action--accept"
                                loading={busyStatus === 'accepted'}
                                disabled={Boolean(busyStatus) || loading}
                                aria-label={`Accept ${student.name}`}
                                onClick={() => handleStatusChange(student, 'accepted')}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="admin-students-action admin-students-action--reject"
                                loading={busyStatus === 'rejected'}
                                disabled={Boolean(busyStatus) || loading}
                                aria-label={`Reject ${student.name}`}
                                onClick={() => handleStatusChange(student, 'rejected')}
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

            <nav className="admin-students-pagination" aria-label="Student pagination">
              <p className="admin-students-range" aria-live="polite">
                {rangeLabel}
              </p>
              <div className="admin-students-pager">
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
