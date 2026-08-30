import { useEffect, useRef, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import { getAdminSubmissionOverview } from '../../services/submission.service.js';

const LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const formatProgress = (row) => {
  if (!row.totalAssignments) return '0%';
  return `${row.progress}%`;
};

export default function AdminSubmissionsPage() {
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [summary, setSummary] = useState({
    totalStudents: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    level: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const loadSubmissions = async (activeFilters = filters) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminSubmissionOverview({
        search: activeFilters.search.trim(),
        courseId: activeFilters.courseId,
        level: activeFilters.level,
      });

      if (requestId !== requestIdRef.current) return;

      setRows(response.data.rows);
      setCourses(response.data.courses);
      setSummary({
        totalStudents: response.data.totalStudents,
        totalSubmissions: response.data.totalSubmissions,
        pendingSubmissions: response.data.pendingSubmissions,
      });
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
    const timer = window.setTimeout(() => loadSubmissions(activeFilters), filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.courseId, filters.level]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  return (
    <div className="admin-submissions-page">
      <header className="admin-submissions-header">
        <div>
          <h1>Submissions</h1>
          <p>Total Students: {summary.totalStudents}</p>
        </div>
      </header>

      <section className="admin-submission-stats" aria-label="Submission statistics">
        <article className="admin-submission-stat-card">
          <span>Total Submissions</span>
          <strong>{summary.totalSubmissions}</strong>
        </article>
        <article className="admin-submission-stat-card">
          <span>Pending Submissions</span>
          <strong>{summary.pendingSubmissions}</strong>
        </article>
      </section>

      <section className="admin-submissions-filters" aria-label="Submission filters">
        <Input
          label="Search Students"
          type="search"
          placeholder="Name, email or course"
          value={filters.search}
          onChange={handleFilterChange('search')}
          onInput={handleFilterChange('search')}
        />
        <Select label="Select Course" value={filters.courseId} onChange={handleFilterChange('courseId')}>
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </Select>
        <Select label="Select Level" value={filters.level} onChange={handleFilterChange('level')}>
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </Select>
      </section>

      {loading ? (
        <Loading label="Loading submissions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSubmissions} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No submissions found"
          message="Try adjusting the search or filters."
        />
      ) : (
        <section className="admin-table-wrap admin-submissions-table-wrap" aria-label="Student Submissions">
          <table className="admin-table admin-submissions-table">
            <thead>
              <tr>
                <th scope="col">S.No</th>
                <th scope="col">Student Name</th>
                <th scope="col">Course</th>
                <th scope="col">Progress</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Student Name">{row.student.name}</td>
                  <td data-label="Course">{row.course.title}</td>
                  <td data-label="Progress">
                    <div className="admin-submission-progress">
                      <span>{formatProgress(row)}</span>
                      <small>
                        {row.submittedCount}/{row.totalAssignments} submitted
                      </small>
                    </div>
                  </td>
                  <td data-label="Status">
                    <Badge status={row.status}>
                      {row.status === 'submitted' ? 'Submitted' : 'Pending'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
