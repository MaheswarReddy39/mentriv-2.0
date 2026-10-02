import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Loading from '../../components/common/Loading.jsx';
import MultiCourseSelect from '../../components/common/MultiCourseSelect.jsx';
import Select from '../../components/common/Select.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import {
  createMcqTestsForCourses,
  getMcqTestById,
  updateMcqTest,
} from '../../services/mcq.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';
import {
  LEVEL_BADGE_CLASS,
  PRACTICE_LEVELS,
  decodeDescription,
  encodeDescription,
} from '../../utils/practiceLevels.js';

const LETTERS = ['A', 'B', 'C', 'D'];

const INITIAL_FORM = {
  courseIds: [],
  title: '',
  topic: '',
  level: '',
  passingScore: '',
};

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25];

const EMPTY_QUESTION = () => ({
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: '',
  explanation: '',
});

const isCompleteQuestion = (question) =>
  Boolean(question.question.trim()) &&
  [question.optionA, question.optionB, question.optionC, question.optionD].every((option) =>
    Boolean(option.trim())
  ) &&
  Boolean(question.correctAnswer);

const toPayloadQuestions = (blocks) =>
  blocks
    .filter(isCompleteQuestion)
    .map((question, index) => ({
      question: question.question.trim(),
      options: [question.optionA, question.optionB, question.optionC, question.optionD].map(
        (option) => option.trim()
      ),
      correctOption: LETTERS.indexOf(question.correctAnswer),
      marks: 1,
      order: index,
      explanation: question.explanation.trim(),
    }));

const fromApiQuestions = (apiQuestions = []) => {
  const sorted = [...apiQuestions].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );
  return sorted.map((question) => ({
    question: question.question || '',
    optionA: question.options?.[0] || '',
    optionB: question.options?.[1] || '',
    optionC: question.options?.[2] || '',
    optionD: question.options?.[3] || '',
    correctAnswer: LETTERS[question.correctOption] || '',
    explanation: question.explanation || '',
  }));
};

