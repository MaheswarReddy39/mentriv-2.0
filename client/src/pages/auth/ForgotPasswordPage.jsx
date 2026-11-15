import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import AuthField from '../../components/auth/AuthField.jsx';
import { forgotPassword } from '../../services/auth.service.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const alertRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Forgot password · Mentriv';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(min-width: 901px)').matches) {
      emailRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (apiError) alertRef.current?.focus();
  }, [apiError]);

  useEffect(() => {
    if (success) statusRef.current?.focus();
  }, [success]);

  const handleChange = (event) => {
    setEmail(event.target.value);
    setFieldError(null);
    setApiError(null);
  };

  const validate = () => {
    const value = email.trim();
    if (!value) return 'Enter your email address.';
    if (!EMAIL_PATTERN.test(value)) return 'That email doesn’t look right.';
    return null;
  };

  const sendReset = async () => {
    if (loading) return;

    setApiError(null);
    const error = validate();
    if (error) {
      setFieldError(error);
      emailRef.current?.focus();
      return;
    }

    const address = email.trim();
    setLoading(true);
    try {
      await forgotPassword(address);
      setSentTo(address);
      setEmail('');
      setFieldError(null);
      setSuccess(true);
    } catch (err) {
      setApiError(
        err?.statusCode
          ? err.message
          : 'The server may be waking up. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendReset();
  };

  const resetToForm = () => {
    setSuccess(false);
    setApiError(null);
    setFieldError(null);
    setEmail(sentTo);
    window.setTimeout(() => emailRef.current?.focus(), 0);
  };

  if (success) {
    return (
      <div className="login-status" ref={statusRef} tabIndex={-1}>
        <div className="login-status-icon is-sent">
          <MailIcon size={21} />
        </div>
        <h1 className="login-status-title" id="login-title">
          Check your inbox.
        </h1>
        <p className="login-status-text">
          If an account exists for this email, we’ve sent a password reset link. Open it
          to choose a new password.
        </p>
        <p className="login-status-email">
          <MailIcon size={14} />
          <span>{sentTo}</span>
        </p>
        <p className="login-status-text">
          Didn’t get it? Check your spam folder, or try a different email address.
        </p>

        <div className="login-status-actions">
          <Link to="/login" className="btn btn-primary btn-md login-submit">
            Back to log in
          </Link>
          <div className="login-status-links">
            <button
              type="button"
              className="login-status-link as-button"
              onClick={resetToForm}
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="login-card-head">
        <h1 className="login-card-title" id="login-title">
          Forgot password?
        </h1>
        <p className="login-card-sub">
          Enter the email you use for Mentriv and we’ll send you a link to reset it.
        </p>
      </div>

      {apiError ? (
        <div className="login-alert" role="alert" tabIndex={-1} ref={alertRef}>
          <span className="login-alert-icon">
            <AlertCircleIcon size={18} />
          </span>
          <div className="login-alert-body">
            <p className="login-alert-title">We couldn’t send the reset link.</p>
            <p className="login-alert-text">{apiError}</p>
            <button type="button" className="login-alert-action" onClick={sendReset}>
              Try again
            </button>
          </div>
        </div>
      ) : null}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="forgot-email"
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={handleChange}
          error={fieldError}
          inputRef={emailRef}
          enterKeyHint="send"
        />

        <Button
          type="submit"
          className="login-submit"
          loading={loading}
          disabled={loading}
        >
          Send reset link
        </Button>
      </form>

      <div className="login-card-foot">
        <p>
          Remember your password? <Link to="/login">Back to log in</Link>
        </p>
      </div>
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

function AlertCircleIcon({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
    </Svg>
  );
}
