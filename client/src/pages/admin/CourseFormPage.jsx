import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Textarea from '../../components/common/Textarea.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import { getAdminCourseById, updateCourse } from '../../services/course.service.js';

const MAX_IMAGE_BYTES = 1_200_000;
const LEVEL_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const initialForm = {
  title: '',
  description: '',
  level: '',
  courseImage: '',
  demoVideoThumbnail: '',
  demoVideoUrl: '',
  duration: '',
  price: '',
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Please choose an image smaller than 1.2 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Image could not be read. Please try again.'));
    reader.readAsDataURL(file);
  });

export default function CourseFormPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [courseSlug, setCourseSlug] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      setLoading(true);
      setApiError(null);
      try {
        const response = await getAdminCourseById(courseId);
        if (cancelled) return;
        const course = response.data.course;
        setCourseSlug(course.slug);
        setForm({
          title: course.title || '',
          description: course.description || '',
          level: course.level === 'beginner' ? 'basic' : course.level || '',
          courseImage: course.thumbnail || '',
          demoVideoThumbnail: course.demoVideoThumbnail || '',
          demoVideoUrl: course.demoVideoUrl || '',
          duration: course.duration ?? '',
          price: course.price ?? '',
        });
      } catch (err) {
        if (!cancelled) setApiError(err.message || 'Failed to load course.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const updateImageField = (field) => async (event) => {
    const file = event.target.files?.[0];
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);

    if (!file) return;

    try {
      const imageData = await readImageFile(file);
      setForm((current) => ({ ...current, [field]: imageData }));
    } catch (err) {
      setFieldErrors((current) => ({ ...current, [field]: err.message }));
      event.target.value = '';
    }
  };

  const validationErrors = useMemo(() => {
    const errors = {};
    const title = form.title.trim();
    const description = form.description.trim();
    const duration = Number(form.duration);
    const price = Number(form.price);

    if (!title) errors.title = 'Course title is required.';
    else if (title.length > 150) errors.title = 'Course title cannot exceed 150 characters.';

    if (!description) errors.description = 'Description is required.';
    else if (description.length > 5000) errors.description = 'Description cannot exceed 5000 characters.';

    if (!form.level) errors.level = 'Course level is required.';
    if (!form.courseImage) errors.courseImage = 'Course image is required.';
    if (!form.demoVideoThumbnail) errors.demoVideoThumbnail = 'Demo video thumbnail is required.';

    if (!form.demoVideoUrl.trim()) errors.demoVideoUrl = 'Demo video URL is required.';
    else if (!isHttpUrl(form.demoVideoUrl.trim())) {
      errors.demoVideoUrl = 'Enter a valid YouTube, Google Drive, or video URL.';
    }

    if (form.duration === '') errors.duration = 'Duration is required.';
    else if (!Number.isInteger(duration) || duration < 0) {
      errors.duration = 'Duration must be a non-negative whole number.';
    }

    if (form.price === '') errors.price = 'Price is required.';
    else if (!Number.isFinite(price) || price < 0) {
      errors.price = 'Price must be a non-negative number.';
    }

    return errors;
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setSaving(true);
    setApiError(null);

    try {
      const response = await updateCourse(courseId, {
        title: form.title.trim(),
        description: form.description.trim(),
        shortDescription: form.description.trim().slice(0, 300),
        level: form.level,
        thumbnail: form.courseImage,
        demoVideoThumbnail: form.demoVideoThumbnail,
        demoVideoUrl: form.demoVideoUrl.trim(),
        duration: Number(form.duration),
        price: Number(form.price),
        status: 'published',
      });

      navigate(`/courses/${response.data.course.slug}`, {
        replace: true,
        state: { updatedCourseTitle: response.data.course.title },
      });
    } catch (err) {
      if (err.statusCode === 409) {
        setFieldErrors((current) => ({
          ...current,
          title: 'A course with this title already exists.',
        }));
      }
      setApiError(err.message || 'Failed to update course. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openDemoVideo = () => {
    if (!isHttpUrl(form.demoVideoUrl.trim())) {
      setFieldErrors((current) => ({
        ...current,
        demoVideoUrl: 'Enter a valid URL before previewing.',
      }));
      return;
    }
    window.open(form.demoVideoUrl.trim(), '_blank', 'noopener,noreferrer');
  };

  if (loading) return <Loading label="Loading course..." />;

  if (apiError && !form.title) {
    return <ErrorState message={apiError} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="admin-course-flow">
      <header className="admin-course-flow-head">
        <Link to={courseSlug ? `/courses/${courseSlug}` : '/admin/courses'} className="back-link">
          Back to Course
        </Link>
        <h1>Edit Course</h1>
      </header>

      {apiError ? (
        <ErrorState message={apiError} />
      ) : null}

      <form className="admin-course-create-card" onSubmit={handleSubmit} noValidate>
        <section className="admin-course-section" aria-labelledby="course-info-title">
          <h2 id="course-info-title">Course Information</h2>
          <Input
            label="Course Title"
            value={form.title}
            onChange={updateField('title')}
            placeholder="Enter course title"
            error={fieldErrors.title}
            required
          />
          <Textarea
            label="Description"
            rows={5}
            value={form.description}
            onChange={updateField('description')}
            placeholder="Write a clear course description"
            error={fieldErrors.description}
            required
          />
          <Select
            label="Course Level"
            value={form.level}
            onChange={updateField('level')}
            error={fieldErrors.level}
            required
          >
            <option value="">Select level</option>
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <label className={`thumbnail-upload-control${fieldErrors.courseImage ? ' upload-error' : ''}`}>
            <span>Course Image</span>
            {form.courseImage ? (
              <img src={form.courseImage} alt="Selected course preview" />
            ) : null}
            <input type="file" accept="image/*" onChange={updateImageField('courseImage')} />
            {fieldErrors.courseImage ? (
              <span className="field-error-text">{fieldErrors.courseImage}</span>
            ) : null}
          </label>
        </section>

        <section className="admin-course-section demo-video-section" aria-labelledby="demo-video-title">
          <h2 id="demo-video-title">Watch the Demo Video</h2>

          <div className="demo-video-card">
            <div className="demo-video-preview" aria-label="Demo video thumbnail preview">
              {form.demoVideoThumbnail ? (
                <img src={form.demoVideoThumbnail} alt="Selected demo video thumbnail preview" />
              ) : (
                <div className="demo-video-empty">
                  <span className="demo-play-indicator" aria-hidden="true" />
                  <span>Demo video thumbnail</span>
                </div>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-sm demo-watch-button" onClick={openDemoVideo}>
              Watch Now
            </button>
          </div>

          <label className={`thumbnail-upload-control${fieldErrors.demoVideoThumbnail ? ' upload-error' : ''}`}>
            <span>Upload Thumbnail</span>
            <input type="file" accept="image/*" onChange={updateImageField('demoVideoThumbnail')} />
            {fieldErrors.demoVideoThumbnail ? (
              <span className="field-error-text">{fieldErrors.demoVideoThumbnail}</span>
            ) : null}
          </label>

          <Input
            label="Demo Video URL"
            value={form.demoVideoUrl}
            onChange={updateField('demoVideoUrl')}
            placeholder="Paste YouTube / Google Drive / Video URL"
            error={fieldErrors.demoVideoUrl}
            required
          />
        </section>

        <div className="admin-course-form-grid">
          <Input
            label="Duration"
            type="number"
            min="0"
            step="1"
            value={form.duration}
            onChange={updateField('duration')}
            placeholder="Hours"
            error={fieldErrors.duration}
            required
          />
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={updateField('price')}
            placeholder="INR"
            error={fieldErrors.price}
            required
          />
        </div>

        <div className="admin-course-actions">
          <Link to={courseSlug ? `/courses/${courseSlug}` : '/admin/courses'} className="btn btn-outline">
            Cancel
          </Link>
          <Button type="submit" loading={saving} disabled={saving}>
            {saving ? 'Updating...' : 'Update Course'}
          </Button>
        </div>
      </form>
    </div>
  );
}
