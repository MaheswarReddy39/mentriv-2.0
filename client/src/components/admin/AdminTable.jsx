import Loading from '../common/Loading.jsx';
import ErrorState from '../common/ErrorState.jsx';
import EmptyState from '../common/EmptyState.jsx';

export default function AdminTable({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction = null,
}) {
  if (loading) return <Loading label="Loading…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.label}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.label} data-label={col.label}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminToolbar({ children }) {
  return <div className="admin-toolbar">{children}</div>;
}

export function AdminPagination({ page, totalPages, onPageChange }) {
  return (
    <div className="admin-pagination">
      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span className="text-meta">Page {page} of {Math.max(1, totalPages)}</span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={!totalPages || page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function CoursePicker({ courses, value, onChange, label = 'Course' }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor="admin-course-picker">{label}</label>
      <select
        id="admin-course-picker"
        className="select"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a course…</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title} ({course.status})
          </option>
        ))}
      </select>
    </div>
  );
}
