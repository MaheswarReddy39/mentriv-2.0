import { useEffect, useRef, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import { listTeachers, updateTeacherStatus } from '../../services/admin-teacher.service.js';

const statusLabel = (status) => {
  if (status === 'accepted' || status === 'active') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  return status;
};

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const requestIdRef = useRef(0);

  const loadTeachers = async (activeFilters = filters) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await listTeachers({
        search: activeFilters.search.trim(),
        courseId: activeFilters.courseId,
      });
      if (requestId !== requestIdRef.current) return;
      setTeachers(response.data.teachers || []);
      setCourses(response.data.courses || []);
      setTotalTeachers(response.data.totalTeachers || 0);
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
    const timer = window.setTimeout(() => loadTeachers(activeFilters), filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.courseId]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const formatCourseList = (teacherCourses) => {
    if (!teacherCourses?.length) return 'Not selected';
    return teacherCourses.map((course) => course.title).join(', ');
  };

  const handleStatusChange = async (teacherId, nextStatus) => {
    setUpdating((current) => ({ ...current, [teacherId]: nextStatus }));
    try {
      const response = await updateTeacherStatus(teacherId, nextStatus);
      const updated = response.data.teacher;
      setTeachers((current) =>
        current.map((teacher) =>
          teacher.id === teacherId
            ? {
                ...teacher,
                status: updated.status,
                displayStatus: updated.displayStatus,
              }
            : teacher
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to update teacher status.');
    } finally {
      setUpdating((current) => {
        const next = { ...current };
        delete next[teacherId];
        return next;
      });
    }
  };

  const renderAction = (teacher) => {
    const status = teacher.displayStatus || teacher.status;
    const busyStatus = updating[teacher.id];

    if (status === 'pending') {
      return (
        <div className="admin-table-actions admin-student-actions">
          <Button
            size="sm"
            variant="primary"
            type="button"
            loading={busyStatus === 'accepted'}
            disabled={Boolean(busyStatus)}
            onClick={() => handleStatusChange(teacher.id, 'accepted')}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            loading={busyStatus === 'rejected'}
            disabled={Boolean(busyStatus)}
            onClick={() => handleStatusChange(teacher.id, 'rejected')}
          >
            Reject
          </Button>
        </div>
      );
    }

    return <Badge status={status}>{statusLabel(status)}</Badge>;
  };

  return (
    <div className="admin-students-page">
      <header className="admin-students-header">
        <div>
          <h1>Teachers</h1>
          <p>Total Teachers: {totalTeachers}</p>
        </div>
      </header>

      <section className="admin-students-filters" aria-label="Teacher filters">
        <Input
          label="Search Teachers"
          type="search"
          placeholder="Teacher Name or Mobile Number"
          value={filters.search}
          onChange={handleFilterChange('search')}
          onInput={handleFilterChange('search')}
        />
        <Select
          label="Select Course"
          value={filters.courseId}
          onChange={handleFilterChange('courseId')}
          disabled={loading}
        >
          <option value="all">{loading ? 'Loading courses...' : 'All Courses'}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </Select>
      </section>

      {loading ? (
        <Loading label="Loading teachers..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadTeachers} />
      ) : teachers.length === 0 ? (
        <EmptyState
          title="No teachers found"
          message="Try adjusting the search or course filter."
        />
      ) : (
        <section className="admin-table-wrap admin-students-table-wrap" aria-label="Teacher Details">
          <table className="admin-table admin-students-table">
            <thead>
              <tr>
                <th scope="col">S.No</th>
                <th scope="col">Teacher Name</th>
                <th scope="col">Mobile Number</th>
                <th scope="col">Course</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, index) => (
                <tr key={teacher.id}>
                  <td data-label="S.No">{index + 1}</td>
                  <td data-label="Teacher Name">{teacher.name}</td>
                  <td data-label="Mobile Number">{teacher.phone || '-'}</td>
                  <td data-label="Course">{formatCourseList(teacher.courses)}</td>
                  <td data-label="Action">{renderAction(teacher)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
