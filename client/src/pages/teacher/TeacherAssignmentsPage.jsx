import { useEffect, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { createAssignment } from '../../services/assignment.service.js';
import { createMcqTest, listCourseMcqTests, updateMcqTest } from '../../services/mcq.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';

const INITIAL_FORM = {
  title: '',
  courseId: '',
  assignmentType: 'MCQ',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: '',
};

const ANSWER_INDEX = { A: 0, B: 1, C: 2, D: 3 };

export default function TeacherAssignmentsPage() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [currentMcqTest, setCurrentMcqTest] = useState(null);

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

  const buildQuestionPayload = (order) => ({
    question: form.question.trim(),
    options: [
      form.optionA.trim(),
      form.optionB.trim(),
      form.optionC.trim(),
      form.optionD.trim(),
    ],
    correctOption: ANSWER_INDEX[form.correctAnswer],
    marks: 1,
    order,
  });

  const saveMcqQuestion = async () => {
    const title = form.title.trim();
    let startedNewVersion = false;
    const sameDraft =
      currentMcqTest &&
      currentMcqTest.courseId === form.courseId &&
      currentMcqTest.title === title;

    let test = sameDraft ? currentMcqTest : null;
    if (!test) {
      const listResponse = await listCourseMcqTests(form.courseId);
      test = (listResponse.data.mcqTests || []).find(
        (item) => item.title === title && item.status === 'published'
      );
    }

    if (test) {
      const existingQuestions = test.questions || [];
      const nextQuestion = buildQuestionPayload(existingQuestions.length);
      try {
        const response = await updateMcqTest(test.id, {
          questions: [...existingQuestions, nextQuestion],
          status: 'published',
        });
        setCurrentMcqTest(response.data.mcqTest);
        return response;
      } catch (err) {
        if (err.statusCode !== 409) {
          throw err;
        }
        startedNewVersion = true;
      }
    }

    const response = await createMcqTest(form.courseId, {
      title,
      questions: [buildQuestionPayload(0)],
      status: 'published',
    });
    setCurrentMcqTest(response.data.mcqTest);
    if (startedNewVersion) {
      toast.info('Previous MCQ already has attempts. Started a new MCQ test safely.');
    }
    return response;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = 'Assignment Title is required';
    if (!form.courseId) errors.courseId = 'Select Course is required';

    if (form.assignmentType === 'MCQ') {
      if (!form.question.trim()) errors.question = 'Question is required';
      if (!form.optionA.trim()) errors.optionA = 'Option A is required';
      if (!form.optionB.trim()) errors.optionB = 'Option B is required';
      if (!form.optionC.trim()) errors.optionC = 'Option C is required';
      if (!form.optionD.trim()) errors.optionD = 'Option D is required';
      if (!form.correctAnswer) errors.correctAnswer = 'Correct Answer is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const saveRequest = form.assignmentType === 'MCQ'
      ? saveMcqQuestion()
      : createAssignment(form.courseId, {
          title: form.title.trim(),
          assignmentType: 'normalTest',
          status: 'published',
        });

    setSaving(true);
    saveRequest
      .then(() => {
        toast.success('Assignment added successfully.');
        setFieldErrors({});
        setForm((current) => ({
          ...INITIAL_FORM,
          title: current.title,
          courseId: current.courseId,
          assignmentType: current.assignmentType,
        }));
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
              <Input
                label="Question"
                value={form.question}
                onChange={setField('question')}
                placeholder="Enter question"
                error={fieldErrors.question}
              />
              <div className="teacher-class-form-grid">
                <Input label="Option A" value={form.optionA} onChange={setField('optionA')} error={fieldErrors.optionA} />
                <Input label="Option B" value={form.optionB} onChange={setField('optionB')} error={fieldErrors.optionB} />
                <Input label="Option C" value={form.optionC} onChange={setField('optionC')} error={fieldErrors.optionC} />
                <Input label="Option D" value={form.optionD} onChange={setField('optionD')} error={fieldErrors.optionD} />
              </div>
              <Select
                label="Correct Answer"
                value={form.correctAnswer}
                onChange={setField('correctAnswer')}
                error={fieldErrors.correctAnswer}
              >
                <option value="">Select correct answer</option>
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </Select>
            </div>
          ) : (
            null
          )}

          <div className="teacher-class-actions">
            <Button type="submit" loading={saving} disabled={saving}>Add Assignment</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
