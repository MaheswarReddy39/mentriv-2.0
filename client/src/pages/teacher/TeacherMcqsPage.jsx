import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import Select from '../../components/common/Select.jsx';
import { listCourseMcqTests } from '../../services/mcq.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import { LEVEL_BADGE_CLASS, PRACTICE_LEVELS, decodeDescription, levelRank } from '../../utils/practiceLevels.js';

const topicSlug = (topic) => topic.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

export default function TeacherMcqsPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseFilter, setCourseFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardRes = await getTeacherDashboard();
      const courseList = dashboardRes?.data?.courses || [];
      setCourses(courseList);

      if (courseList.length === 0) {
        setSets([]);
        return;
      }

      const results = await Promise.all(
        courseList.map((course) =>
          listCourseMcqTests(course.id)
            .then((res) => ({ course, tests: res?.data?.mcqTests || [] }))
            .catch(() => null)
        )
      );

      const loaded = results.filter(Boolean);
      if (loaded.length === 0) {
        throw new Error('Failed to load practice sets.');
      }

      const items = [];
      loaded.forEach(({ course, tests }) => {
        tests
          .filter((test) => test.status !== 'archived')
          .forEach((test) => {
            const { level, topic } = decodeDescription(test.description);
            items.push({ ...test, course, level, topic });
          });
      });
      setSets(items);
    } catch (err) {
      setError(err.message || 'Failed to load practice sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSets = useMemo(
    () =>
      sets.filter(
        (set) =>
          (!courseFilter || set.course.id === courseFilter) &&
          (!levelFilter || set.level === levelFilter)
      ),
    [sets, courseFilter, levelFilter]
  );

  const groups = useMemo(() => {
    const map = new Map();
    filteredSets.forEach((set) => {
      const topic = set.topic || set.course.title;
      if (!map.has(topic)) map.set(topic, []);
      map.get(topic).push(set);
    });
    return [...map.entries()].map(([topic, topicSets]) => ({
      topic,
      sets: [...topicSets].sort(
        (a, b) => levelRank(a.level) - levelRank(b.level) || a.title.localeCompare(b.title)
      ),
    }));
  }, [filteredSets]);

  const showFilters = !loading && !error && courses.length > 0;

  return (
    <section className="teacher-classes-page fade-in" aria-labelledby="teacher-practice-heading">
      <div className="page-head">
        <div>
          <p className="text-caption">Teacher</p>
          <h1 id="teacher-practice-heading">MCQs / Practice</h1>
        </div>
        <Button type="button" onClick={() => navigate('/teacher/mcqs/new')}>
          + Add Practice
        </Button>
      </div>

      {showFilters ? (
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div className="admin-filter">
            <Select
              label="Course"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="admin-filter">
            <Select
              label="Level"
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value)}
            >
              <option value="">All levels</option>
              {PRACTICE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : null}

      {loading ? (
        <Loading label="Loading practice sets..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          message="Create a course first, then add practice sets to it."
        />
      ) : sets.length === 0 ? (
        <EmptyState
          title="No practice sets"
          message="Add your first practice set for these courses."
          action={
            <Button type="button" onClick={() => navigate('/teacher/mcqs/new')}>
              + Add Practice
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No practice sets match"
          message="No practice sets match the selected course and level."
        />
      ) : (
        groups.map((group) => (
          <section
            key={group.topic}
            aria-labelledby={`practice-topic-${topicSlug(group.topic)}`}
          >
            <h2
              id={`practice-topic-${topicSlug(group.topic)}`}
              className="student-classes-heading"
            >
              {group.topic}
            </h2>

            <div className="student-assignment-list">
              {group.sets.map((set) => (
                <Card key={set.id} variant="student-assignment-card">
                  <div className="student-assignment-card-head">
                    <div>
                      <h2>{set.title}</h2>
                      <div className="student-assignment-meta">
                        {set.level ? (
                          <span
                            className={`badge ${
                              LEVEL_BADGE_CLASS[set.level] || 'badge-neutral'
                            }`}
                          >
                            {set.level}
                          </span>
                        ) : null}
                        <span>{set.course.title}</span>
                        <span>{set.questions?.length || 0} questions</span>
                        <span>Pass {set.passingScore}%</span>
                        <Badge status={set.status} />
                      </div>
                    </div>

                    <div className="student-class-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher/mcqs/${set.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/teacher/mcqs/${set.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
