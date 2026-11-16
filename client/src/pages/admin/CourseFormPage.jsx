import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CourseEditorForm from '../../components/admin/CourseEditorForm.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Loading from '../../components/common/Loading.jsx';
import { getAdminCourseById, updateCourse } from '../../services/course.service.js';

const MAX_IMAGE_BYTES = 1_200_000;

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
      reject(new Error('Choose an image file.'));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Choose an image under 1.2 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () =>
      reject(new Error('That image could not be read. Try another file.'));
    reader.readAsDataURL(file);
  });

const focusFirstInvalidField = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document
        .querySelector('.admin-course-editor [aria-invalid="true"]')
        ?.focus();
    });
  });
};

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

  const setFieldValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const updateField = (field) => (event) =>
    setFieldValue(field, event.target.value);

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

    if (!title) errors.title = 'Enter a course title.';
    else if (title.length > 150) {
      errors.title = 'Keep the title under 150 characters.';
    }

    if (!description) errors.description = 'Add a description.';
    else if (description.length > 5000) {
      errors.description = 'Keep the description under 5,000 characters.';
    }

    if (!form.level) errors.level = 'Choose a level.';
    if (!form.courseImage) errors.courseImage = 'Add a cover image.';
    if (!form.demoVideoThumbnail) {
      errors.demoVideoThumbnail = 'Add a video thumbnail.';
    }

    if (!form.demoVideoUrl.trim()) {
      errors.demoVideoUrl = 'Add a video URL.';
    } else if (!isHttpUrl(form.demoVideoUrl.trim())) {
      errors.demoVideoUrl = 'Enter a valid http or https link.';
    }

    if (form.duration === '') errors.duration = 'Enter the duration.';
    else if (!Number.isInteger(duration) || duration < 0) {
      errors.duration = 'Use a whole number of hours.';
    }

    if (form.price === '') errors.price = 'Enter a price.';
    else if (!Number.isFinite(price) || price < 0) {
      errors.price = 'Use a non-negative amount.';
    }

    return errors;
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      focusFirstInvalidField();
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

      navigate('/admin/courses', {
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
      setApiError(err.message || 'Try again.');
      focusFirstInvalidField();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading course..." />;

  if (apiError && !form.title) {
    return <ErrorState message={apiError} onRetry={() => window.location.reload()} />;
  }

  const backTo = courseSlug ? `/courses/${courseSlug}` : '/admin/courses';

  return (
    <CourseEditorForm
      title="Edit course"
      backTo={backTo}
      backLabel={courseSlug ? 'Course' : 'Courses'}
      cancelTo={backTo}
      submitLabel="Publish changes"
      savingLabel="Saving..."
      publishNote="Goes live in the catalog immediately."
      errorTitle="Could not save course"
      form={form}
      fieldErrors={fieldErrors}
      apiError={apiError}
      saving={saving}
      onChange={updateField}
      onChangeValue={setFieldValue}
      onImageChange={updateImageField}
      onSubmit={handleSubmit}
    />
  );
}
