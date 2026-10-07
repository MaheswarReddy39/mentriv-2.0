import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import MultiCourseSelect from '../../components/common/MultiCourseSelect.jsx';
import Select from '../../components/common/Select.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import {
  createCodingTasksForCourses,
  getCodingTask,
  updateCodingTask,
} from '../../services/coding-practice.service.js';
import { DIFFICULTIES, LEVELS, TASK_TYPES, sectionForTaskType } from './codingPractice.js';

const LANGUAGES = ['HTML', 'CSS','JavaScript', 'Python', 'Java', 'C++', 'Go'];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const EMPTY_COMMON = {
  title: '',
  courseIds: [],
  level: '',
  topic: '',
  taskType: 'Coding Problem',
  difficulty: '',
  description: '',
  taskOrder: '',
};

const EMPTY_DETAILS = {
  language: 'JavaScript',
  inputFormat: '',
  outputFormat: '',
  constraints: '',
  starterCode: '',
  sampleTestCases: [{ input: '', expected: '' }],
  hiddenTestCases: [{ input: '', expected: '' }],
  requirements: '',
  starterFiles: '',
  evaluationRequirements: '',
  apiRequirements: '',
  apiTestCases: [{ method: 'GET', endpoint: '', expected: '' }],
  frontendRequirements: '',
  backendRequirements: '',
  databaseRequirements: '',
};

const codeStyle = { fontFamily: 'var(--font-mono, monospace)' };

const emptyDetails = () => ({
  ...EMPTY_DETAILS,
  sampleTestCases: EMPTY_DETAILS.sampleTestCases.map((entry) => ({ ...entry })),
  hiddenTestCases: EMPTY_DETAILS.hiddenTestCases.map((entry) => ({ ...entry })),
  apiTestCases: EMPTY_DETAILS.apiTestCases.map((entry) => ({ ...entry })),
});

const detailsFromTask = (task) => ({
  language: task.language || '',
  inputFormat: task.inputFormat || '',
  outputFormat: task.outputFormat || '',
  constraints: task.constraints || '',
  starterCode: task.starterCode || '',
  sampleTestCases:
    task.sampleTestCases?.length > 0
      ? task.sampleTestCases.map((entry) => ({ ...entry }))
      : [{ input: '', expected: '' }],
  hiddenTestCases:
    task.hiddenTestCases?.length > 0
      ? task.hiddenTestCases.map((entry) => ({ ...entry }))
      : [{ input: '', expected: '' }],
  requirements: task.requirements || '',
  starterFiles: task.starterFiles || '',
  evaluationRequirements: task.evaluationRequirements || '',
  apiRequirements: task.apiRequirements || '',
  apiTestCases:
    task.apiTestCases?.length > 0
      ? task.apiTestCases.map((entry) => ({ ...entry }))
      : [{ method: 'GET', endpoint: '', expected: '' }],
  frontendRequirements: task.frontendRequirements || '',
  backendRequirements: task.backendRequirements || '',
  databaseRequirements: task.databaseRequirements || '',
});

const sectionLabel = {
  coding: 'Coding problem setup',
  frontend: 'Frontend setup',
  backend: 'API setup',
  mern: 'MERN setup',
};

const hasCompleteTestCase = (rows) =>
  rows.some(
    (row) => String(row.input ?? '').trim() && String(row.expected ?? '').trim()
  );

const hasCompleteApiTestCase = (rows) =>
  rows.some(
    (row) => String(row.endpoint ?? '').trim() && String(row.expected ?? '').trim()
  );

