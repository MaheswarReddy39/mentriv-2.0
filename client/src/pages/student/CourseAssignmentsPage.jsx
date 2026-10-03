import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { getMyEnrollments } from '../../services/enrollment.service.js';
import { listCourseAssignments } from '../../services/assignment.service.js';

const ACTIVE_STATUSES = ['approved', 'completed'];

const getCourseId = (enrollment) => enrollment?.course?.id || enrollment?.course?._id || null;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN') : null;

const formatDuration = (minutes) =>
  Number(minutes) > 0 ? `${minutes} minutes` : 'No time limit';

export default function CourseAssignmentsPage() {
  const { courseId: routeCourseId } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const enrollmentRes = await getMyEnrollments({ limit: 50 });
      const activeEnrollments = (enrollmentRes?.data?.enrollments || []).filter(
        (enrollment) => ACTIVE_STATUSES.includes(enrollment.status) && getCourseId(enrollment)
      );

      const scopedEnrollments = routeCourseId
        ? activeEnrollments.filter((item) => getCourseId(item) === routeCourseId)
        : activeEnrollments;

      const results = await Promise.all(
        scopedEnrollments.map((enrollment) =>
          listCourseAssignments(getCourseId(enrollment))
            .then((res) => ({
              enrollment,
              items: res?.data?.assignments || [],
            }))
            .catch(() => null)
        )
      );

      // A shared assignment can come back from several enrolled courses — keep one row.
      const byId = new Map();
      results.filter(Boolean).forEach(({ enrollment, items }) => {
        const courseTitle = enrollment?.course?.title || '';
        items.forEach((assignment) => {
          if (byId.has(assignment.id)) return;
          byId.set(assignment.id, { ...assignment, courseTitle });
        });
      });

      const merged = [...byId.values()].sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue || a.title.localeCompare(b.title);
      });

      setAssignments(merged);
    } catch (err) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [routeCourseId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const listHeader = useMemo(
    () => (
      <header className="admin-dashboard-header">
        <div>
          <h1>Assignments</h1>
          <p className="admin-welcome">Track the assignments published for your courses.</p>
        </div>
      </header>
    ),
    []
  );

  return (
    <div className="admin-dashboard student-assignments-page fade-in">
      {listHeader}

      {loading ? (
        <div className="student-assignment-list" aria-hidden="true">
          <div className="card">
            <Skeleton height="1.4rem" width="55%" />
            <Skeleton height="0.85rem" width="35%" style={{ marginTop: 'var(--space-3)' }} />
            <Skeleton height="0.9rem" width="85%" style={{ marginTop: 'var(--space-5)' }} />
            <Skeleton height="0.75rem" width="75%" style={{ marginTop: 'var(--space-3)' }} />
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadAssignments} />
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          message="Assignments published for your courses will appear here."
        />
      ) : (
        <section className="student-assignment-list" aria-label="Assignments">
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {assignments.map((assignment) => {
              const dueDate = formatDate(assignment.dueDate);
              const overdue =
                assignment.dueDate && new Date(assignment.dueDate).getTime() < Date.now();

              return (
                <Link
                  key={assignment.id}
                  to={`/assignments/${assignment.id}`}
                  className="card asg-row"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="clamp-1">{assignment.title}</h3>
                    <p className="text-meta" style={{ margin: 'var(--space-1) 0' }}>
                      {assignment.courseTitle}
                    </p>
                    <p className={`text-meta ${overdue ? 'due-overdue' : ''}`} style={{ margin: 'var(--space-1) 0' }}>
                      {dueDate ? `Due ${dueDate}` : 'No due date'}
                    </p>
                    <p className="text-meta" style={{ margin: 0 }}>
                      Max marks: {assignment.maxMarks} &middot; {formatDuration(assignment.duration)}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <Badge status={assignment.status === 'published' ? 'info' : 'neutral'}>
                      {assignment.status === 'published' ? 'Open to submit' : assignment.status}
                    </Badge>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