export default function TeacherPracticeFormPage({ mode = 'create' }) {
  const { practiceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [viewOnly, setViewOnly] = useState(mode === 'view');
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(Boolean(practiceId));

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [questions, setQuestions] = useState([]);
  const [questionCount, setQuestionCount] = useState('');
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [initialSerialized, setInitialSerialized] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isView = viewOnly;
  const questionsLocked = attemptsCount > 0;
  const questionsDisabled = isView || questionsLocked;
  const lockedMessage = `Questions are locked because ${attemptsCount} student ${
    attemptsCount === 1 ? 'attempt exists' : 'attempts exist'
  } for this practice. You can still edit the title, topic, level and passing score. To change questions, archive this practice and create a new one.`;

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

  const loadPractice = useCallback(async () => {
    if (!practiceId) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const response = await getMcqTestById(practiceId);
      const test = response?.data?.mcqTest;
      if (!test) throw new Error('Practice set not found.');
      const blocks = fromApiQuestions(test.questions);
      const { level, topic } = decodeDescription(test.description);
      setForm({
        courseIds: test.courseId ? [String(test.courseId)] : [],
        title: test.title || '',
        topic,
        level,
        passingScore: test.passingScore === undefined || test.passingScore === null
          ? ''
          : String(test.passingScore),
      });
      setQuestions(blocks);
      setQuestionCount(blocks.length > 0 ? String(blocks.length) : '');
      setAttemptsCount(Number(test.attemptsCount) || 0);
      setInitialSerialized(JSON.stringify(toPayloadQuestions(blocks)));
      setFieldErrors({});
    } catch (err) {
      if (err.statusCode === 404) setNotFound(true);
      else setLoadError(err.message || 'Failed to load this practice set.');
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    setViewOnly(mode === 'view');
    setFieldErrors({});
  }, [mode]);

  useEffect(() => {
    if (practiceId) return;
    setForm(INITIAL_FORM);
    setQuestions([]);
    setQuestionCount('');
    setAttemptsCount(0);
    setInitialSerialized(null);
    setFieldErrors({});
    setNotFound(false);
    setLoadError(null);
    setLoading(false);
  }, [practiceId]);

  useEffect(() => {
    loadPractice();
  }, [loadPractice]);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, [field]: value } : question))
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

  const handleQuestionCountChange = (event) => {
    const value = event.target.value;
    const count = Number(value) || 0;
    setQuestionCount(value);
    setQuestions((current) => {
      if (count > current.length) {
        return [
          ...current,
          ...Array.from({ length: count - current.length }, EMPTY_QUESTION),
        ];
      }
      return current.slice(0, count);
    });
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.questions;
      return next;
    });
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (form.courseIds.length === 0) errors.courseIds = 'Select at least one course';
    if (!form.level) errors.level = 'Select a level';
    if (
      form.passingScore === '' ||
      Number(form.passingScore) < 0 ||
      Number(form.passingScore) > 100
    ) {
      errors.passingScore = 'Enter a score between 0 and 100';
    }

    if (questionsLocked) return errors;

    if (!questionCount) {
      errors.questions = 'Select the number of questions';
    }

    questions.forEach((question, index) => {
      if (!question.question.trim()) errors[`question_${index}`] = 'Question text is required';
      if (!question.optionA.trim()) errors[`optionA_${index}`] = 'Option A is required';
      if (!question.optionB.trim()) errors[`optionB_${index}`] = 'Option B is required';
      if (!question.optionC.trim()) errors[`optionC_${index}`] = 'Option C is required';
      if (!question.optionD.trim()) errors[`optionD_${index}`] = 'Option D is required';
      if (!question.correctAnswer) {
        errors[`correctAnswer_${index}`] = 'Select the correct answer';
      }
    });

    return errors;
  };

  const save = async () => {
    if (saving || isView) return;

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Fix the highlighted fields before submitting.');
      return;
    }

    const payloadQuestions = toPayloadQuestions(questions);
    const payload = {
      title: form.title.trim(),
      description: encodeDescription(form.topic, form.level),
      passingScore: form.passingScore === '' ? 0 : Number(form.passingScore),
      status: 'published',
    };

    if (
      !questionsLocked &&
      (initialSerialized === null || JSON.stringify(payloadQuestions) !== initialSerialized)
    ) {
      payload.questions = payloadQuestions;
    }

    setSaving(true);
    try {
      if (practiceId) {
        await updateMcqTest(practiceId, payload);
        toast.success('Practice set published.');
      } else {
        await createMcqTestsForCourses(form.courseIds, payload);
        const courseCount = form.courseIds.length;
        toast.success(
          courseCount > 1
            ? `Practice set published to ${courseCount} courses.`
            : 'Practice set published.'
        );
      }
      setFieldErrors({});
      navigate('/teacher/mcqs');
    } catch (err) {
      if (err.statusCode === 409) {
        setAttemptsCount((current) => (current > 0 ? current : 1));
        toast.info(
          'Questions are locked because student attempts already exist. You can edit the title, topic, level and passing score, or archive this practice and create a new one.'
        );
      } else {
        toast.error(err.message || 'Could not save this practice set.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    save();
  };

  const handleArchive = async () => {
    if (archiving) return;
    setArchiving(true);
    try {
      await updateMcqTest(practiceId, { status: 'archived' });
      toast.success('Practice set archived.');
      navigate('/teacher/mcqs');
    } catch (err) {
      toast.error(err.message || 'Could not archive this practice set.');
    } finally {
      setArchiving(false);
      setConfirmOpen(false);
    }
  };

  const headingId = 'teacher-practice-form-heading';
  const pageTitle = mode === 'create' ? 'Add Practice' : isView ? 'Practice Details' : 'Edit Practice';

  const numericCount = Number(questionCount) || 0;
  const countOptions =
    numericCount && !QUESTION_COUNT_OPTIONS.includes(numericCount)
      ? [...QUESTION_COUNT_OPTIONS, numericCount].sort((a, b) => a - b)
      : QUESTION_COUNT_OPTIONS;
  const allQuestionsComplete =
    questions.length > 0 && questions.every((question) => isCompleteQuestion(question));
  const publishHint = questionsLocked
    ? ''
    : !numericCount
      ? 'Select the number of questions to start building this practice set.'
      : !allQuestionsComplete
        ? `Complete all ${numericCount} questions before submitting.`
        : '';

  const pageHead = (
    <div className="page-head">
      <div>
        <p className="text-caption">Teacher</p>
        <h1 id={headingId}>{pageTitle}</h1>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {practiceId ? (
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)}>
            Archive
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => navigate('/teacher/mcqs')}>
          Back to list
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        <div className="page-head">
          <div>
            <p className="text-caption">Teacher</p>
            <h1 id={headingId}>{pageTitle}</h1>
          </div>
        </div>
        <Loading label="Loading practice set..." />
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        <div className="page-head">
          <div>
            <p className="text-caption">Teacher</p>
            <h1 id={headingId}>MCQs / Practice</h1>
          </div>
        </div>
        <EmptyState
          title="Practice set not found"
          message="This practice set may have been removed."
          action={
            <Button type="button" onClick={() => navigate('/teacher/mcqs')}>
              Back to list
            </Button>
          }
        />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
        <div className="page-head">
          <div>
            <p className="text-caption">Teacher</p>
            <h1 id={headingId}>{pageTitle}</h1>
          </div>
        </div>
        <ErrorState message={loadError} onRetry={loadPractice} />
      </section>
    );
  }

  return (
    <section className="teacher-classes-page fade-in" aria-labelledby={headingId}>
      {pageHead}

        <form className="teacher-class-form" onSubmit={handleSubmit} noValidate>
        <div className="card teacher-class-card">
          <div
            className="teacher-card-head"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p className="text-caption">Practice details</p>
              <h2>{form.title.trim() || 'New practice set'}</h2>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              {form.level ? (
                <span className={`badge ${LEVEL_BADGE_CLASS[form.level] || 'badge-neutral'}`}>
                  {form.level}
                </span>
              ) : null}
              {isView && practiceId ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/teacher/mcqs/${practiceId}/edit`)}
                >
                  Edit Practice
                </Button>
              ) : null}
            </div>
          </div>

          <div className="teacher-class-form-grid">
            <MultiCourseSelect
              label="Courses"
              courses={courses}
              value={form.courseIds}
              onChange={(courseIds) =>
                setForm((current) => ({ ...current, courseIds }))
              }
              disabled={Boolean(practiceId) || isView || loadingCourses}
              loading={loadingCourses}
              error={fieldErrors.courseIds}
              hint={
                practiceId
                  ? 'Content belongs to this course. Create a new practice set to reuse it in another course.'
                  : undefined
              }
              style={{ gridColumn: '1 / -1' }}
            />

            <Input
              label="Title"
              value={form.title}
              onChange={setField('title')}
              placeholder="Practice set title"
              disabled={isView}
              error={fieldErrors.title}
            />
          </div>

          {courseError ? <ErrorState message={courseError} onRetry={loadCourses} /> : null}

          <div className="teacher-class-form-grid">
            <Input
              label="Topic"
              value={form.topic}
              onChange={setField('topic')}
              placeholder="e.g. JavaScript"
              disabled={isView}
              error={fieldErrors.topic}
            />

            <Select
              label="Level"
              value={form.level}
              onChange={setField('level')}
              disabled={isView}
              error={fieldErrors.level}
            >
              <option value="">Select level</option>
              {PRACTICE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </div>

          <div className="teacher-class-form-grid">
            <Input
              label="Passing Score (%)"
              type="number"
              min="0"
              max="100"
              value={form.passingScore}
              onChange={setField('passingScore')}
              placeholder="e.g. 70"
              disabled={isView}
              error={fieldErrors.passingScore}
            />
          </div>
        </div>

        <div className="card teacher-class-card">
          <div
            className="teacher-card-head"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p className="text-caption">Questions</p>
              <h2>Questions ({questions.length})</h2>
            </div>
          </div>

          {questionsLocked ? (
            <p
              role="status"
              style={{
                margin: 0,
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-muted)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {lockedMessage}
            </p>
          ) : null}

          <div className="teacher-assignment-type-row">
            <Select
              label="Number of Questions"
              value={questionCount}
              onChange={handleQuestionCountChange}
              disabled={questionsDisabled}
              error={fieldErrors.questions}
            >
              <option value="">Select number of questions</option>
              {countOptions.map((count) => (
                <option key={count} value={count}>
                  {count} Questions
                </option>
              ))}
            </Select>
          </div>

          <div className="teacher-assignment-fields">
            {questions.map((question, index) => (
              <div
                key={index}
                className="teacher-mcq-question-block"
                style={{
                  display: 'grid',
                  gap: 'var(--space-4)',
                  borderLeft: '3px solid var(--color-border, #e2e8f0)',
                  paddingLeft: 'var(--space-4)',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>Question {index + 1}</p>

                <Input
                  label="Question"
                  value={question.question}
                  onChange={(event) => updateQuestion(index, 'question', event.target.value)}
                  placeholder={`Enter question ${index + 1}`}
                  disabled={questionsDisabled}
                  error={fieldErrors[`question_${index}`]}
                />

                <div className="teacher-class-form-grid">
                  <Input
                    label="Option A"
                    value={question.optionA}
                    onChange={(event) => updateQuestion(index, 'optionA', event.target.value)}
                    disabled={questionsDisabled}
                    error={fieldErrors[`optionA_${index}`]}
                  />
                  <Input
                    label="Option B"
                    value={question.optionB}
                    onChange={(event) => updateQuestion(index, 'optionB', event.target.value)}
                    disabled={questionsDisabled}
                    error={fieldErrors[`optionB_${index}`]}
                  />
                  <Input
                    label="Option C"
                    value={question.optionC}
                    onChange={(event) => updateQuestion(index, 'optionC', event.target.value)}
                    disabled={questionsDisabled}
                    error={fieldErrors[`optionC_${index}`]}
                  />
                  <Input
                    label="Option D"
                    value={question.optionD}
                    onChange={(event) => updateQuestion(index, 'optionD', event.target.value)}
                    disabled={questionsDisabled}
                    error={fieldErrors[`optionD_${index}`]}
                  />
                </div>

                <Select
                  label="Correct Answer"
                  value={question.correctAnswer}
                  onChange={(event) => updateQuestion(index, 'correctAnswer', event.target.value)}
                  disabled={questionsDisabled}
                  error={fieldErrors[`correctAnswer_${index}`]}
                >
                  <option value="">Select correct answer</option>
                  {LETTERS.map((letter) => (
                    <option key={letter} value={letter}>
                      Option {letter}
                    </option>
                  ))}
                </Select>

                <Textarea
                  label="Explanation"
                  rows={2}
                  value={question.explanation}
                  onChange={(event) => updateQuestion(index, 'explanation', event.target.value)}
                  placeholder="Why is this the correct answer?"
                  disabled={questionsDisabled}
                />
              </div>
            ))}
          </div>

          {!isView ? (
            <>
              {publishHint ? (
                <p className="text-meta" style={{ margin: 0 }} role="status">
                  {publishHint}
                </p>
              ) : null}
              <div
                className="teacher-class-actions"
                style={{ justifyContent: 'flex-end', gap: 'var(--space-3)' }}
              >
                <Button type="submit" loading={saving} disabled={saving || loadingCourses}>
                  Submit Practice
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Archive this practice set?"
        message="Students will no longer see it. You can keep editing it later."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        danger
        loading={archiving}
        onConfirm={handleArchive}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
