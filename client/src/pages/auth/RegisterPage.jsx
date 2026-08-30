import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../../services/auth.service.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import { listPublishedCourses } from '../../services/course.service.js';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    courseId: '',
    password: '',
    confirmPassword: '',
  });
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoadingCourses(true);
      try {
        const response = await listPublishedCourses({ limit: 50 });
        if (!cancelled) setCourses(response.data.courses || []);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    }

    loadCourses();
    return () => { cancelled = true; };
  }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError(null);
    setSuccessMessage(null);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Student Name is required';
    if (!form.phone.trim()) errors.phone = 'Student Mobile Number is required';
    if (!form.email.trim()) errors.email = 'Email ID is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address';
    if (!form.courseId) errors.courseId = 'Select Course is required';
    if (!form.password) errors.password = 'Create Password is required';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) errors.confirmPassword = 'Confirm Password is required';
    else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleContinue = (event) => {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    setApiError(null);
    setSuccessMessage(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        courseId: form.courseId,
        password: form.password,
      });
      setSuccessMessage('Registration submitted successfully. Admin approval is required before login.');
      setForm({
        name: '',
        phone: '',
        email: '',
        courseId: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      if (err.statusCode === 409) {
        setApiError('An account with this email already exists.');
      } else if (err.details && Array.isArray(err.details)) {
        const nextErrors = {};
        err.details.forEach((detail) => {
          nextErrors[detail.field || detail.path || 'general'] = detail.msg || detail.message;
        });
        setFieldErrors(nextErrors);
        setStep(1);
      } else {
        setApiError(err.message || 'Registration failed. Please try again.');
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
        Student Registration
      </p>

      {successMessage ? (
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
          {successMessage}
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

      {step === 1 ? (
        <form className="teacher-registration-form" onSubmit={handleContinue} noValidate>
          <div className="teacher-registration-grid">
            <Input
              label="Student Name"
              autoComplete="name"
              placeholder="Enter student name"
              value={form.name}
              onChange={set('name')}
              error={fieldErrors.name}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            <Input
              label="Student Mobile Number"
              type="tel"
              autoComplete="tel"
              placeholder="Enter mobile number"
              value={form.phone}
              onChange={set('phone')}
              error={fieldErrors.phone}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <Input
              label="Student Email ID"
              type="email"
              autoComplete="email"
              placeholder="student@example.com"
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <Select
              label="Select Course"
              value={form.courseId}
              onChange={set('courseId')}
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
              onChange={set('password')}
              error={fieldErrors.password}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={fieldErrors.confirmPassword}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
            />
          </div>

          <Button type="submit" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            Continue
          </Button>
        </form>
      ) : (
        <section className="student-payment-panel" aria-labelledby="student-payment-heading">
          <h1
            id="student-payment-heading"
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-6)' }}
          >
            Payment / Scan
          </h1>
          <div className="student-qr-placeholder" aria-label="QR scanner placeholder">
            <span />
          </div>
          <p>Scan & Pay</p>
          <Button
            type="button"
            loading={submitting}
            disabled={submitting}
            style={{ width: '100%', marginTop: 'var(--space-5)' }}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </section>
      )}

      <p className="text-sm" style={{ marginTop: 'var(--space-5)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Log in</Link>
      </p>
    </div>
  );
}
