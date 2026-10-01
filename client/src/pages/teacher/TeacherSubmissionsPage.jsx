import { useEffect, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Select from '../../components/common/Select.jsx';
import { getTeacherSubmissions } from '../../services/teacher.service.js';

const LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function TeacherSubmissionsPage() {
  const [courses, setCourses] = useState([]);
  const [rows, setRows] = useState([]);
  const [timing, setTiming] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    level: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTeacherSubmissions(filters);
      setCourses(response.data.courses || []);
      setTotalStudents(response.data.totalStudents || 0);
      setTotalSubmissions(response.data.totalSubmissions || 0);
      setPendingSubmissions(response.data.pendingSubmissions || 0);
      setRows(response.data.submissions || []);
      setTiming(response.data.timing || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [filters]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  if (loading) return <Loading label="Loading submissions..." />;

  if (error) {
    return <ErrorState message={error} onRetry={loadOverview} />;
  }

  return (
    <div className="teacher-submissions-page fade-in">
      <header className="teacher-submissions-header">
        <div>
          <p className="text-caption">Teacher</p>
          <h1>Submissions</h1>
          <p>Total Students: {totalStudents}</p>
        </div>
      </header>

      <section className="teacher-submission-stats" aria-label="Submission statistics">
        <article className="teacher-submission-stat-card">
          <span>Total Submissions</span>
          <strong>{totalSubmissions}</strong>
        </article>
        <article className="teacher-submission-stat-card">
          <span>Pending Submissions</span>
          <strong>{pendingSubmissions}</strong>
        </article>
      </section>

      <section className="teacher-submissions-filters" aria-label="Submission filters">
        <Input
          label="Search Students"
          type="search"
          placeholder="Search by student or course"
          value={filters.search}
          onChange={handleFilterChange('search')}
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

      {rows.length === 0 ? (
        <EmptyState title="No submissions found" message="Try adjusting the search or filters." />
      ) : (
        <section className="admin-table-wrap teacher-submissions-table-wrap" aria-label="Student Submissions">
          <table className="admin-table teacher-submissions-table">
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
                  <td data-label="Student Name">{row.studentName}</td>
                  <td data-label="Course">{row.courseTitle}</td>
                  <td data-label="Progress">
                    <div className="teacher-submission-progress">
                      <span>{row.progress}%</span>
                      <ProgressBar value={row.progress} />
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

      <section aria-labelledby="submission-timing-heading" style={{ marginTop: 'var(--space-6)' }}>
        <h2 id="submission-timing-heading" className="text-h4" style={{ marginBottom: 'var(--space-3)' }}>
          Submission Timing
        </h2>

        {timing.length === 0 ? (
          <EmptyState title="No submissions yet" message="Timing details will appear after students submit." />
        ) : (
          <div className="admin-table-wrap teacher-submissions-table-wrap">
            <table className="admin-table teacher-submissions-table">
              <thead>
                <tr>
                  <th scope="col">S.No</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Assignment</th>
                  <th scope="col">Started At</th>
                  <th scope="col">Submitted At</th>
                  <th scope="col">Time Taken</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {timing.map((row, index) => (
                  <tr key={row.id}>
                    <td data-label="S.No">{index + 1}</td>
                    <td data-label="Student Name">{row.studentName}</td>
                    <td data-label="Assignment">
                      {row.assignmentTitle}
                      <span className="text-meta" style={{ display: 'block' }}>{row.courseTitle}</span>
                    </td>
                    <td data-label="Started At">{formatStamp(row.startedAt)}</td>
                    <td data-label="Submitted At">{formatStamp(row.submittedAt)}</td>
                    <td data-label="Time Taken">
                      {row.timeTakenMinutes !== null && row.timeTakenMinutes !== undefined
                        ? `${row.timeTakenMinutes} min`
                        : '—'}
                    </td>
                    <td data-label="Duration">
                      {row.duration ? `${row.duration} min` : 'No limit'}
                    </td>
                    <td data-label="Status">
                      <Badge status={row.status}>
                        {row.status === 'late' ? 'Late' : row.status === 'submitted' ? 'Submitted' : row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatStamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
