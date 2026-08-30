import { useEffect, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import { useToast } from '../../components/feedback/Toast.jsx';
import { createClass } from '../../services/class.service.js';
import { getTeacherDashboard } from '../../services/teacher.service.js';

const INITIAL_FORM = {
  title: '',
  videoLink: '',
  notesLink: '',
  courseId: '',
};

export default function TeacherClassesPage() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = 'Class Title is required';
    if (!form.courseId) errors.courseId = 'Select Course is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const resources = form.notesLink.trim()
      ? [{ title: 'Notes', url: form.notesLink.trim() }]
      : [];

    setSaving(true);
    createClass(form.courseId, {
      title: form.title.trim(),
      videoUrl: form.videoLink.trim(),
      resources,
    })
      .then(() => {
        toast.success('Class added successfully.');
        setForm(INITIAL_FORM);
        setFieldErrors({});
      })
      .catch((err) => {
        toast.error(err.message || 'Could not add this class.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <section className="teacher-classes-page fade-in" aria-labelledby="teacher-classes-heading">
      <div className="page-head">
        <div>
          <p className="text-caption">Teacher</p>
          <h1 id="teacher-classes-heading">Classes</h1>
        </div>
      </div>

      <div className="card teacher-class-card">
        <div className="teacher-card-head">
          <div>
            <p className="text-caption">Add Class</p>
            <h2>Add Class</h2>
          </div>
        </div>

        <form className="teacher-class-form" onSubmit={handleSubmit}>
          <div className="teacher-class-form-grid">
            <Input
              label="Class Title"
              value={form.title}
              onChange={setField('title')}
              placeholder="Enter class title"
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

          <div className="teacher-class-form-grid">
            <Input
              label="Video Link"
              type="url"
              value={form.videoLink}
              onChange={setField('videoLink')}
              placeholder="YouTube, Google Drive, or video URL"
            />
            <Input
              label="Notes Link"
              type="url"
              value={form.notesLink}
              onChange={setField('notesLink')}
              placeholder="Notes URL"
            />
          </div>

          <div className="teacher-class-actions">
            <Button type="submit" loading={saving} disabled={saving}>
              Add Class
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
