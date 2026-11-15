import { useEffect, useRef, useState } from 'react';
import { listPublishedCourses } from '../../services/course.service.js';
import CourseCard from '../../components/courses/CourseCard.jsx';
import CatalogFilterSelect from '../../components/courses/CatalogFilterSelect.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const LEVELS = [
  { value: 'basic', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const PAGE_SIZE = 6;

const capitalize = (value = '') =>
  String(value).replace(/\b\w/g, (char) => char.toUpperCase());

function CatalogSkeleton() {
  return (
    <div className="catalog-skeleton-card" aria-hidden="true">
      <div className="catalog-skeleton-media skeleton" />
      <div className="catalog-skeleton-body">
        <div className="catalog-skeleton-meta">
          <span className="skeleton catalog-skeleton-line catalog-skeleton-category" />
          <span className="skeleton catalog-skeleton-pill" />
        </div>
        <span className="skeleton catalog-skeleton-line catalog-skeleton-title" />
        <span className="skeleton catalog-skeleton-line catalog-skeleton-title catalog-skeleton-title-short" />
        <span className="skeleton catalog-skeleton-line catalog-skeleton-desc" />
        <span className="skeleton catalog-skeleton-line catalog-skeleton-desc catalog-skeleton-desc-short" />
        <div className="catalog-skeleton-footer">
          <span className="skeleton catalog-skeleton-line catalog-skeleton-duration" />
          <span className="skeleton catalog-skeleton-circle" />
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounce search input and return to the first page with the committed query.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: PAGE_SIZE };
        if (debouncedSearch) params.search = debouncedSearch;
        if (category) params.category = category;
        if (level) params.level = level;

        const response = await listPublishedCourses(params);
        if (cancelled) return;

        setCourses(response.data.courses);
        setPagination(response.data.pagination);

        if (!category && page === 1) {
          const found = new Set(
            response.data.courses.map((course) => course.category).filter(Boolean)
          );
          setCategories((current) =>
            Array.from(new Set([...current, ...found])).sort((a, b) => a.localeCompare(b))
          );
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Failed to load courses');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, category, level, reloadToken]);

  const hasFilters = Boolean(debouncedSearch || category || level);

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    searchRef.current?.focus();
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('');
    setLevel('');
    setPage(1);
    searchRef.current?.focus();
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const totalItems = pagination?.totalItems ?? 0;
  const firstItem = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, totalItems);
  const resultsLabel = totalItems === 0
    ? 'No courses'
    : totalItems === 1
      ? '1 course'
      : `Showing ${firstItem}\u2013${lastItem} of ${totalItems} courses`;
  const totalPages = pagination?.totalPages ?? 0;

  return (
    <div className="page-courses page-marketing">
      <div className="catalog-shell">
        <header className="catalog-masthead">
          <h1 className="catalog-title">
            Find your <span className="catalog-title-accent">next</span> course.
          </h1>
        </header>

        <div
          className="catalog-toolbar"
          role="search"
          aria-label="Search and filter courses"
        >
          <div className="catalog-field catalog-field-search">
            <label className="catalog-field-label" htmlFor="catalog-search">
              Search
            </label>
            <div className="catalog-search-control">
              <svg className="catalog-search-icon" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="5.25" />
                <path d="m13 13 3.5 3.5" />
              </svg>
              <input
                id="catalog-search"
                ref={searchRef}
                className="catalog-input"
                type="search"
                placeholder="Search courses by title or topic"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
              />
              {search ? (
                <button
                  type="button"
                  className="catalog-search-clear"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m4 4 8 8M12 4l-8 8" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          <div className="catalog-field catalog-field-filter">
            <span className="catalog-field-label" id="catalog-category-label">
              Category
            </span>
            <CatalogFilterSelect
              id="catalog-category"
              labelledBy="catalog-category-label"
              value={category}
              allLabel="All categories"
              options={categories.map((item) => ({
                value: item,
                label: capitalize(item),
              }))}
              onChange={(nextCategory) => {
                setCategory(nextCategory);
                setPage(1);
              }}
            />
          </div>

          <div className="catalog-field catalog-field-filter">
            <span className="catalog-field-label" id="catalog-level-label">
              Level
            </span>
            <CatalogFilterSelect
              id="catalog-level"
              labelledBy="catalog-level-label"
              value={level}
              allLabel="All levels"
              options={LEVELS}
              onChange={(nextLevel) => {
                setLevel(nextLevel);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="catalog-results-bar" ref={resultsRef}>
          <p className="catalog-results-count" aria-live="polite">
            {loading ? 'Loading courses…' : error ? 'Couldn’t load courses' : resultsLabel}
          </p>

          {hasFilters ? (
            <div className="catalog-filter-summary">
              <span className="catalog-filter-summary-label">Filtered by</span>

              {debouncedSearch ? (
                <span className="catalog-chip">
                  <span className="catalog-chip-value">“{debouncedSearch}”</span>
                  <button
                    type="button"
                    className="catalog-chip-remove"
                    onClick={clearSearch}
                    aria-label={`Clear search filter: ${debouncedSearch}`}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </span>
              ) : null}

              {category ? (
                <span className="catalog-chip">
                  <span className="catalog-chip-value">{capitalize(category)}</span>
                  <button
                    type="button"
                    className="catalog-chip-remove"
                    onClick={() => {
                      setCategory('');
                      setPage(1);
                    }}
                    aria-label={`Remove category filter: ${capitalize(category)}`}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </span>
              ) : null}

              {level ? (
                <span className="catalog-chip">
                  <span className="catalog-chip-value">
                    {LEVELS.find((item) => item.value === level)?.label || capitalize(level)}
                  </span>
                  <button
                    type="button"
                    className="catalog-chip-remove"
                    onClick={() => {
                      setLevel('');
                      setPage(1);
                    }}
                    aria-label={`Remove level filter: ${
                      LEVELS.find((item) => item.value === level)?.label || capitalize(level)
                    }`}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </span>
              ) : null}

              <button type="button" className="catalog-clear-all" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="catalog-grid" aria-busy="true">
            <span className="sr-only">Loading courses…</span>
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <CatalogSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="catalog-state">
            <ErrorState
              message={error}
              onRetry={() => setReloadToken((token) => token + 1)}
            />
          </div>
        ) : courses.length === 0 ? (
          <div className="catalog-state">
            <EmptyState
              title={hasFilters ? 'No courses match your filters' : 'No courses published yet'}
              message={
                hasFilters
                  ? 'Try a different search, or clear the filters to see the full catalog.'
                  : 'Check back soon for new content.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="catalog-grid">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav className="catalog-pager" aria-label="Course pages">
                <button
                  type="button"
                  className="catalog-pager-btn"
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                </button>

                <span className="catalog-pager-status">
                  Page {pagination?.page ?? page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="catalog-pager-btn"
                  onClick={() => changePage(page + 1)}
                  disabled={!pagination?.hasNextPage}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m6 3 5 5-5 5" />
                  </svg>
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