export default function TeacherCodingPracticeFormPage({ mode = 'create' }) {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState(null);

  const [loadingTask, setLoadingTask] = useState(mode !== 'create');
  const [taskError, setTaskError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [common, setCommon] = useState({ ...EMPTY_COMMON });
  const [details, setDetails] = useState(emptyDetails());
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isView = mode === 'view';

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setCourseError(null);
    try {
      const response = await getTeacherDashboard();
      setCourses(response?.data?.courses || []);
    } catch (err) {
      setCourseError(err.message || 'Failed to load courses.');
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadTask = useCallback(async () => {
    if (mode === 'create' || !taskId) {
      setLoadingTask(false);
      return;
    }
    setLoadingTask(true);
    setTaskError(null);
    setNotFound(false);
    try {
      const response = await getCodingTask(taskId);
      const task = response?.data?.codingTask;
      if (!task) throw new Error('Coding task not found.');
      setCommon({
        title: task.title || '',
        courseIds: Array.isArray(task.courseIds) ? task.courseIds.map(String) : [],
        level: task.level || '',
        topic: task.topic || '',
        taskType: task.taskType || 'Coding Problem',
        difficulty: task.difficulty || '',
        description: task.description || '',
        taskOrder: String(Number.isInteger(task.taskOrder) ? task.taskOrder : 0),
      });
      setDetails(detailsFromTask(task));
      setFieldErrors({});
    } catch (err) {
      if (err.statusCode === 404) {
        setNotFound(true);
      } else {
        setTaskError(err.message || 'Failed to load this coding task.');
      }
    } finally {
      setLoadingTask(false);
    }
  }, [mode, taskId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (mode !== 'create') return;
    const presetCourseId = searchParams.get('courseId');
    const presetLevel = searchParams.get('level');
    const presetTopic = searchParams.get('topic');
    if (presetCourseId || presetLevel || presetTopic) {
      setCommon((current) => ({
        ...current,
        courseIds: presetCourseId ? [presetCourseId] : current.courseIds,
        level: presetLevel || current.level,
        topic: presetTopic || current.topic,
      }));
    }
  }, [mode, searchParams]);

  const setField = (field) => (event) => {
    setCommon((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setDetail = (field) => (event) => {
    setDetails((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updateListEntry = (listKey, index, field, value) => {
    setDetails((current) => ({
      ...current,
      [listKey]: current[listKey].map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
    setFieldErrors((current) => ({ ...current, [listKey]: undefined }));
  };

  const addListEntry = (listKey, factory) => {
    setDetails((current) => ({ ...current, [listKey]: [...current[listKey], factory()] }));
    setFieldErrors((current) => ({ ...current, [listKey]: undefined }));
  };

  const removeListEntry = (listKey, index) => {
    setDetails((current) => ({
      ...current,
      [listKey]: current[listKey].filter((_, i) => i !== index),
    }));
    setFieldErrors((current) => ({ ...current, [listKey]: undefined }));
  };

  const validateCommon = () => {
    const errors = {};
    if (!common.title.trim()) errors.title = 'Title is required';
    if (common.courseIds.length === 0) errors.courseIds = 'Select at least one course';
    if (!common.level) errors.level = 'Select a level';
    if (!common.topic.trim()) errors.topic = 'Topic is required';
    if (!common.difficulty) errors.difficulty = 'Select a difficulty';
    const taskOrderValue = common.taskOrder === '' ? 0 : Number(common.taskOrder);
    if (!Number.isInteger(taskOrderValue) || taskOrderValue < 0) {
      errors.taskOrder = 'Task order must be a whole number (0 or more)';
    }
    return errors;
  };

  const validateForPublish = () => {
    const errors = {};
    const kind = sectionForTaskType(common.taskType);

    if (kind === 'coding') {
      if (!common.description.trim()) {
        errors.description = 'Problem statement is required to publish';
      }
      if (!details.language.trim()) errors.language = 'Language is required to publish';
      if (!details.inputFormat.trim()) {
        errors.inputFormat = 'Input format is required to publish';
      }
      if (!details.outputFormat.trim()) {
        errors.outputFormat = 'Output format is required to publish';
      }
      if (!hasCompleteTestCase(details.sampleTestCases)) {
        errors.sampleTestCases = 'Add at least one complete sample test case';
      }
      if (!hasCompleteTestCase(details.hiddenTestCases)) {
        errors.hiddenTestCases = 'Add at least one complete hidden test case';
      }
    } else if (kind === 'frontend') {
      if (!details.requirements.trim()) {
        errors.requirements = 'Requirements are required to publish';
      }
      if (!details.evaluationRequirements.trim()) {
        errors.evaluationRequirements = 'Evaluation requirements are required to publish';
      }
    } else if (kind === 'backend') {
      if (!details.apiRequirements.trim()) {
        errors.apiRequirements = 'API requirements are required to publish';
      }
      if (!hasCompleteApiTestCase(details.apiTestCases)) {
        errors.apiTestCases = 'Add at least one complete API test case';
      }
    } else {
      if (!details.frontendRequirements.trim()) {
        errors.frontendRequirements = 'Frontend requirements are required to publish';
      }
      if (!details.backendRequirements.trim()) {
        errors.backendRequirements = 'Backend requirements are required to publish';
      }
      if (!details.databaseRequirements.trim()) {
        errors.databaseRequirements = 'Database requirements are required to publish';
      }
      if (!details.evaluationRequirements.trim()) {
        errors.evaluationRequirements = 'Evaluation requirements are required to publish';
      }
    }

    return errors;
  };

  const save = async (action) => {
    if (saving) return;

    const errors = { ...validateCommon() };
    if (action === 'publish') {
      Object.assign(errors, validateForPublish());
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Fix the highlighted fields before saving.');
      return;
    }

    const payload = {
      title: common.title.trim(),
      level: common.level,
      topic: common.topic.trim(),
      taskType: common.taskType,
      difficulty: common.difficulty,
      description: common.description.trim(),
      taskOrder: common.taskOrder === '' ? 0 : Number(common.taskOrder),
      ...details,
      status: action === 'publish' ? 'published' : 'draft',
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createCodingTasksForCourses(common.courseIds, payload);
        const courseCount = common.courseIds.length;
        const suffix = courseCount > 1 ? ` to ${courseCount} courses` : '';
        toast.success(
          action === 'publish' ? `Task published${suffix}.` : `Draft saved${suffix}.`
        );
      } else {
        await updateCodingTask(taskId, payload);
        toast.success(action === 'publish' ? 'Task published.' : 'Draft saved.');
      }
      setFieldErrors({});
      navigate('/teacher/coding-practice');
    } catch (err) {
      toast.error(err.message || 'Could not save this task.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    save('publish');
  };

  const headingId = 'teacher-coding-task-heading';
  const pageTitle =
    mode === 'create' ? 'Create Task' : mode === 'edit' ? 'Edit Task' : 'Task Details';

  const pageHead = (
    <div className="page-head">
      <div>
        <p className="text-caption">Teacher</p>
        <h1 id={headingId}>{pageTitle}</h1>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {isView && taskId ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/teacher/coding-practice/${taskId}/edit`)}
          >
            Edit Task
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/teacher/coding-practice')}
        >
          Back to list
        </Button>
      </div>
    </div>
  );

  if (loadingTask) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        {pageHead}
        <Loading label="Loading coding task..." />
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        {pageHead}
        <EmptyState
          title="Task not found"
          message="This coding task may have been removed."
          action={
            <Button type="button" onClick={() => navigate('/teacher/coding-practice')}>
              Back to list
            </Button>
          }
        />
      </section>
    );
  }

  if (taskError) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        {pageHead}
        <ErrorState message={taskError} onRetry={loadTask} />
      </section>
    );
  }

  const kind = sectionForTaskType(common.taskType);

  const renderSection = () => {
    if (kind === 'coding') {
      return (
        <>
          <div className="teacher-class-form-grid">
            <Select
              label="Language"
              value={details.language}
              onChange={setDetail('language')}
              disabled={isView}
              error={fieldErrors.language}
            >
              <option value="">Select language</option>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Starter Code"
            rows={6}
            value={details.starterCode}
            onChange={setDetail('starterCode')}
            placeholder={'function solve(input) {\n  // your code here\n}'}
            style={codeStyle}
            disabled={isView}
            hint="Code the student starts with."
          />

          <div className="teacher-class-form-grid">
            <Textarea
              label="Input Format"
              rows={3}
              value={details.inputFormat}
              onChange={setDetail('inputFormat')}
              placeholder="Describe the input."
              disabled={isView}
              error={fieldErrors.inputFormat}
            />
            <Textarea
              label="Output Format"
              rows={3}
              value={details.outputFormat}
              onChange={setDetail('outputFormat')}
              placeholder="Describe the expected output."
              disabled={isView}
              error={fieldErrors.outputFormat}
            />
          </div>

          <Textarea
            label="Constraints"
            rows={3}
            value={details.constraints}
            onChange={setDetail('constraints')}
            placeholder={'1 <= n <= 10^5'}
            disabled={isView}
          />

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p className="text-caption" style={{ margin: 0 }}>
              Sample Test Cases
            </p>
            {details.sampleTestCases.map((entry, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gap: 'var(--space-3)',
                  borderLeft: '3px solid var(--color-border, #e2e8f0)',
                  paddingLeft: 'var(--space-4)',
                }}
              >
                <div className="teacher-class-form-grid">
                  <Input
                    label={`Sample ${index + 1} Input`}
                    value={entry.input}
                    onChange={(event) =>
                      updateListEntry('sampleTestCases', index, 'input', event.target.value)
                    }
                    placeholder="3 4"
                    disabled={isView}
                  />
                  <Input
                    label={`Sample ${index + 1} Expected`}
                    value={entry.expected}
                    onChange={(event) =>
                      updateListEntry('sampleTestCases', index, 'expected', event.target.value)
                    }
                    placeholder="7"
                    disabled={isView}
                  />
                </div>
                {!isView && details.sampleTestCases.length > 1 ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListEntry('sampleTestCases', index)}
                    >
                      Remove case
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {fieldErrors.sampleTestCases ? (
              <p className="field-error-text" style={{ margin: 0 }} role="status">
                {fieldErrors.sampleTestCases}
              </p>
            ) : null}
            {!isView ? (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    addListEntry('sampleTestCases', () => ({ input: '', expected: '' }))
                  }
                >
                  + Add sample case
                </Button>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p className="text-caption" style={{ margin: 0 }}>
              Hidden Test Cases
            </p>
            <p className="text-meta" style={{ margin: 0 }}>
              Hidden test cases are stored for evaluation and are never shown to students.
            </p>
            {details.hiddenTestCases.map((entry, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gap: 'var(--space-3)',
                  borderLeft: '3px solid var(--color-border, #e2e8f0)',
                  paddingLeft: 'var(--space-4)',
                }}
              >
                <div className="teacher-class-form-grid">
                  <Input
                    label={`Hidden ${index + 1} Input`}
                    value={entry.input}
                    onChange={(event) =>
                      updateListEntry('hiddenTestCases', index, 'input', event.target.value)
                    }
                    placeholder="10"
                    disabled={isView}
                  />
                  <Input
                    label={`Hidden ${index + 1} Expected`}
                    value={entry.expected}
                    onChange={(event) =>
                      updateListEntry('hiddenTestCases', index, 'expected', event.target.value)
                    }
                    placeholder="100"
                    disabled={isView}
                  />
                </div>
                {!isView && details.hiddenTestCases.length > 1 ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListEntry('hiddenTestCases', index)}
                    >
                      Remove case
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {fieldErrors.hiddenTestCases ? (
              <p className="field-error-text" style={{ margin: 0 }} role="status">
                {fieldErrors.hiddenTestCases}
              </p>
            ) : null}
            {!isView ? (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    addListEntry('hiddenTestCases', () => ({ input: '', expected: '' }))
                  }
                >
                  + Add hidden case
                </Button>
              </div>
            ) : null}
          </div>
        </>
      );
    }

    if (kind === 'frontend') {
      return (
        <>
          <Textarea
            label="Requirements"
            rows={4}
            value={details.requirements}
            onChange={setDetail('requirements')}
            placeholder="What the student must build."
            disabled={isView}
            error={fieldErrors.requirements}
          />
          <Textarea
            label="Starter Files"
            rows={4}
            value={details.starterFiles}
            onChange={setDetail('starterFiles')}
            placeholder={'index.html\nstyles.css'}
            style={codeStyle}
            disabled={isView}
            hint="Files provided to the student, one per line."
          />
          <Textarea
            label="Evaluation Requirements"
            rows={3}
            value={details.evaluationRequirements}
            onChange={setDetail('evaluationRequirements')}
            placeholder="How the submission will be judged."
            disabled={isView}
            error={fieldErrors.evaluationRequirements}
          />
        </>
      );
    }

    if (kind === 'backend') {
      return (
        <>
          <Textarea
            label="API Requirements"
            rows={4}
            value={details.apiRequirements}
            onChange={setDetail('apiRequirements')}
            placeholder="Endpoints, validation rules and status codes."
            disabled={isView}
            error={fieldErrors.apiRequirements}
          />

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p className="text-caption" style={{ margin: 0 }}>
              API Test Cases
            </p>
            {details.apiTestCases.map((entry, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gap: 'var(--space-3)',
                  borderLeft: '3px solid var(--color-border, #e2e8f0)',
                  paddingLeft: 'var(--space-4)',
                }}
              >
                <div className="teacher-class-form-grid">
                  <Select
                    label={`Case ${index + 1} Method`}
                    value={entry.method}
                    onChange={(event) =>
                      updateListEntry('apiTestCases', index, 'method', event.target.value)
                    }
                    disabled={isView}
                  >
                    {HTTP_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={`Case ${index + 1} Endpoint`}
                    value={entry.endpoint}
                    onChange={(event) =>
                      updateListEntry('apiTestCases', index, 'endpoint', event.target.value)
                    }
                    placeholder="/api/resource"
                    disabled={isView}
                  />
                </div>
                <Textarea
                  label={`Case ${index + 1} Expected Result`}
                  rows={2}
                  value={entry.expected}
                  onChange={(event) =>
                    updateListEntry('apiTestCases', index, 'expected', event.target.value)
                  }
                  placeholder="201 with the created resource"
                  disabled={isView}
                />
                {!isView && details.apiTestCases.length > 1 ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListEntry('apiTestCases', index)}
                    >
                      Remove case
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {fieldErrors.apiTestCases ? (
              <p className="field-error-text" style={{ margin: 0 }} role="status">
                {fieldErrors.apiTestCases}
              </p>
            ) : null}
            {!isView ? (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    addListEntry('apiTestCases', () => ({
                      method: 'GET',
                      endpoint: '',
                      expected: '',
                    }))
                  }
                >
                  + Add API test case
                </Button>
              </div>
            ) : null}
          </div>
        </>
      );
    }

    return (
      <>
        <Textarea
          label="Frontend Requirements"
          rows={3}
          value={details.frontendRequirements}
          onChange={setDetail('frontendRequirements')}
          placeholder="What the frontend must deliver."
          disabled={isView}
          error={fieldErrors.frontendRequirements}
        />
        <Textarea
          label="Backend Requirements"
          rows={3}
          value={details.backendRequirements}
          onChange={setDetail('backendRequirements')}
          placeholder="Routes, services and validation rules."
          disabled={isView}
          error={fieldErrors.backendRequirements}
        />
        <Textarea
          label="Database Requirements"
          rows={3}
          value={details.databaseRequirements}
          onChange={setDetail('databaseRequirements')}
          placeholder="Collections, schema fields and indexes."
          disabled={isView}
          error={fieldErrors.databaseRequirements}
        />
        <Textarea
          label="Evaluation Requirements"
          rows={3}
          value={details.evaluationRequirements}
          onChange={setDetail('evaluationRequirements')}
          placeholder="How the full stack submission will be judged."
          disabled={isView}
          error={fieldErrors.evaluationRequirements}
        />
      </>
    );
  };

  return (
    <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
      {pageHead}

      <form className="teacher-class-form" onSubmit={handleSubmit} noValidate>
        <div className="card teacher-class-card">
          <div className="teacher-card-head">
            <div>
              <p className="text-caption">Task details</p>
              <h2>{common.title.trim() || 'New coding task'}</h2>
            </div>
          </div>

          <div className="teacher-class-form-grid">
            <MultiCourseSelect
              label="Courses"
              courses={courses}
              value={common.courseIds}
              onChange={(courseIds) =>
                setCommon((current) => ({ ...current, courseIds }))
              }
              disabled={isView || mode === 'edit' || loadingCourses}
              loading={loadingCourses}
              error={fieldErrors.courseIds}
              hint={
                mode === 'create'
                  ? undefined
                  : 'Content belongs to this course. Create a new task to reuse it in another course.'
              }
              style={{ gridColumn: '1 / -1' }}
            />
            <Input
              label="Title"
              value={common.title}
              onChange={setField('title')}
              placeholder="e.g. Reverse a String"
              disabled={isView}
              error={fieldErrors.title}
            />
          </div>

          {courseError ? <ErrorState message={courseError} onRetry={loadCourses} /> : null}

          <div className="teacher-class-form-grid">
            <Select
              label="Level"
              value={common.level}
              onChange={setField('level')}
              disabled={isView}
              error={fieldErrors.level}
            >
              <option value="">Select level</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
            <Input
              label="Topic"
              value={common.topic}
              onChange={setField('topic')}
              placeholder="e.g. Strings"
              disabled={isView}
              error={fieldErrors.topic}
            />
          </div>

          <div className="teacher-class-form-grid">
            <Select
              label="Task Type"
              value={common.taskType}
              onChange={setField('taskType')}
              disabled={isView}
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Select
              label="Difficulty"
              value={common.difficulty}
              onChange={setField('difficulty')}
              disabled={isView}
              error={fieldErrors.difficulty}
            >
              <option value="">Select difficulty</option>
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label={kind === 'coding' ? 'Problem Statement' : 'Description'}
            rows={3}
            value={common.description}
            onChange={setField('description')}
            placeholder={
              kind === 'coding'
                ? 'Describe the problem the student must solve.'
                : 'What is this task about?'
            }
            disabled={isView}
            error={fieldErrors.description}
          />

          <div className="teacher-class-form-grid">
            <Input
              label="Task Order"
              type="number"
              min="0"
              step="1"
              value={common.taskOrder}
              onChange={setField('taskOrder')}
              placeholder="0"
              disabled={isView}
              error={fieldErrors.taskOrder}
              hint="Sort order within the topic (0 shows first)."
            />
          </div>
        </div>

        <div className="card teacher-class-card">
          <div className="teacher-card-head">
            <div>
              <p className="text-caption">Configuration</p>
              <h2>
                {common.taskType} - {sectionLabel[kind]}
              </h2>
            </div>
          </div>

          {renderSection()}
        </div>

        {!isView ? (
          <div
            className="teacher-class-actions"
            style={{ justifyContent: 'flex-end', gap: 'var(--space-3)' }}
          >
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => save('draft')}
            >
              Save Draft
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Publish
            </Button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
