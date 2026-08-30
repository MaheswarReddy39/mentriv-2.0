import { useEffect, useRef, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import { listStudents, updateStudentStatus } from '../../services/student.service.js';

const LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const formatCourseList = (courses) => {
  if (!courses?.length) return 'Not selected';
  return courses.map((course) => course.title).join(', ');
};

const statusLabel = (student) => {
  const status = student.displayStatus || student.status;
  if (status === 'accepted' || status === 'active') return 'Accepted';
  return status;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    level: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const requestIdRef = useRef(0);

  const loadStudents = async (activeFilters = filters) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await listStudents({
        search: activeFilters.search.trim(),
        courseId: activeFilters.courseId,
        level: activeFilters.level,
      });
      if (requestId !== requestIdRef.current) return;
      setStudents(response.data.students);
      setCourses(response.data.courses);
      setTotalStudents(response.data.totalStudents);
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
    const timer = window.setTimeout(() => loadStudents(activeFilters), filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.courseId, filters.level]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleStatusChange = async (studentId, nextStatus) => {
    setUpdating((current) => ({ ...current, [studentId]: nextStatus }));
    try {
      const response = await updateStudentStatus(studentId, nextStatus);
      const updated = response.data.student;
      setStudents((current) =>
        current.map((student) =>
          student.id === studentId
            ? {
                ...student,
                status: updated.status,
                displayStatus: updated.displayStatus,
              }
            : student
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to update student status.');
    } finally {
      setUpdating((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
    }
  };

  return (
    <div className="admin-students-page">
      <header className="admin-students-header">
        <div>
          <h1>Students</h1>
          <p>Total Students: {totalStudents}</p>
        </div>
      </header>

      <section className="admin-students-filters" aria-label="Student filters">
        <Input
          label="Search Students"
          type="search"
          placeholder="Name, mobile, email or course"
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
        <Loading label="Loading students..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStudents} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          message="Try adjusting the search or filters."
        />
      ) : (
        <section className="admin-table-wrap admin-students-table-wrap" aria-label="Student Details">
          <table className="admin-table admin-students-table">
            <thead>
              <tr>
                <th scope="col">S.No</th>
                <th scope="col">Student Name</th>
                <th scope="col">Mobile Number</th>
                <th scope="col">Email ID</th>
                <th scope="col">Course</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const isPending = student.displayStatus === 'pending' || student.status === 'pending';
                const busyStatus = updating[student.id];

                return (
                  <tr key={student.id}>
                    <td data-label="S.No">{index + 1}</td>
                    <td data-label="Student Name">{student.name}</td>
                    <td data-label="Mobile Number">{student.phone || '-'}</td>
                    <td data-label="Email ID">{student.email}</td>
                    <td data-label="Course">{formatCourseList(student.courses)}</td>
                    <td data-label="Action">
                      {isPending ? (
                        <div className="admin-table-actions admin-student-actions">
                          <Button
                            size="sm"
                            variant="primary"
                            loading={busyStatus === 'accepted'}
                            disabled={Boolean(busyStatus)}
                            onClick={() => handleStatusChange(student.id, 'accepted')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={busyStatus === 'rejected'}
                            disabled={Boolean(busyStatus)}
                            onClick={() => handleStatusChange(student.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge status={student.displayStatus || student.status}>
                          {statusLabel(student)}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
