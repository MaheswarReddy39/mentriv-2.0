import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import SelectMenu from '../../components/common/SelectMenu.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { createClass } from '../../services/class.service.js';
import { getTeacherClasses } from '../../services/teacher.service.js';

const INITIAL_FORM = {
  title: '',
  module: '',
  videoLink: '',
  notesLink: '',
};

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-IN');

const relativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const lessonMeta = (recordedClass) => {
  const parts = [];
  if (recordedClass.module) parts.push(recordedClass.module);
  if (recordedClass.duration > 0) parts.push(`${recordedClass.duration} min`);
  const resourceCount = recordedClass.resourceCount || 0;
  parts.push(
    resourceCount > 0
      ? `${resourceCount} ${resourceCount === 1 ? 'resource' : 'resources'}`
      : 'No resources'
  );
  return parts.join(' · ');
};

const groupByModule = (lessons) => {
  const groups = new Map();
  lessons.forEach((lesson) => {
    const name = (lesson.module || '').trim() || 'General';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(lesson);
  });
  return Array.from(groups, ([title, items]) => ({ title, items }));
};

function ClassesSkeleton() {
  return (
    <div className="teacher-classes-skeleton" role="status">
      <span className="sr-only">Loading classes…</span>
      <div className="teacher-classes-skeleton-panel" aria-hidden="true">
        <div className="teacher-classes-skeleton-head">
          <span className="skeleton teacher-classes-skeleton-title" />
          <span className="skeleton teacher-classes-skeleton-count" />
        </div>
        <div className="teacher-classes-skeleton-form">
          {[0, 1, 2].map((field) => (
            <span className="skeleton teacher-classes-skeleton-input" key={field} />
          ))}
        </div>
      </div>
      <div className="teacher-classes-skeleton-panel" aria-hidden="true">
        <div className="teacher-classes-skeleton-head">
          <span className="skeleton teacher-classes-skeleton-title" />
          <span className="skeleton teacher-classes-skeleton-count" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div className="teacher-classes-skeleton-row" key={row}>
            <div className="teacher-classes-skeleton-row-main">
              <span className="skeleton teacher-classes-skeleton-line" />
              <span className="skeleton teacher-classes-skeleton-meta" />
            </div>
            <span className="skeleton teacher-classes-skeleton-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherClassesPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTeacherClasses();
      const payload = response.data || {};
      const courseList = payload.courses || [];
      setData({ ...payload, courses: courseList });
      setSelectedCourseId((current) => {
        if (current && courseList.some((course) => course.id === current)) return current;
        return courseList[0]?.id || '';
      });
    } catch (err) {
      setError(err.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const courses = data?.courses || [];
  const allClasses = data?.classes || [];
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;
  const courseTitle = selectedCourse?.title || '';

  const courseClasses = useMemo(
    () => allClasses.filter((recordedClass) => recordedClass.courseId === selectedCourseId),
    [allClasses, selectedCourseId]
  );

  const modules = useMemo(() => groupByModule(courseClasses), [courseClasses]);

  const publishedClasses = courseClasses.filter(
    (recordedClass) => recordedClass.status === 'published'
  ).length;
  const draftClasses = courseClasses.length - publishedClasses;
  const publishedPct =
    courseClasses.length > 0 ? (publishedClasses / courseClasses.length) * 100 : 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = 'Class title is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (!selectedCourseId) return;

    const resources = form.notesLink.trim()
      ? [{ title: 'Notes', url: form.notesLink.trim() }]
      : [];

    setSaving(true);
    createClass(selectedCourseId, {
      title: form.title.trim(),
      module: form.module.trim(),
      videoUrl: form.videoLink.trim(),
      resources,
    })
      .then(() => {
        toast.success('Class added.');
        setForm(INITIAL_FORM);
        setFieldErrors({});
        loadClasses();
      })
      .catch((err) => {
        toast.error(err.message || 'Could not add this class.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const showSkeleton = loading && !data;

  return (
    <div className="teacher-classes fade-in">
      <header className="teacher-classes-masthead">
        <div className="teacher-classes-head">
          <h1 className="teacher-classes-title">Classes</h1>
          {showSkeleton ? (
            <span className="skeleton teacher-classes-switch-skeleton" aria-hidden="true" />
          ) : courses.length > 1 ? (
            <SelectMenu
              className="teacher-classes-switch"
              ariaLabel="Course"
              value={selectedCourseId}
              onChange={setSelectedCourseId}
              options={courses.map((course) => ({
                value: course.id,
                label: course.title,
              }))}
            />
          ) : courseTitle ? (
            <p className="teacher-classes-course-title">{courseTitle}</p>
          ) : null}
        </div>

        <div className="teacher-classes-stat">
          <span className="teacher-classes-stat-label">Published classes</span>
          {showSkeleton ? (
            <span className="skeleton teacher-classes-stat-skeleton" aria-hidden="true" />
          ) : error ? (
            <span className="teacher-classes-stat-value">—</span>
          ) : courses.length === 0 ? (
            <>
              <span className="teacher-classes-stat-value">—</span>
              <span className="teacher-classes-stat-caption">No courses yet</span>
            </>
          ) : (
            <>
              <span className="teacher-classes-stat-value">
                {formatNumber(publishedClasses)}
                <span className="teacher-classes-stat-total">
                  {' '}
                  of {formatNumber(courseClasses.length)}
                </span>
              </span>
              {courseClasses.length > 0 ? (
                <>
                  <span className="teacher-classes-bar" aria-hidden="true">
                    <span style={{ width: `${publishedPct}%` }} />
                  </span>
                  <span className="teacher-classes-stat-caption">
                    {draftClasses > 0
                      ? `${formatNumber(draftClasses)} ${
                          draftClasses === 1 ? 'draft' : 'drafts'
                        }`
                      : 'All classes published'}
                  </span>
                </>
              ) : (
                <span className="teacher-classes-stat-caption">No classes yet</span>
              )}
            </>
          )}
        </div>
      </header>

      {error ? (
        <div className="teacher-classes-state">
          <ErrorState message={error} onRetry={loadClasses} />
        </div>
      ) : showSkeleton ? (
        <ClassesSkeleton />
      ) : courses.length === 0 ? (
        <div className="teacher-classes-state">
          <EmptyState
            title="No courses yet"
            message="Classes can be added once a course exists."
          />
        </div>
      ) : (
        <>
          <section className="teacher-classes-panel" aria-labelledby="teacher-class-form-heading">
            <header className="teacher-classes-panel-head">
              <h2 id="teacher-class-form-heading">Add a class</h2>
              <span className="teacher-classes-panel-target">{courseTitle}</span>
            </header>

            <form className="teacher-classes-form" onSubmit={handleSubmit}>
              <div className="teacher-classes-form-grid">
                <Input
                  label="Class title"
                  value={form.title}
                  onChange={setField('title')}
                  placeholder="e.g. Routing with React Router"
                  error={fieldErrors.title}
                />
                <Input
                  label="Module"
                  value={form.module}
                  onChange={setField('module')}
                  placeholder="e.g. Foundations"
                  hint="Groups classes on the student page."
                />
                <Input
                  label="Video link"
                  type="url"
                  value={form.videoLink}
                  onChange={setField('videoLink')}
                  placeholder="https://"
                />
                <Input
                  label="Notes link"
                  type="url"
                  value={form.notesLink}
                  onChange={setField('notesLink')}
                  placeholder="https://"
                  hint="Saved as a resource named Notes."
                />
              </div>

              <div className="teacher-classes-form-actions">
                <Button type="submit" loading={saving} disabled={saving}>
                  Add class
                </Button>
              </div>
            </form>
          </section>

          {courseClasses.length === 0 ? (
            <div className="teacher-classes-state">
              <EmptyState
                title="No classes in this course"
                message="Add a class above and it will appear here."
              />
            </div>
          ) : (
            modules.map((module, moduleIndex) => (
              <section
                className="teacher-classes-panel"
                key={`${module.title}-${moduleIndex}`}
                aria-labelledby={`teacher-classes-module-${moduleIndex}`}
              >
                <header className="teacher-classes-panel-head">
                  <h2 id={`teacher-classes-module-${moduleIndex}`}>{module.title}</h2>
                  <span className="teacher-classes-panel-count">
                    {formatNumber(module.items.length)}{' '}
                    {module.items.length === 1 ? 'class' : 'classes'}
                  </span>
                </header>

                <ol className="teacher-classes-list">
                  {module.items.map((recordedClass) => (
                    <li className="teacher-classes-row" key={recordedClass.id}>
                      <span className="teacher-classes-row-main">
                        <span className="teacher-classes-row-title">{recordedClass.title}</span>
                        <span className="teacher-classes-row-meta">{lessonMeta(recordedClass)}</span>
                      </span>
                      <span className="teacher-classes-row-side">
                        <span
                          className={`teacher-classes-status is-${recordedClass.status}`}
                        >
                          {recordedClass.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                        <time dateTime={recordedClass.createdAt || undefined}>
                          {relativeTime(recordedClass.createdAt)}
                        </time>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
