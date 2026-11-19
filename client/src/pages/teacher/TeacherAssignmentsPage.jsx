import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import MultiCourseSelect from '../../components/common/MultiCourseSelect.jsx';
import Select from '../../components/common/Select.jsx';
import SelectMenu from '../../components/common/SelectMenu.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { createAssignmentsForCourses } from '../../services/assignment.service.js';
import { createMcqTestsForCourses, parseQuestionsWithAI } from '../../services/mcq.service.js';
import { getTeacherAssignments } from '../../services/teacher.service.js';
import { PRACTICE_LEVELS, decodeDescription, encodeDescription } from '../../utils/practiceLevels.js';

const INITIAL_FORM = {
  title: '',
  courseIds: [],
  assignmentType: 'MCQ',
  duration: '',
  level: '',
  topic: '',
};

const EMPTY_QUESTION = () => ({
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: '',
});

const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 };

const QUESTION_COUNT_OPTIONS = [
  { value: 5, label: '5 Questions' },
  { value: 10, label: '10 Questions' },
  { value: 15, label: '15 Questions' },
  { value: 20, label: '20 Questions' },
  { value: 25, label: '25 Questions' },
];

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

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const statusLabel = (status) => {
  if (status === 'published') return 'Published';
  if (status === 'draft') return 'Draft';
  if (status === 'archived') return 'Archived';
  return 'Draft';
};

const scopeCourseTitles = (item, scope) => {
  if (scope !== 'all') return [];
  const titles = item.courseTitles || [];
  if (titles.length > 1) return [`${titles.length} courses`];
  return titles.slice(0, 1);
};

const assignmentMeta = (item, scope) => {
  const parts = scopeCourseTitles(item, scope);
  parts.push(item.duration ? `${formatNumber(item.duration)} min` : 'No time limit');
  if (item.dueDate) parts.push(`Due ${formatDate(item.dueDate)}`);
  return parts.join(' · ');
};

const mcqMeta = (item, scope) => {
  const parts = scopeCourseTitles(item, scope);
  const { level, topic } = decodeDescription(item.description);
  if (level) parts.push(level);
  if (topic) parts.push(topic);
  parts.push(
    item.questionCount === 1 ? '1 question' : `${formatNumber(item.questionCount)} questions`
  );
  if (item.duration) parts.push(`${formatNumber(item.duration)} min`);
  return parts.join(' · ');
};

