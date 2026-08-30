import { useEffect, useState } from 'react';
import { listPublishedCourses } from '../../services/course.service.js';
import CourseCard from '../../components/courses/CourseCard.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Button from '../../components/common/Button.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

const LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const PAGE_SIZE = 3;

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, level]);

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
          setCategories((current) => Array.from(new Set([...current, ...found])));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load courses');
        }
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
  }, [page, debouncedSearch, category, level]);

  const hasFilters = Boolean(debouncedSearch || category || level);

  return (
    <>
      <h1>Courses</h1>
      <p className="text-body-lg" style={{ color: 'var(--color-text-secondary)' }}>
        Browse published courses and start learning.
      </p>

      <div role="search" className="card" style={{
        display: 'grid',
        gap: 'var(--space-4)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        alignItems: 'end',
        marginBlock: 'var(--space-6)',
      }}>
        <Input
          label="Search"
          type="search"
          placeholder="Search by title or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </Select>
        <Select label="Course Level" value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="">All</option>
          {LEVELS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </Select>
        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={() => { setSearch(''); setCategory(''); setLevel(''); }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {loading ? (
        <Loading label="Loading coursesâ€¦" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setPage((p) => p)} />
      ) : courses.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No courses match your filters' : 'No courses published yet'}
          message={hasFilters ? 'Try adjusting your search or filters.' : 'Check back soon for new content.'}
          action={hasFilters ? (
            <Button variant="outline" onClick={() => { setSearch(''); setCategory(''); setLevel(''); }}>
              Clear filters
            </Button>
          ) : null}
        />
      ) : (
        <>
          <div className="public-course-grid">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          <nav aria-label="Course pages" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span style={{ alignSelf: 'center' }} className="text-sm">
              Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination?.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </>
  );
}
