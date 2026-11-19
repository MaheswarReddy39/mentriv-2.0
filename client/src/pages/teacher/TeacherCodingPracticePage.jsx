import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import SelectMenu from '../../components/common/SelectMenu.jsx';
import { listCodingTaskGroups } from '../../services/coding-practice.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import { LEVELS } from './codingPractice.js';

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-IN');

const plural = (count, singular) => `${count} ${count === 1 ? singular : `${singular}s`}`;

const courseLabel = (group) => {
  const count = group.courseIds?.length || 0;
  if (count > 1) return `Shared across ${count} courses`;
  return group.courseTitle || '';
};

const rowStatus = (group) => {
  if (group.publishedCount === group.taskCount) {
    return { label: 'Published', tone: 'is-published' };
  }
  if (group.publishedCount === 0) {
    return { label: 'Draft', tone: 'is-draft' };
  }
  return {
    label: `${group.publishedCount}/${group.taskCount} published`,
    tone: 'is-partial',
  };
};

function ArrowIcon() {
  return (
    <svg
      className="teacher-coding-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CodingSkeleton() {
  return (
    <div className="teacher-coding-skeleton" role="status">
      <span className="sr-only">Loading coding practice…</span>
      {[0, 1].map((panel) => (
        <div className="teacher-coding-skeleton-panel" key={panel} aria-hidden="true">
          <div className="teacher-coding-skeleton-head">
            <span className="skeleton teacher-coding-skeleton-title" />
            <span className="skeleton teacher-coding-skeleton-count" />
          </div>
          {[0, 1, 2].map((row) => (
            <div className="teacher-coding-skeleton-row" key={row}>
              <div className="teacher-coding-skeleton-copy">
                <span className="skeleton teacher-coding-skeleton-line" />
                <span className="skeleton teacher-coding-skeleton-meta" />
              </div>
              <span className="skeleton teacher-coding-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TeacherCodingPracticePage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [teacherCourses, setTeacherCourses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [groupsResult, coursesResult] = await Promise.allSettled([
      listCodingTaskGroups(),
      getTeacherDashboard(),
    ]);

    if (groupsResult.status === 'fulfilled') {
      setGroups(groupsResult.value?.data?.groups || []);
    } else {
      setError(groupsResult.reason?.message || 'Failed to load coding tasks.');
    }

    setTeacherCourses(
      coursesResult.status === 'fulfilled'
        ? coursesResult.value?.data?.courses || []
        : null
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allGroups = useMemo(() => groups || [], [groups]);

  // The groups payload has no course list of its own, so the switcher comes
  // from the teacher dashboard and falls back to the courses seen in groups.
  const courses = useMemo(() => {
    if (teacherCourses) {
      return teacherCourses.map((course) => ({ id: course.id, title: course.title }));
    }
    const byId = new Map();
    allGroups.forEach((group) => {
      (group.courseIds || []).forEach((courseId, index) => {
        const title = (group.courseTitles || [])[index] || '';
        if (!title || byId.has(courseId)) return;
        byId.set(courseId, { id: courseId, title });
      });
    });
    return [...byId.values()];
  }, [teacherCourses, allGroups]);

  const activeCourseId = courses.some((course) => course.id === selectedCourseId)
    ? selectedCourseId
    : '';
  const activeCourse = courses.find((course) => course.id === activeCourseId) || null;

  const visibleGroups = useMemo(
    () =>
      activeCourseId
        ? allGroups.filter((group) => (group.courseIds || []).includes(activeCourseId))
        : allGroups,
    [allGroups, activeCourseId]
  );

  const levelSections = useMemo(
    () =>
      LEVELS.map((level) => ({
        level,
        groups: visibleGroups.filter((group) => group.level === level),
      })).filter((section) => section.groups.length > 0),
    [visibleGroups]
  );

  const totalTasks = visibleGroups.reduce((sum, group) => sum + group.taskCount, 0);
  const publishedTasks = visibleGroups.reduce(
    (sum, group) => sum + group.publishedCount,
    0
  );
  const unpublishedTasks = Math.max(0, totalTasks - publishedTasks);
  const publishedPct = totalTasks > 0 ? (publishedTasks / totalTasks) * 100 : 0;

  const showSkeleton = groups === null && loading;
  const empty = groups !== null && allGroups.length === 0;

  const openTopic = (group) => {
    const params = new URLSearchParams({
      courseId: group.courseId || group.courseIds?.[0] || '',
      level: group.level,
      topic: group.topic,
    });
    navigate(`/teacher/coding-practice/topic?${params.toString()}`);
  };

  const createTask = () => {
    const params = new URLSearchParams();
    if (activeCourseId) params.set('courseId', activeCourseId);
    const qs = params.toString();
    navigate(`/teacher/coding-practice/new${qs ? `?${qs}` : ''}`);
  };

  const statCaption = () => {
    if (groups === null) return null;
    if (totalTasks === 0) {
      return activeCourse ? 'No tasks in this course' : 'No tasks yet';
    }
    if (unpublishedTasks === 0) return 'All tasks published';
    return `${formatNumber(unpublishedTasks)} unpublished`;
  };

  return (
    <div className="teacher-coding fade-in">
      <header className="teacher-coding-masthead">
        <div className="teacher-coding-head">
          <h1 className="teacher-coding-title">Coding Practice</h1>

          {showSkeleton ? (
            <span className="skeleton teacher-coding-switch-skeleton" aria-hidden="true" />
          ) : courses.length > 1 ? (
            <SelectMenu
              className="teacher-coding-switch"
              ariaLabel="Course"
              value={activeCourseId}
              onChange={setSelectedCourseId}
              options={[
                { value: '', label: 'All courses' },
                ...courses.map((course) => ({ value: course.id, label: course.title })),
              ]}
            />
          ) : courses.length === 1 ? (
            <p className="teacher-coding-course-title">{courses[0].title}</p>
          ) : null}
        </div>

        <div className="teacher-coding-stat">
          <span className="teacher-coding-stat-label">Published tasks</span>
          {showSkeleton ? (
            <span className="skeleton teacher-coding-stat-skeleton" aria-hidden="true" />
          ) : error || totalTasks === 0 ? (
            <span className="teacher-coding-stat-value">—</span>
          ) : (
            <span className="teacher-coding-stat-value">
              {formatNumber(publishedTasks)}
              <span className="teacher-coding-stat-total">
                {' '}
                of {formatNumber(totalTasks)}
              </span>
            </span>
          )}

          {totalTasks > 0 && !error ? (
            <span className="teacher-coding-bar" aria-hidden="true">
              <span style={{ width: `${publishedPct}%` }} />
            </span>
          ) : null}

          {statCaption() ? (
            <span className="teacher-coding-stat-caption">{statCaption()}</span>
          ) : null}

          {levelSections.length > 0 ? (
            <div className="teacher-coding-actions">
              <Button type="button" size="sm" onClick={createTask}>
                Create task
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="teacher-coding-state">
          <ErrorState
            title="Failed to load coding practice"
            message={error}
            onRetry={load}
          />
        </div>
      ) : showSkeleton ? (
        <CodingSkeleton />
      ) : empty ? (
        <div className="teacher-coding-state">
          <EmptyState
            title="No coding tasks yet"
            message="Create your first coding task. Tasks are grouped by level and topic automatically."
            action={
              <Button type="button" onClick={createTask}>
                Create task
              </Button>
            }
          />
        </div>
      ) : levelSections.length === 0 ? (
        <div className="teacher-coding-state">
          <EmptyState
            title="No coding tasks in this course"
            message="Pick another course, or create a task for this one."
            action={
              <Button type="button" variant="outline" size="sm" onClick={createTask}>
                Create task
              </Button>
            }
          />
        </div>
      ) : (
        levelSections.map((section, sectionIndex) => (
          <section
            className="teacher-coding-panel"
            key={section.level}
            aria-labelledby={`teacher-coding-level-${sectionIndex}`}
          >
            <header className="teacher-coding-panel-head">
              <h2 id={`teacher-coding-level-${sectionIndex}`}>{section.level}</h2>
              <span className="teacher-coding-panel-count">
                {plural(section.groups.length, 'topic')}
              </span>
            </header>

            <ol className="teacher-coding-list">
              {section.groups.map((group) => {
                const status = rowStatus(group);
                const meta = [
                  courseLabel(group),
                  plural(group.taskCount, 'task'),
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      className="teacher-coding-row"
                      onClick={() => openTopic(group)}
                    >
                      <span className="teacher-coding-row-main">
                        <span className="teacher-coding-row-title">{group.topic}</span>
                        <span className="teacher-coding-row-meta">{meta}</span>
                      </span>
                      <span className="teacher-coding-row-side">
                        <span className={`teacher-coding-status ${status.tone}`}>
                          {status.label}
                        </span>
                      </span>
                      <ArrowIcon />
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
