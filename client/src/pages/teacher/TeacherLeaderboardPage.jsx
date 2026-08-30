import { useEffect, useState } from 'react';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Select from '../../components/common/Select.jsx';
import { getTeacherLeaderboard } from '../../services/teacher.service.js';

const getRankClass = (index) => {
  if (index === 0) return 'teacher-leaderboard-rank-first';
  if (index === 1) return 'teacher-leaderboard-rank-second';
  if (index === 2) return 'teacher-leaderboard-rank-third';
  return '';
};

export default function TeacherLeaderboardPage() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTeacherLeaderboard(filters);
      setCourses(response.data.courses || []);
      setStudents(response.data.leaderboard || []);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [filters]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  if (loading) return <Loading label="Loading leaderboard..." />;

  if (error) {
    return <ErrorState message={error} onRetry={loadLeaderboard} />;
  }

  return (
    <div className="teacher-leaderboard-page fade-in">
      <header className="teacher-leaderboard-header">
        <div>
          <p className="text-caption">Teacher</p>
          <h1>Leaderboard</h1>
        </div>
      </header>

      <section className="teacher-leaderboard-filters" aria-label="Leaderboard filters">
        <Input
          label="Search"
          type="search"
          placeholder="Student Name or Mobile Number"
          value={filters.search}
          onChange={handleFilterChange('search')}
        />
        <Select label="Course" value={filters.courseId} onChange={handleFilterChange('courseId')}>
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </Select>
      </section>

      {students.length === 0 ? (
        <EmptyState title="No leaderboard data found" message="Try adjusting the search or course filter." />
      ) : (
        <section className="admin-table-wrap teacher-leaderboard-table-wrap" aria-label="Leaderboard">
          <table className="admin-table teacher-leaderboard-table">
            <thead>
              <tr>
                <th scope="col">S.No</th>
                <th scope="col">Student Name</th>
                <th scope="col">Progress</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id} className={getRankClass(index)}>
                  <td data-label="S.No">
                    <span className="teacher-leaderboard-rank">{index + 1}</span>
                  </td>
                  <td data-label="Student Name">{student.studentName}</td>
                  <td data-label="Progress">
                    <div className="teacher-leaderboard-progress">
                      <span>{student.progress}%</span>
                      <ProgressBar value={student.progress} />
                    </div>
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
