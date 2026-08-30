import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Select from '../../components/common/Select.jsx';
import Loading from '../../components/common/Loading.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { listAdminCourses } from '../../services/course.service.js';

export default function AdminCoursesPage() {
  const location = useLocation();
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.createdCourseTitle || '');

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listAdminCourses({ limit: 50 });
      setCourses(response.data.courses);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const visibleCourses = useMemo(() => {
    if (selectedCourse === 'all') return courses;
    return courses.filter((course) => course.id === selectedCourse);
  }, [courses, selectedCourse]);

  return (
    <div className="admin-courses-page">
      <header className="admin-courses-header">
        <div>
          <h1>Courses</h1>
          <p className="admin-courses-total">
            Total Courses: {pagination?.totalItems ?? courses.length}
          </p>
        </div>
        <Link to="/admin/courses/new" className="btn btn-primary">
          Add Course
        </Link>
      </header>

      {success ? (
        <p className="admin-course-notice" role="status">
          Course "{success}" created successfully.
        </p>
      ) : null}

      <section className="admin-courses-filter" aria-label="Course filter">
        <Select
          label="Select Course"
          value={selectedCourse}
          onChange={(event) => {
            setSelectedCourse(event.target.value);
            setSuccess('');
          }}
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </Select>
      </section>

      {loading ? (
        <Loading label="Loading courses..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCourses} />
      ) : visibleCourses.length === 0 ? (
        <EmptyState
          title="No courses found"
          message="Create a course to start building the catalog."
          action={<Link to="/admin/courses/new" className="btn btn-primary">Add Course</Link>}
        />
      ) : (
        <section className="admin-course-grid" aria-label="Courses">
          {visibleCourses.map((course) => (
            <article key={course.id} className="admin-course-card">
              <h2>{course.title}</h2>
              <Link
                to={`/courses/${course.slug}`}
                className="btn btn-outline btn-sm admin-course-view"
                aria-label={`View ${course.title}`}
              >
                View Course
              </Link>
            </article>
          ))}

          <Link to="/admin/courses/new" className="admin-course-card admin-add-course-card" aria-label="Add Course">
            <span aria-hidden="true">+</span>
            <strong>Add Course</strong>
          </Link>
        </section>
      )}
    </div>
  );
}