function AssignmentsSkeleton() {
  return (
    <div className="teacher-assignments-skeleton" role="status">
      <span className="sr-only">Loading assignments…</span>
      {[0, 1].map((panel) => (
        <div className="teacher-assignments-skeleton-panel" aria-hidden="true" key={panel}>
          <div className="teacher-assignments-skeleton-head">
            <span className="skeleton teacher-assignments-skeleton-title" />
            <span className="skeleton teacher-assignments-skeleton-count" />
          </div>
          {[0, 1, 2].map((row) => (
            <div className="teacher-assignments-skeleton-row" key={row}>
              <div className="teacher-assignments-skeleton-row-main">
                <span className="skeleton teacher-assignments-skeleton-line" />
                <span className="skeleton teacher-assignments-skeleton-meta" />
              </div>
              <span className="skeleton teacher-assignments-skeleton-pill" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TeacherAssignmentsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState('all');
  const [view, setView] = useState('list');
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [questionCount, setQuestionCount] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [inputMode, setInputMode] = useState('manual');
  const [aiInput, setAiInput] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parsing, setParsing] = useState(false);

  const loadAssignments = useCallback(async (scopedId) => {
    setLoading(true);
    setError(null);
    try {
      const params = scopedId && scopedId !== 'all' ? { courseId: scopedId } : {};
      const response = await getTeacherAssignments(params);
      setData(response.data || {});
    } catch (err) {
      setError(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments(scope);
  }, [loadAssignments, scope]);

  const courses = data?.courses || [];
  const assignments = data?.assignments || [];
  const mcqTests = data?.mcqTests || [];
  const scopeCourse = courses.find((course) => course.id === scope) || null;

  const totalItems = assignments.length + mcqTests.length;
  const publishedItems = (data?.publishedAssignments || 0) + (data?.publishedMcqTests || 0);
  const draftItems = totalItems - publishedItems;
  const publishedPct = totalItems > 0 ? (publishedItems / totalItems) * 100 : 0;

  const isMcq = form.assignmentType === 'MCQ';
  const showSkeleton = loading && !data;

  const scopedCourseIds = useMemo(() => (scope !== 'all' ? [scope] : []), [scope]);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setAssignmentType = (assignmentType) => {
    setForm((current) => ({ ...current, assignmentType }));
    setFieldErrors({});
  };

  const handleCoursesChange = (courseIds) => {
    setForm((current) => ({ ...current, courseIds }));
    setFieldErrors((current) => ({ ...current, courseIds: undefined }));
  };

  const resetCreateForm = (courseIds) => {
    setForm({ ...INITIAL_FORM, courseIds });
    setFieldErrors({});
    setQuestionCount(null);
    setQuestions([]);
    setInputMode('manual');
    setAiInput('');
    setGeneratedQuestions([]);
    setShowPreview(false);
  };

  const openCreate = (assignmentType = 'MCQ') => {
    resetCreateForm(scopedCourseIds);
    setForm((current) => ({ ...current, assignmentType }));
    setView('create');
  };

  const closeCreate = () => {
    resetCreateForm(scopedCourseIds);
    setView('list');
  };

  const handleQuestionCountChange = (event) => {
    const count = Number(event.target.value) || null;
    setQuestionCount(count);
    if (count) {
      setQuestions(Array.from({ length: count }, EMPTY_QUESTION));
    } else {
      setQuestions([]);
    }
    setFieldErrors({});
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`question_${index}`];
      delete next[`optionA_${index}`];
      delete next[`optionB_${index}`];
      delete next[`optionC_${index}`];
      delete next[`optionD_${index}`];
      delete next[`correctAnswer_${index}`];
      return next;
    });
  };

  const validateQuestion = (q) => {
    const question = (q.question ?? '').toString().trim();
    const optionA = (q.optionA ?? '').toString().trim();
    const optionB = (q.optionB ?? '').toString().trim();
    const optionC = (q.optionC ?? '').toString().trim();
    const optionD = (q.optionD ?? '').toString().trim();
    const correctAnswer = (q.correctAnswer ?? '').toString().trim().toUpperCase();

    const errors = [];
    if (!question) errors.push('Question text is required');
    else if (question.length > 1000) errors.push('Question exceeds 1000 characters');
    if (!optionA) errors.push('Option A is required');
    else if (optionA.length > 300) errors.push('Option A exceeds 300 characters');
    if (!optionB) errors.push('Option B is required');
    else if (optionB.length > 300) errors.push('Option B exceeds 300 characters');
    if (!optionC) errors.push('Option C is required');
    else if (optionC.length > 300) errors.push('Option C exceeds 300 characters');
    if (!optionD) errors.push('Option D is required');
    else if (optionD.length > 300) errors.push('Option D exceeds 300 characters');
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      errors.push('Correct answer must be A, B, C, or D');
    }

    const options = [optionA, optionB, optionC, optionD];
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      errors.push('Options must be unique (case-insensitive)');
    }
    return {
      valid: errors.length === 0,
      errors,
      normalized: { question, optionA, optionB, optionC, optionD, correctAnswer },
    };
  };

  const handleGenerateQuestions = async () => {
    if (!aiInput.trim()) {
      toast.warning('Please paste your questions first.');
      return;
    }
    setParsing(true);
    try {
      const response = await parseQuestionsWithAI(aiInput);
      const parsed = response.data?.questions || [];
      if (parsed.length === 0) {
        toast.warning('Could not parse any valid questions. Please check your input format.');
        return;
      }
      setGeneratedQuestions(parsed);
      setShowPreview(true);
      toast.success(
        `${parsed.length} question${parsed.length > 1 ? 's' : ''} generated. Review and edit below.`
      );
    } catch (err) {
      const msg = err.message || 'AI parsing failed. Please try again.';
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleRemoveQuestion = (index) => {
    setGeneratedQuestions((current) => current.filter((_, i) => i !== index));
  };

  const handleEditQuestion = (index, field, value) => {
    setGeneratedQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const handleUseGeneratedQuestions = () => {
    const results = generatedQuestions.map(validateQuestion);
    const validResults = results.filter((r) => r.valid);
    const invalidCount = results.length - validResults.length;

    if (validResults.length === 0) {
      toast.error('No valid questions to transfer. Fix errors in preview first.');
      return;
    }

    if (invalidCount > 0) {
      toast.warning(
        `${invalidCount} invalid question${
          invalidCount > 1 ? 's' : ''
        } skipped. Fix or remove them in preview.`
      );
    }

    const normalized = validResults.map((r) => r.normalized);
    setQuestions(normalized);
    setQuestionCount(normalized.length);
    setInputMode('manual');
    setShowPreview(false);
    setAiInput('');
    setGeneratedQuestions([]);
  };

  const buildAllQuestionPayloads = () =>
    questions.map((q, index) => ({
      question: q.question.trim(),
      options: [q.optionA.trim(), q.optionB.trim(), q.optionC.trim(), q.optionD.trim()],
      correctOption: ANSWER_INDEX[q.correctAnswer],
      marks: 1,
      order: index,
    }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = 'Assignment title is required';
    if (form.courseIds.length === 0) errors.courseIds = 'Select at least one course';
    if (form.duration !== '') {
      const durationValue = Number(form.duration);
      if (!Number.isInteger(durationValue) || durationValue < 1) {
        errors.duration = 'Duration must be a whole number of minutes (1 or more)';
      }
    }

    if (isMcq) {
      if (!form.level) errors.level = 'Select a level';
      if (!form.topic.trim()) errors.topic = 'Topic is required';
      if (!questionCount || questionCount < 1) {
        errors.questionCount = 'Select the number of questions';
      }
      questions.forEach((q, index) => {
        if (!q.question.trim()) {
          errors[`question_${index}`] = `Question ${index + 1} text is required`;
        }
        if (!q.optionA.trim()) errors[`optionA_${index}`] = `Option A is required for Q${index + 1}`;
        if (!q.optionB.trim()) errors[`optionB_${index}`] = `Option B is required for Q${index + 1}`;
        if (!q.optionC.trim()) errors[`optionC_${index}`] = `Option C is required for Q${index + 1}`;
        if (!q.optionD.trim()) errors[`optionD_${index}`] = `Option D is required for Q${index + 1}`;
        if (!q.correctAnswer) {
          errors[`correctAnswer_${index}`] = `Correct answer is required for Q${index + 1}`;
        }
      });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const courseCount = form.courseIds.length;
    const courseSuffix = courseCount > 1 ? ` across ${courseCount} courses` : '';

    const saveRequest = isMcq
      ? createMcqTestsForCourses(form.courseIds, {
          title: form.title.trim(),
          description: encodeDescription(form.topic.trim(), form.level),
          questions: buildAllQuestionPayloads(),
          duration: form.duration === '' ? 0 : Number(form.duration),
          passingScore: 50,
          status: 'published',
        })
      : createAssignmentsForCourses(form.courseIds, {
          title: form.title.trim(),
          assignmentType: 'normalTest',
          duration: form.duration === '' ? null : Number(form.duration),
          status: 'published',
        });

    setSaving(true);
    saveRequest
      .then(() => {
        const msg = isMcq
          ? `Practice test created with ${questionCount} questions${courseSuffix}.`
          : `Assignment created${courseSuffix}.`;
        toast.success(msg);
        resetCreateForm(scopedCourseIds);
        setView('list');
        loadAssignments(scope);
      })
      .catch((err) => {
        toast.error(err.message || 'Could not create this assignment.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const showCreate = view === 'create';

  return (
    <div className="teacher-assignments fade-in">
      <header className="teacher-assignments-masthead">
        <div className="teacher-assignments-head">
          {showCreate ? (
            <button type="button" className="teacher-assignments-back" onClick={closeCreate}>
              ← Back to assignments
            </button>
          ) : null}
          <h1 className="teacher-assignments-title" id="teacher-assignments-heading">
            {showCreate ? 'New assignment' : 'Assignments'}
          </h1>
          {!showCreate ? (
            showSkeleton ? (
              <span
                className="skeleton teacher-assignments-switch-skeleton"
                aria-hidden="true"
              />
            ) : courses.length > 0 ? (
              <SelectMenu
                className="teacher-assignments-switch"
                ariaLabel="Course"
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: 'All courses' },
                  ...courses.map((course) => ({ value: course.id, label: course.title })),
                ]}
              />
            ) : null
          ) : null}
        </div>

        {!showCreate ? (
          <div className="teacher-assignments-stat">
            <span className="teacher-assignments-stat-label">Published</span>
            {showSkeleton ? (
              <span className="skeleton teacher-assignments-stat-skeleton" aria-hidden="true" />
            ) : error ? (
              <span className="teacher-assignments-stat-value">—</span>
            ) : courses.length === 0 ? (
              <>
                <span className="teacher-assignments-stat-value">—</span>
                <span className="teacher-assignments-stat-caption">No courses yet</span>
              </>
            ) : (
              <>
                <span className="teacher-assignments-stat-value">
                  {formatNumber(publishedItems)}
                  <span className="teacher-assignments-stat-total">
                    {' '}
                    of {formatNumber(totalItems)}
                  </span>
                </span>
                {totalItems > 0 ? (
                  <>
                    <span className="teacher-assignments-bar" aria-hidden="true">
                      <span style={{ width: `${publishedPct}%` }} />
                    </span>
                    <span className="teacher-assignments-stat-caption">
                      {draftItems > 0
                        ? `${formatNumber(draftItems)} ${draftItems === 1 ? 'draft' : 'drafts'}`
                        : 'All published'}
                    </span>
                  </>
                ) : (
                  <span className="teacher-assignments-stat-caption">Nothing created yet</span>
                )}
              </>
            )}
          </div>
        ) : null}
      </header>

      {showCreate ? (
        <form className="teacher-assignments-form" onSubmit={handleSubmit} noValidate>
          <section
            className="teacher-assignments-panel"
            aria-labelledby="teacher-assignments-details-heading"
          >
            <header className="teacher-assignments-panel-head">
              <h2 id="teacher-assignments-details-heading">Details</h2>
              <span className="teacher-assignments-panel-count">
                {isMcq ? 'Practice test' : 'Assignment'}
              </span>
            </header>

            <div className="teacher-assignments-form-body">
              <MultiCourseSelect
                label="Courses"
                courses={courses}
                value={form.courseIds}
                onChange={handleCoursesChange}
                error={fieldErrors.courseIds}
                hint={
                  form.courseIds.length > 1
                    ? `One shared copy is visible to all ${form.courseIds.length} selected courses.`
                    : undefined
                }
              />

              <div className="teacher-assignments-form-grid">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={setField('title')}
                  placeholder="e.g. Build a responsive dashboard"
                  error={fieldErrors.title}
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.duration}
                  onChange={setField('duration')}
                  placeholder="e.g. 60"
                  error={fieldErrors.duration}
                  hint="Leave empty for no time limit."
                />
              </div>

              <div className="teacher-assignments-choice">
                <span className="teacher-assignments-choice-label">Type</span>
                <div
                  className="teacher-assignments-toggle"
                  role="group"
                  aria-label="Assignment type"
                >
                  <button
                    type="button"
                    className={`teacher-assignments-toggle-option${!isMcq ? ' is-active' : ''}`}
                    aria-pressed={!isMcq}
                    onClick={() => setAssignmentType('normalTest')}
                  >
                    Assignment
                  </button>
                  <button
                    type="button"
                    className={`teacher-assignments-toggle-option${isMcq ? ' is-active' : ''}`}
                    aria-pressed={isMcq}
                    onClick={() => setAssignmentType('MCQ')}
                  >
                    Practice test
                  </button>
                </div>
              </div>

              {isMcq ? (
                <div className="teacher-assignments-form-grid">
                  <Select
                    label="Level"
                    value={form.level}
                    onChange={setField('level')}
                    error={fieldErrors.level}
                    hint="Section heading on the student practice page."
                  >
                    <option value="">Select level</option>
                    {PRACTICE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Topic"
                    value={form.topic}
                    onChange={setField('topic')}
                    placeholder="e.g. How the Internet Works"
                    error={fieldErrors.topic}
                    hint="Shown on the practice card."
                  />
                </div>
              ) : null}
            </div>
          </section>

          {isMcq ? (
            <section
              className="teacher-assignments-panel"
              aria-labelledby="teacher-assignments-questions-heading"
            >
              <header className="teacher-assignments-panel-head">
                <h2 id="teacher-assignments-questions-heading">Questions</h2>
                <span className="teacher-assignments-panel-count">
                  {questionCount
                    ? `${formatNumber(questionCount)} ${
                        questionCount === 1 ? 'question' : 'questions'
                      }`
                    : 'Not set'}
                </span>
              </header>

              <div className="teacher-assignments-form-body">
                <div className="teacher-assignments-choice">
                  <span className="teacher-assignments-choice-label">Input method</span>
                  <div
                    className="teacher-assignments-toggle"
                    role="group"
                    aria-label="Question input method"
                  >
                    <button
                      type="button"
                      className={`teacher-assignments-toggle-option${
                        inputMode === 'manual' ? ' is-active' : ''
                      }`}
                      aria-pressed={inputMode === 'manual'}
                      onClick={() => setInputMode('manual')}
                    >
                      Write questions
                    </button>
                    <button
                      type="button"
                      className={`teacher-assignments-toggle-option${
                        inputMode === 'ai' ? ' is-active' : ''
                      }`}
                      aria-pressed={inputMode === 'ai'}
                      onClick={() => setInputMode('ai')}
                    >
                      Paste questions
                    </button>
                  </div>
                </div>

                {inputMode === 'ai' ? (
                  <>
                    <Textarea
                      label="Paste your questions"
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      rows={8}
                      placeholder={
                        'Paste your questions here…\n\nExample:\n1. What is 2 + 2?\nA) 3  B) 4  C) 5  D) 6\nAnswer: B'
                      }
                    />
                    <div className="teacher-assignments-inline-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleGenerateQuestions}
                        loading={parsing}
                        disabled={parsing}
                      >
                        {parsing ? 'Generating…' : 'Generate questions'}
                      </Button>
                    </div>

                    {showPreview && generatedQuestions.length > 0 ? (
                      <div className="teacher-assignments-preview">
                        <div className="teacher-assignments-preview-head">
                          <h3>
                            {generatedQuestions.length}{' '}
                            {generatedQuestions.length === 1 ? 'question' : 'questions'} generated
                          </h3>
                          <Button
                            type="button"
                            variant="success"
                            onClick={handleUseGeneratedQuestions}
                          >
                            Use these questions
                          </Button>
                        </div>

                        {generatedQuestions.map((q, index) => {
                          const validation = validateQuestion(q);
                          return (
                            <div
                              className={`teacher-assignments-question${
                                validation.valid ? '' : ' is-invalid'
                              }`}
                              key={index}
                            >
                              <div className="teacher-assignments-question-head">
                                <p className="teacher-assignments-question-number">
                                  Question {index + 1}
                                </p>
                                {!validation.valid ? (
                                  <span className="teacher-assignments-question-flag">Invalid</span>
                                ) : null}
                                <button
                                  type="button"
                                  className="teacher-assignments-question-remove"
                                  onClick={() => handleRemoveQuestion(index)}
                                >
                                  Remove
                                </button>
                              </div>
                              <Input
                                label="Question"
                                value={q.question}
                                onChange={(event) =>
                                  handleEditQuestion(index, 'question', event.target.value)
                                }
                                error={validation.errors.find((error) =>
                                  error.startsWith('Question')
                                )}
                              />
                              <div className="teacher-assignments-form-grid">
                                {['A', 'B', 'C', 'D'].map((letter) => (
                                  <Input
                                    key={letter}
                                    label={`Option ${letter}`}
                                    value={q[`option${letter}`]}
                                    onChange={(event) =>
                                      handleEditQuestion(
                                        index,
                                        `option${letter}`,
                                        event.target.value
                                      )
                                    }
                                    error={validation.errors.find((error) =>
                                      error.includes(`Option ${letter}`)
                                    )}
                                  />
                                ))}
                              </div>
                              <Select
                                label="Correct answer"
                                value={q.correctAnswer}
                                onChange={(event) =>
                                  handleEditQuestion(index, 'correctAnswer', event.target.value)
                                }
                                error={validation.errors.find((error) =>
                                  error.startsWith('Correct answer')
                                )}
                              >
                                <option value="">Select correct answer</option>
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </Select>
                              {!validation.valid ? (
                                <ul className="teacher-assignments-question-errors">
                                  {validation.errors.map((error) => (
                                    <li key={error}>{error}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="teacher-assignments-count">
                      <Select
                        label="Number of questions"
                        value={questionCount ?? ''}
                        onChange={handleQuestionCountChange}
                        error={fieldErrors.questionCount}
                      >
                        <option value="">Select number of questions</option>
                        {QUESTION_COUNT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {questions.length > 0 ? (
                      <div className="teacher-assignments-questions">
                        {questions.map((q, index) => (
                          <div className="teacher-assignments-question" key={index}>
                            <p className="teacher-assignments-question-number">
                              Question {index + 1}
                            </p>
                            <Input
                              label="Question"
                              value={q.question}
                              onChange={(event) =>
                                updateQuestion(index, 'question', event.target.value)
                              }
                              placeholder={`Enter question ${index + 1}`}
                              error={fieldErrors[`question_${index}`]}
                            />
                            <div className="teacher-assignments-form-grid">
                              {['A', 'B', 'C', 'D'].map((letter) => (
                                <Input
                                  key={letter}
                                  label={`Option ${letter}`}
                                  value={q[`option${letter}`]}
                                  onChange={(event) =>
                                    updateQuestion(index, `option${letter}`, event.target.value)
                                  }
                                  error={fieldErrors[`option${letter}_${index}`]}
                                />
                              ))}
                            </div>
                            <Select
                              label="Correct answer"
                              value={q.correctAnswer}
                              onChange={(event) =>
                                updateQuestion(index, 'correctAnswer', event.target.value)
                              }
                              error={fieldErrors[`correctAnswer_${index}`]}
                            >
                              <option value="">Select correct answer</option>
                              <option value="A">Option A</option>
                              <option value="B">Option B</option>
                              <option value="C">Option C</option>
                              <option value="D">Option D</option>
                            </Select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="teacher-assignments-hint">
                        Choose how many questions you want to write.
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>
          ) : null}

          <div className="teacher-assignments-actions">
            <button type="button" className="teacher-assignments-cancel" onClick={closeCreate}>
              Cancel
            </button>
            <Button type="submit" loading={saving} disabled={saving}>
              {isMcq
                ? questionCount
                  ? `Create practice test with ${questionCount} questions`
                  : 'Create practice test'
                : 'Create assignment'}
            </Button>
          </div>
        </form>
      ) : error ? (
        <div className="teacher-assignments-state">
          <ErrorState message={error} onRetry={() => loadAssignments(scope)} />
        </div>
      ) : showSkeleton ? (
        <AssignmentsSkeleton />
      ) : courses.length === 0 ? (
        <div className="teacher-assignments-state">
          <EmptyState
            title="No courses yet"
            message="Assignments can be created once a course exists."
          />
        </div>
      ) : (
        <>
          <section
            className="teacher-assignments-panel"
            aria-labelledby="teacher-assignments-list-heading"
          >
            <header className="teacher-assignments-panel-head">
              <h2 id="teacher-assignments-list-heading">Assignments</h2>
              <div className="teacher-assignments-panel-side">
                <span className="teacher-assignments-panel-count">
                  {formatNumber(assignments.length)}{' '}
                  {assignments.length === 1 ? 'assignment' : 'assignments'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openCreate('normalTest')}
                >
                  New assignment
                </Button>
              </div>
            </header>

            {assignments.length === 0 ? (
              <p className="teacher-assignments-empty">
                {scope === 'all'
                  ? 'No assignments yet.'
                  : 'No assignments in this course yet.'}
              </p>
            ) : (
              <ol className="teacher-assignments-list">
                {assignments.map((assignment) => (
                  <li className="teacher-assignments-row" key={assignment.id}>
                    <span className="teacher-assignments-row-main">
                      <span className="teacher-assignments-row-title">{assignment.title}</span>
                      <span className="teacher-assignments-row-meta">
                        {assignmentMeta(assignment, scope)}
                      </span>
                    </span>
                    <span className="teacher-assignments-row-side">
                      <span className={`teacher-assignments-status is-${assignment.status}`}>
                        {statusLabel(assignment.status)}
                      </span>
                      <time dateTime={assignment.createdAt || undefined}>
                        {relativeTime(assignment.createdAt)}
                      </time>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section
            className="teacher-assignments-panel"
            aria-labelledby="teacher-assignments-tests-heading"
          >
            <header className="teacher-assignments-panel-head">
              <h2 id="teacher-assignments-tests-heading">Practice tests</h2>
              <div className="teacher-assignments-panel-side">
                <span className="teacher-assignments-panel-count">
                  {formatNumber(mcqTests.length)}{' '}
                  {mcqTests.length === 1 ? 'practice test' : 'practice tests'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openCreate('MCQ')}
                >
                  New practice test
                </Button>
              </div>
            </header>

            {mcqTests.length === 0 ? (
              <p className="teacher-assignments-empty">
                {scope === 'all'
                  ? 'No practice tests yet.'
                  : 'No practice tests in this course yet.'}
              </p>
            ) : (
              <ol className="teacher-assignments-list">
                {mcqTests.map((test) => (
                  <li className="teacher-assignments-row" key={test.id}>
                    <span className="teacher-assignments-row-main">
                      <span className="teacher-assignments-row-title">{test.title}</span>
                      <span className="teacher-assignments-row-meta">{mcqMeta(test, scope)}</span>
                    </span>
                    <span className="teacher-assignments-row-side">
                      <span className={`teacher-assignments-status is-${test.status}`}>
                        {statusLabel(test.status)}
                      </span>
                      <time dateTime={test.createdAt || undefined}>
                        {relativeTime(test.createdAt)}
                      </time>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
