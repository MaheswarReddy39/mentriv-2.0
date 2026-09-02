import { useEffect, useState } from 'react';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Input from '../../components/common/Input.jsx';
import Modal from '../../components/common/Modal.jsx';
import Select from '../../components/common/Select.jsx';
import { registerTeacher } from '../../services/auth.service.js';
import { listPublishedCourses } from '../../services/course.service.js';

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  courseId: '',
  password: '',
  confirmPassword: '',
};

export default function TeacherRegistrationPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [courseError, setCourseError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadCourses = async () => {
    setLoadingCourses(true);
    setCourseError(null);
    try {
      const response = await listPublishedCourses({ limit: 50 });
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
    setApiError(null);
    setSubmitted(false);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Teacher Name is required';
    if (!form.phone.trim()) errors.phone = 'Teacher Phone Number is required';
    if (!form.email.trim()) {
      errors.email = 'Teacher Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!form.courseId) errors.courseId = 'Select Course is required';
    if (!form.password) {
      errors.password = 'Create Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required';
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const openConfirmModal = (event) => {
    event.preventDefault();
    setApiError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      await registerTeacher({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        courseId: form.courseId,
        password: form.password,
      });
      setSubmitted(true);
      setForm(INITIAL_FORM);
      setFieldErrors({});
    } catch (err) {
      if (err.statusCode === 409) {
        setApiError('An account with this email already exists.');
      } else if (err.details && Array.isArray(err.details)) {
        const nextErrors = {};
        err.details.forEach((detail) => {
          nextErrors[detail.field || detail.path || 'general'] = detail.msg || detail.message;
        });
        setFieldErrors(nextErrors);
      } else {
        setApiError(err.message || 'Teacher registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        Registration
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Teacher Registration
      </p>

      {submitted ? (
        <div
          role="status"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            background: 'rgba(45, 177, 124, 0.1)',
            borderLeft: '3px solid var(--teal)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--teal-dark)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Registration submitted successfully. Admin approval is required before login.
        </div>
      ) : null}

      {apiError ? (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            background: 'rgba(240,82,63,0.08)',
            borderLeft: '3px solid var(--coral-dark)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--coral-dark)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {apiError}
        </div>
      ) : null}

      {courseError ? <ErrorState message={courseError} onRetry={loadCourses} /> : null}

      <form className="teacher-registration-form" onSubmit={openConfirmModal} noValidate>
        <div className="teacher-registration-grid">
          <Input
            label="Teacher Name"
            autoComplete="name"
            placeholder="Enter teacher name"
            value={form.name}
            onChange={setField('name')}
            error={fieldErrors.name}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          <Input
            label="Teacher Mobile Number"
            type="tel"
            autoComplete="tel"
            placeholder="Enter mobile number"
            value={form.phone}
            onChange={setField('phone')}
            error={fieldErrors.phone}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          <Input
            label="Teacher Email ID"
            type="email"
            autoComplete="email"
            placeholder="teacher@example.com"
            value={form.email}
            onChange={setField('email')}
            error={fieldErrors.email}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          <Select
            label="Select Course"
            value={form.courseId}
            onChange={setField('courseId')}
            disabled={loadingCourses}
            error={fieldErrors.courseId}
          >
            <option value="">{loadingCourses ? 'Loading courses...' : 'Select a course'}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
          <Input
            label="Create Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={setField('password')}
            error={fieldErrors.password}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={setField('confirmPassword')}
            error={fieldErrors.confirmPassword}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
          />
        </div>

        <Button
          type="submit"
          loading={submitting}
          disabled={submitting}
          style={{ width: '100%', marginTop: 'var(--space-2)' }}
        >
          Register
        </Button>
      </form>

      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Registration Confirmation"
        width={660}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
              Close
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
              Confirm Registration
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--text)', lineHeight: 1.6 }}>
          Your teacher registration has been received successfully. You will receive a confirmation email shortly.
        </p>
        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--text)', lineHeight: 1.6 }}>
          Please check your Inbox and Spam/Junk folder for the email. You will receive another email once the Admin reviews and approves or rejects your registration.
        </p>
      </Modal>
    </div>
  );
}
