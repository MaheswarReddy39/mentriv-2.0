import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../../services/auth.service.js';
import Button from '../../components/common/Button.jsx';
import AuthField from '../../components/auth/AuthField.jsx';
import AuthSelect from '../../components/auth/AuthSelect.jsx';
import Modal from '../../components/common/Modal.jsx';
import { listPublishedCourses } from '../../services/course.service.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  courseId: '',
  password: '',
  confirmPassword: '',
};

const FIELD_ORDER = ['name', 'phone', 'email', 'courseId', 'password', 'confirmPassword'];

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState(false);
  const [courseAttempt, setCourseAttempt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);

  const headingRef = useRef(null);
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const courseRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const alertRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoadingCourses(true);
      setCoursesError(false);
      try {
        const response = await listPublishedCourses({ limit: 50 });
        if (!cancelled) setCourses(response.data.courses || []);
      } catch {
        if (!cancelled) {
          setCourses([]);
          setCoursesError(true);
        }
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    }

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [courseAttempt]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = submitted
      ? 'Registration received · Mentriv'
      : step === 2
        ? 'Review registration · Mentriv'
        : 'Create account · Mentriv';
    return () => {
      document.title = previousTitle;
    };
  }, [submitted, step]);

  useEffect(() => {
    if (window.matchMedia('(min-width: 901px)').matches) {
      nameRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (apiError) alertRef.current?.focus();
  }, [apiError]);

  useEffect(() => {
    if (submitted) statusRef.current?.focus();
  }, [submitted]);

  useEffect(() => {
    if (step === 2) headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!focusRequest) return undefined;

    const refs = {
      name: nameRef,
      phone: phoneRef,
      email: emailRef,
      courseId: courseRef,
      password: passwordRef,
      confirmPassword: confirmRef,
    };
    const target = refs[focusRequest.field];
    const timer = window.setTimeout(() => target?.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [focusRequest]);

  const set = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Enter your full name.';
    if (!form.phone.trim()) errors.phone = 'Enter your mobile number.';
    if (!form.email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'That email doesn’t look right.';
    }
    if (!form.courseId) errors.courseId = 'Choose a course to continue.';
    if (!form.password) errors.password = 'Create a password.';
    else if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
    if (!form.confirmPassword) errors.confirmPassword = 'Confirm your password.';
    else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Those passwords don’t match.';
    }
    return errors;
  };

  const focusFirstError = (errors) => {
    const field = FIELD_ORDER.find((key) => errors[key]);
    if (field) setFocusRequest({ field });
  };

  const handleContinue = (event) => {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    setApiError(null);
    setStep(2);
  };

  const editDetails = () => {
    setStep(1);
    setFocusRequest({ field: 'name' });
  };

  const openConfirmModal = () => {
    setApiError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStep(1);
      focusFirstError(errors);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    setShowConfirmModal(false);
    setApiError(null);
    setSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        courseId: form.courseId,
        password: form.password,
      });
      setSubmitted({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      });
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setStep(1);
    } catch (err) {
      if (err?.statusCode === 409) {
        setStep(1);
        setApiError({
          title: 'This email is already registered.',
          text: 'Log in with this email instead, or use a different email address.',
          action: 'login',
        });
      } else if (err?.details && Array.isArray(err.details)) {
        const nextErrors = {};
        const knownFields = new Set(FIELD_ORDER);
        let generalMessage = null;

        err.details.forEach((detail) => {
          const rawField = detail.field || detail.path || '';
          const field = String(rawField).split('.').pop();
          const message = detail.msg || detail.message;

          if (knownFields.has(field) && message) {
            nextErrors[field] = message;
          } else if (message && !generalMessage) {
            generalMessage = message;
          }
        });

        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          setStep(1);
          focusFirstError(nextErrors);
        }

        if (generalMessage) {
          setApiError({
            title: 'Check your details.',
            text: generalMessage,
            action: 'retry',
          });
        }
      } else if (err?.statusCode) {
        setApiError({
          title: 'We couldn’t submit your registration.',
          text: err.message || 'Something went wrong. Please try again.',
          action: 'retry',
        });
      } else {
        setApiError({
          title: 'We can’t reach Mentriv right now.',
          text: 'The server may be waking up. Check your connection and try again. Your details are still here.',
          action: 'retry',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    setSubmitted(null);
    setStep(1);
    setFieldErrors({});
    setApiError(null);
    setShowConfirmModal(false);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFocusRequest({ field: 'name' });
  };

  const retryCourses = () => setCourseAttempt((count) => count + 1);

  const selectedCourse = courses.find(
    (course) => String(course.id) === String(form.courseId)
  );

  if (submitted) {
    const firstName = submitted.name.split(/\s+/)[0];
    return (
      <div className="login-status" ref={statusRef} tabIndex={-1}>
        <div className="login-status-icon is-sent">
          <CheckCircleIcon size={21} />
        </div>
        <h1 className="login-status-title" id="login-title">
          Registration received.
        </h1>
        <p className="login-status-text">
          Thanks{firstName ? `, ${firstName}` : ''}. Your application is in review, and
          we’ve sent a confirmation to:
        </p>
        <p className="login-status-email">
          <MailIcon size={14} />
          <span>{submitted.email}</span>
        </p>

        <ol className="login-timeline" aria-label="Registration progress">
          <li className="login-timeline-step is-done">
            <span className="login-timeline-dot">
              <CheckIcon size={11} />
            </span>
            <div className="login-timeline-copy">
              <p className="login-timeline-title">Registration received</p>
              <p className="login-timeline-desc">We have your details and course choice.</p>
            </div>
          </li>
          <li className="login-timeline-step is-current">
            <span className="login-timeline-dot">
              <ClockIcon size={11} />
            </span>
            <div className="login-timeline-copy">
              <p className="login-timeline-title">
                Admin review
                <span className="login-timeline-pill">In review</span>
              </p>
              <p className="login-timeline-desc">
                We’re checking your registration.
              </p>
            </div>
          </li>
          <li className="login-timeline-step">
            <span className="login-timeline-dot" aria-hidden="true" />
            <div className="login-timeline-copy">
              <p className="login-timeline-title">Account approved</p>
              <p className="login-timeline-desc">
                We’ll email you when you can log in.
              </p>
            </div>
          </li>
        </ol>

        <div className="login-status-actions">
          <Link to="/login" className="btn btn-primary btn-md login-submit">
            Back to log in
          </Link>
          <div className="login-status-links">
            <button
              type="button"
              className="login-status-link as-button"
              onClick={resetForAnother}
            >
              Register another student
            </button>
          </div>
        </div>
      </div>
    );
  }

  const errorAlert = apiError ? (
    <div className="login-alert" role="alert" tabIndex={-1} ref={alertRef}>
      <span className="login-alert-icon">
        <AlertCircleIcon size={18} />
      </span>
      <div className="login-alert-body">
        <p className="login-alert-title">{apiError.title}</p>
        <p className="login-alert-text">{apiError.text}</p>
        {apiError.action === 'login' ? (
          <Link to="/login" className="login-alert-action">
            Log in instead
          </Link>
        ) : null}
        {apiError.action === 'retry' ? (
          <button type="button" className="login-alert-action" onClick={openConfirmModal}>
            Try again
          </button>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      {step === 1 ? (
        <>
          <div className="login-card-head">
            <h1 className="login-card-title" id="login-title" tabIndex={-1}>
              Create your account
            </h1>
            <p className="login-card-sub">
              Register as a student. An admin reviews your account before you can log in.
            </p>
          </div>

          {errorAlert}

          <form className="login-form" onSubmit={handleContinue} noValidate>
            <div className="login-form-row">
              <AuthField
                id="register-name"
                name="name"
                label="Full name"
                autoComplete="name"
                placeholder="Your full name"
                value={form.name}
                onChange={set('name')}
                error={fieldErrors.name}
                inputRef={nameRef}
                enterKeyHint="next"
              />
              <AuthField
                id="register-phone"
                name="phone"
                label="Mobile number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Your mobile number"
                value={form.phone}
                onChange={set('phone')}
                error={fieldErrors.phone}
                inputRef={phoneRef}
                enterKeyHint="next"
              />
            </div>

            <AuthField
              id="register-email"
              name="email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email}
              inputRef={emailRef}
              enterKeyHint="next"
            />

            <div className="login-field-stack">
              <AuthSelect
                id="register-course"
                name="courseId"
                label="Course"
                value={form.courseId}
                onChange={set('courseId')}
                disabled={loadingCourses || courses.length === 0}
                error={fieldErrors.courseId}
                selectRef={courseRef}
              >
                <option value="">
                  {loadingCourses ? 'Loading courses…' : 'Select a course'}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </AuthSelect>

              {coursesError ? (
                <p className="login-course-note" role="status">
                  <span>Couldn’t load courses.</span>
                  <button type="button" className="login-inline-link" onClick={retryCourses}>
                    Try again
                  </button>
                </p>
              ) : !loadingCourses && courses.length === 0 ? (
                <p className="login-course-note" role="status">
                  <span>No courses are open right now.</span>
                  <button type="button" className="login-inline-link" onClick={retryCourses}>
                    Refresh
                  </button>
                </p>
              ) : null}
            </div>

            <div className="login-form-row">
              <AuthField
                id="register-password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set('password')}
                error={fieldErrors.password}
                inputRef={passwordRef}
                enterKeyHint="next"
                endAdornment={
                  <button
                    type="button"
                    className="login-input-action"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
                  </button>
                }
              />
              <AuthField
                id="register-confirm-password"
                name="confirmPassword"
                label="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={fieldErrors.confirmPassword}
                inputRef={confirmRef}
                enterKeyHint="done"
                endAdornment={
                  <button
                    type="button"
                    className="login-input-action"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon size={19} />
                    ) : (
                      <EyeIcon size={19} />
                    )}
                  </button>
                }
              />
            </div>

            <Button type="submit" className="login-submit">
              Continue to review
            </Button>
          </form>

          <div className="login-card-foot">
            <p>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="login-card-head">
            <h1 className="login-card-title" id="login-title" tabIndex={-1} ref={headingRef}>
              Review your registration
            </h1>
            <p className="login-card-sub">
              Your registration is free. Check your details, then submit them for admin
              approval.
            </p>
          </div>

          {errorAlert}

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              openConfirmModal();
            }}
            noValidate
          >
            <dl className="login-review">
              <div className="login-review-head">
                <p>Your details</p>
                <button type="button" className="login-review-edit" onClick={editDetails}>
                  Edit details
                </button>
              </div>
              <div className="login-review-rows">
                <div className="login-review-row">
                  <dt>Student</dt>
                  <dd>{form.name.trim()}</dd>
                </div>
                <div className="login-review-row">
                  <dt>Email</dt>
                  <dd>{form.email.trim()}</dd>
                </div>
                <div className="login-review-row">
                  <dt>Mobile</dt>
                  <dd>{form.phone.trim()}</dd>
                </div>
                <div className="login-review-row">
                  <dt>Course</dt>
                  <dd>{selectedCourse?.title || '—'}</dd>
                </div>
              </div>
            </dl>

            <Button
              type="submit"
              className="login-submit"
              loading={submitting}
              disabled={submitting}
            >
              Submit registration
            </Button>
          </form>

          <div className="login-card-foot">
            <p>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </>
      )}

      <Modal
        open={showConfirmModal}
        onClose={() => {
          if (!submitting) setShowConfirmModal(false);
        }}
        title="Confirm your registration"
        width={480}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
            >
              Go back
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
              Submit registration
            </Button>
          </>
        }
      >
        <p className="login-modal-lead">
          We’ll create your student account and send a confirmation email to{' '}
          <strong>{form.email.trim()}</strong>.
        </p>
        <ul className="login-modal-list">
          <li>An admin reviews every new registration.</li>
          <li>You’ll get another email once your account is approved.</li>
          <li>After approval, you can log in and start learning.</li>
        </ul>
        <p className="login-modal-note">
          If the email doesn’t arrive, check your spam or junk folder.
        </p>
      </Modal>
    </>
  );
}

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

function EyeIcon({ size }) {
  return (
    <Svg size={size}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </Svg>
  );
}

function EyeOffIcon({ size }) {
  return (
    <Svg size={size}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function AlertCircleIcon({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
    </Svg>
  );
}

function CheckCircleIcon({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 12.3l2.6 2.6L16.2 9.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size }) {
  return (
    <Svg size={size}>
      <path
        d="M5.5 12.5l4 4 9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 7.6V12l3 1.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MailIcon({ size }) {
  return (
    <Svg size={size}>
      <rect
        x="2.5"
        y="4.5"
        width="19"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3.5 6.5L12 13L20.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
