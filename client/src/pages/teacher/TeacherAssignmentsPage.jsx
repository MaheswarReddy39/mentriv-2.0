import { useEffect, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { createAssignment } from '../../services/assignment.service.js';
import { createMcqTest, parseQuestionsWithAI } from '../../services/mcq.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';

const INITIAL_FORM = {
  title: '',
  courseId: '',
  assignmentType: 'MCQ',
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

export default function TeacherAssignmentsPage() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [questionCount, setQuestionCount] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [inputMode, setInputMode] = useState('manual');
  const [aiInput, setAiInput] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parsing, setParsing] = useState(false);

  const loadCourses = async () => {
    setLoadingCourses(true);
    setCourseError(null);
    try {
      const response = await getTeacherDashboard();
      setCourses(response.data.courses || []);
    } catch (err) {
      setCourseError(err.message || 'Failed to load courses.');
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
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

  const isValidQuestion = (q) => {
    const question = (q.question ?? '').toString().trim();
    const optionA = (q.optionA ?? '').toString().trim();
    const optionB = (q.optionB ?? '').toString().trim();
    const optionC = (q.optionC ?? '').toString().trim();
    const optionD = (q.optionD ?? '').toString().trim();
    const correctAnswer = (q.correctAnswer ?? '').toString().trim().toUpperCase();

    if (!question || question.length > 1000) return false;
    if (!optionA || optionA.length > 300) return false;
    if (!optionB || optionB.length > 300) return false;
    if (!optionC || optionC.length > 300) return false;
    if (!optionD || optionD.length > 300) return false;
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) return false;

    const options = [optionA, optionB, optionC, optionD];
    if (new Set(options.map(o => o.toLowerCase())).size !== options.length) return false;

    return true;
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
      const validQuestions = parsed.filter(isValidQuestion);
      if (validQuestions.length === 0) {
        toast.warning('No valid questions generated. Please check your input format.');
        return;
      }
      setGeneratedQuestions(validQuestions);
      setShowPreview(true);
      toast.success(`${validQuestions.length} question${validQuestions.length > 1 ? 's' : ''} generated successfully.`);
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
    const normalized = generatedQuestions.map((q) => ({
      question: (q.question ?? '').toString().trim(),
      optionA: (q.optionA ?? '').toString().trim(),
      optionB: (q.optionB ?? '').toString().trim(),
      optionC: (q.optionC ?? '').toString().trim(),
      optionD: (q.optionD ?? '').toString().trim(),
      correctAnswer: (q.correctAnswer ?? '').toString().trim().toUpperCase(),
    }));
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
      options: [
        q.optionA.trim(),
        q.optionB.trim(),
        q.optionC.trim(),
        q.optionD.trim(),
      ],
      correctOption: ANSWER_INDEX[q.correctAnswer],
      marks: 1,
      order: index,
    }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = 'Assignment Title is required';
    if (!form.courseId) errors.courseId = 'Select Course is required';

    if (form.assignmentType === 'MCQ') {
      if (!questionCount || questionCount < 1) {
        errors.questionCount = 'Select the number of questions';
      }
      questions.forEach((q, index) => {
        if (!q.question.trim()) errors[`question_${index}`] = `Question ${index + 1} text is required`;
        if (!q.optionA.trim()) errors[`optionA_${index}`] = `Option A is required for Q${index + 1}`;
        if (!q.optionB.trim()) errors[`optionB_${index}`] = `Option B is required for Q${index + 1}`;
        if (!q.optionC.trim()) errors[`optionC_${index}`] = `Option C is required for Q${index + 1}`;
        if (!q.optionD.trim()) errors[`optionD_${index}`] = `Option D is required for Q${index + 1}`;
        if (!q.correctAnswer) errors[`correctAnswer_${index}`] = `Correct answer is required for Q${index + 1}`;
      });
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const saveRequest = form.assignmentType === 'MCQ'
      ? createMcqTest(form.courseId, {
          title: form.title.trim(),
          questions: buildAllQuestionPayloads(),
          status: 'published',
        })
      : createAssignment(form.courseId, {
          title: form.title.trim(),
          assignmentType: 'normalTest',
          status: 'published',
        });

    setSaving(true);
    saveRequest
      .then(() => {
        const msg = form.assignmentType === 'MCQ'
          ? `Assignment created successfully with ${questionCount} questions.`
          : 'Assignment added successfully.';
        toast.success(msg);
        setFieldErrors({});
        setForm((current) => ({
          ...INITIAL_FORM,
          title: current.title,
          courseId: current.courseId,
          assignmentType: current.assignmentType,
        }));
        setQuestionCount(null);
        setQuestions([]);
      })
      .catch((err) => {
        toast.error(err.message || 'Could not add this assignment.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const isMcq = form.assignmentType === 'MCQ';

  return (
    <section className="teacher-classes-page fade-in" aria-labelledby="teacher-assignments-heading">
      <div className="page-head">
        <div>
          <p className="text-caption">Teacher</p>
          <h1 id="teacher-assignments-heading">Assignments</h1>
        </div>
      </div>

      <div className="card teacher-class-card">
        <div className="teacher-card-head">
          <div>
            <p className="text-caption">Add Assignment</p>
            <h2>Add Assignment</h2>
          </div>
        </div>

        <form className="teacher-class-form" onSubmit={handleSubmit}>
          <div className="teacher-class-form-grid">
            <Input
              label="Assignment Title"
              value={form.title}
              onChange={setField('title')}
              placeholder="Enter assignment title"
              error={fieldErrors.title}
            />

            <Select
              label="Select Course"
              value={form.courseId}
              onChange={setField('courseId')}
              disabled={loadingCourses}
              error={fieldErrors.courseId}
            >
              <option value="">
                {loadingCourses ? 'Loading courses...' : 'Select a course'}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </div>

          {courseError ? <ErrorState message={courseError} onRetry={loadCourses} /> : null}

          <div className="teacher-assignment-type-row">
            <Select
              label="Assignment Type"
              value={form.assignmentType}
              onChange={setField('assignmentType')}
            >
              <option value="MCQ">MCQ</option>
              <option value="Normal Test">Normal Test</option>
            </Select>
          </div>

          {isMcq ? (
            <div className="teacher-assignment-fields">
              <div className="teacher-assignment-type-row">
                <label className="field-label">Question Input Method</label>
                <div className="teacher-input-mode-toggle">
                  <button
                    type="button"
                    className={`teacher-mode-btn${inputMode === 'manual' ? ' active' : ''}`}
                    onClick={() => setInputMode('manual')}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    className={`teacher-mode-btn${inputMode === 'ai' ? ' active' : ''}`}
                    onClick={() => setInputMode('ai')}
                  >
                    AI Import
                  </button>
                </div>
              </div>

              {inputMode === 'ai' ? (
                <div className="teacher-ai-import-section">
                  <Textarea
                    label="Paste Your Questions"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={'Paste your questions here...\n\nExample format:\n1. What is 2 + 2?\nA) 3  B) 4  C) 5  D) 6\nAnswer: B\n\n2. What is the capital of France?\nA) London  B) Berlin  C) Paris  D) Madrid\nAnswer: C'}
                    rows={8}
                  />
                  <div className="teacher-ai-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateQuestions}
                      loading={parsing}
                      disabled={parsing}
                    >
                      {parsing ? 'Generating...' : 'Generate Questions'}
                    </Button>
                  </div>

                  {showPreview && generatedQuestions.length > 0 && (
                    <div className="teacher-ai-preview">
                      <div className="teacher-preview-header">
                        <h3 className="teacher-preview-count">
                          {generatedQuestions.length} Questions Generated
                        </h3>
                        <Button
                          type="button"
                          variant="success"
                          onClick={handleUseGeneratedQuestions}
                        >
                          Use These Questions
                        </Button>
                      </div>

                      <div className="teacher-preview-list">
                        {generatedQuestions.map((q, index) => (
                          <div key={index} className="teacher-preview-card">
                            <div className="teacher-preview-card-header">
                              <span className="teacher-preview-number">Q{index + 1}</span>
                              <button
                                type="button"
                                className="teacher-preview-remove-btn"
                                onClick={() => handleRemoveQuestion(index)}
                                title="Remove question"
                              >
                                ×
                              </button>
                            </div>
                            <div className="teacher-preview-question">
                              <Input
                                label="Question"
                                value={q.question}
                                onChange={(e) => handleEditQuestion(index, 'question', e.target.value)}
                              />
                            </div>
                            <div className="teacher-preview-options">
                              <div className="teacher-preview-option">
                                <span className="teacher-preview-option-label">A</span>
                                <Input
                                  value={q.optionA}
                                  onChange={(e) => handleEditQuestion(index, 'optionA', e.target.value)}
                                />
                              </div>
                              <div className="teacher-preview-option">
                                <span className="teacher-preview-option-label">B</span>
                                <Input
                                  value={q.optionB}
                                  onChange={(e) => handleEditQuestion(index, 'optionB', e.target.value)}
                                />
                              </div>
                              <div className="teacher-preview-option">
                                <span className="teacher-preview-option-label">C</span>
                                <Input
                                  value={q.optionC}
                                  onChange={(e) => handleEditQuestion(index, 'optionC', e.target.value)}
                                />
                              </div>
                              <div className="teacher-preview-option">
                                <span className="teacher-preview-option-label">D</span>
                                <Input
                                  value={q.optionD}
                                  onChange={(e) => handleEditQuestion(index, 'optionD', e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="teacher-preview-answer">
                              <Select
                                label="Correct Answer"
                                value={q.correctAnswer}
                                onChange={(e) => handleEditQuestion(index, 'correctAnswer', e.target.value)}
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="teacher-assignment-fields">
                  <div className="teacher-assignment-type-row">
                    <Select
                      label="Number of Questions"
                      value={questionCount ?? ''}
                      onChange={handleQuestionCountChange}
                      error={fieldErrors.questionCount}
                    >
                      <option value="">Select number of questions</option>
                      {QUESTION_COUNT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>

                  {questions.map((q, index) => (
                    <div key={index} className="teacher-mcq-question-block" style={{ borderLeft: '3px solid var(--color-border, #e2e8f0)', paddingLeft: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                      <p style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Question {index + 1}</p>
                      <Input
                        label="Question"
                        value={q.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        placeholder={`Enter question ${index + 1}`}
                        error={fieldErrors[`question_${index}`]}
                      />
                      <div className="teacher-class-form-grid">
                        <Input label="Option A" value={q.optionA} onChange={(e) => updateQuestion(index, 'optionA', e.target.value)} error={fieldErrors[`optionA_${index}`]} />
                        <Input label="Option B" value={q.optionB} onChange={(e) => updateQuestion(index, 'optionB', e.target.value)} error={fieldErrors[`optionB_${index}`]} />
                        <Input label="Option C" value={q.optionC} onChange={(e) => updateQuestion(index, 'optionC', e.target.value)} error={fieldErrors[`optionC_${index}`]} />
                        <Input label="Option D" value={q.optionD} onChange={(e) => updateQuestion(index, 'optionD', e.target.value)} error={fieldErrors[`optionD_${index}`]} />
                      </div>
                      <Select
                        label="Correct Answer"
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
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
              )}
            </div>
          ) : (
            null
          )}

          <div className="teacher-class-actions">
            <Button type="submit" loading={saving} disabled={saving}>
              {isMcq && questionCount ? `Create Assignment with ${questionCount} Questions` : 'Add Assignment'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
