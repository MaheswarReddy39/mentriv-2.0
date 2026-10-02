import { useId } from 'react';
import Checkbox from './Checkbox.jsx';

const titleFor = (courses, courseId) =>
  courses.find((course) => course.id === courseId)?.title || 'Selected course';

export default function MultiCourseSelect({
  label = 'Courses',
  courses = [],
  value = [],
  onChange,
  disabled = false,
  loading = false,
  error,
  hint,
  id,
  ...rest
}) {
  const generatedId = useId();
  const groupId = id || generatedId;
  const selected = Array.from(new Set((value || []).map((courseId) => String(courseId))));

  const toggle = (courseId) => {
    if (disabled || typeof onChange !== 'function') return;
    const next = selected.includes(courseId)
      ? selected.filter((entry) => entry !== courseId)
      : [...selected, courseId];
    onChange(next);
  };

  const remove = (courseId) => {
    if (disabled || typeof onChange !== 'function') return;
    onChange(selected.filter((entry) => entry !== courseId));
  };

  const defaultHint = selected.length
    ? `${selected.length} course${selected.length === 1 ? '' : 's'} selected`
    : 'Select at least one course.';

  return (
    <div className={`field${error ? ' field-error' : ''}`} {...rest}>
      <span className="field-label" id={`${groupId}-label`}>
        {label}
      </span>

      {selected.length > 0 ? (
        <div className="multi-course-chips">
          {selected.map((courseId) => {
            const title = titleFor(courses, courseId);
            return (
              <span key={courseId} className="badge badge-primary multi-course-chip">
                <span className="multi-course-chip-label">{title}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="multi-course-chip-remove"
                    onClick={() => remove(courseId)}
                    aria-label={`Remove ${title}`}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      <div
        className="multi-course-options"
        role="group"
        aria-labelledby={`${groupId}-label`}
        aria-invalid={Boolean(error) || undefined}
      >
        {loading ? (
          <p className="text-meta" style={{ margin: 0 }}>
            Loading courses...
          </p>
        ) : courses.length === 0 ? (
          <p className="text-meta" style={{ margin: 0 }}>
            No courses available yet.
          </p>
        ) : (
          courses.map((course) => (
            <Checkbox
              key={course.id}
              label={course.title}
              checked={selected.includes(course.id)}
              disabled={disabled}
              onChange={() => toggle(course.id)}
            />
          ))
        )}
      </div>

      {error ? <span className="field-error-text">{error}</span> : null}
      {!error ? <span className="field-hint">{hint ?? defaultHint}</span> : null}
    </div>
  );
}
