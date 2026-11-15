import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { login, resendActivationEmail } from '../../services/auth.service.js';
import useAuth from '../../hooks/useAuth.js';
import Button from '../../components/common/Button.jsx';
import AuthField from '../../components/auth/AuthField.jsx';
import { supportMailto } from '../../constants/contact.js';

const homeForRole = (role) => {
  if (role === 'admin' || role === 'superAdmin') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'student') return '/dashboard';
  return '/';
};

const STATUS_COPY = {
  pending: {
    icon: 'clock',
    title: 'You’re almost in.',
    text: 'Your registration is waiting for admin approval. We’ll email you as soon as your account is reviewed.',
  },
  rejected: {
    icon: 'alert',
    title: 'This account wasn’t approved.',
    text: 'Your registration was reviewed but not approved. Contact support and we’ll help you understand the next step.',
  },
  unverified: {
    icon: 'mail',
    title: 'Verify your email first.',
    text: 'Check your inbox and spam folder for the activation link, then come back to log in.',
  },
  inactive: {
    icon: 'lock',
    title: 'This account is inactive.',
    text: 'Your account is currently paused. Contact support and we’ll help you restore access.',
  },
};

export default function LoginPage() {
  const { setSession, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [resetNotice, setResetNotice] = useState(resetSuccess);
  const [resend, setResend] = useState({ state: 'idle', cooldown: 0, message: '' });
  const [announcement, setAnnouncement] = useState('');

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const alertRef = useRef(null);
  const statusRef = useRef(null);

  const from = location.state?.from;
  const roleHome = homeForRole(role);
  const canReturnToFrom =
    typeof from === 'string' &&
    from !== '/login' &&
    ((role === 'student' && !from.startsWith('/teacher') && !from.startsWith('/admin')) ||
      (role === 'teacher' && from.startsWith('/teacher')) ||
      ((role === 'admin' || role === 'superAdmin') && from.startsWith('/admin')));
  const redirectTo = canReturnToFrom ? from : roleHome;

  useEffect(() => {
    if (resetSuccess) setResetNotice(true);
  }, [resetSuccess]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Log in · Mentriv';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    if (window.matchMedia('(min-width: 901px)').matches) {
      emailRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!alert) return;
    if (alert.focus === 'password') {
      passwordRef.current?.focus();
    } else {
      alertRef.current?.focus();
    }
  }, [alert]);

  useEffect(() => {
    if (blocked) statusRef.current?.focus();
  }, [blocked]);

  useEffect(() => {
    if (resend.cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResend((current) => ({
        ...current,
        cooldown: Math.max(0, current.cooldown - 1),
      }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resend.cooldown]);

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setAlert(null);
    setAnnouncement('');
    if (resetNotice) setResetNotice(false);
  };

  const validate = () => {
    const errors = {};
    const email = form.email.trim();
    if (!email) {
      errors.email = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'That email doesn’t look right.';
    }
    if (!form.password) {
      errors.password = 'Enter your password.';
    }
    return errors;
  };

  const handleEmailBlur = () => {
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors((current) => ({
        ...current,
        email: 'That email doesn’t look right.',
      }));
    }
  };

  const handleEmailKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const handlePasswordKey = (event) => {
    if (typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  };

  const handleLoginError = (err) => {
    const status = err?.statusCode;
    const message = err?.message || '';
    const lower = message.toLowerCase();

    if (!status) {
      setAlert({
        kind: 'error',
        title: 'We can’t reach Mentriv right now.',
        text: 'The server may be waking up. Check your connection and try again.',
        action: 'retry',
        focus: 'alert',
      });
      return;
    }

    if (status === 401) {
      setForm((current) => ({ ...current, password: '' }));
      setAlert({
        kind: 'error',
        title: 'Email or password is incorrect.',
        text: 'Check your details and try again.',
        action: 'forgot',
        focus: 'password',
      });
      setAnnouncement('Email or password is incorrect.');
      return;
    }

    if (status === 403) {
      setForm((current) => ({ ...current, password: '' }));
      if (lower.includes('pending')) {
        setBlocked({ kind: 'pending', email: form.email.trim() });
        return;
      }
      if (lower.includes('rejected')) {
        setBlocked({ kind: 'rejected', email: form.email.trim() });
        return;
      }
      if (lower.includes('verification')) {
        setBlocked({ kind: 'unverified', email: form.email.trim() });
        return;
      }
      if (lower.includes('inactive')) {
        setBlocked({ kind: 'inactive', email: form.email.trim() });
        return;
      }
    }

    if (status === 429) {
      setAlert({
        kind: 'error',
        title: 'Too many attempts.',
        text: 'Wait a minute, then try again.',
        focus: 'alert',
      });
      return;
    }

    if (status >= 500) {
      setAlert({
        kind: 'error',
        title: 'Something went wrong on our side.',
        text: 'Try again in a moment.',
        action: 'retry',
        focus: 'alert',
      });
      return;
    }

    setAlert({
      kind: 'error',
      title: 'We can’t sign you in yet.',
      text: message || 'Try again in a moment.',
      focus: 'alert',
    });
  };

  const submitLogin = async () => {
    if (loading) return;

    setAlert(null);
    setAnnouncement('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      setAnnouncement('Please fix the highlighted fields.');
      return;
    }

    if (!online) {
      setAlert({
        kind: 'error',
        title: 'You’re offline.',
        text: 'Reconnect to the internet and try again.',
        focus: 'alert',
      });
      return;
    }

    setLoading(true);
    setAnnouncement('Logging in…');

    try {
      const res = await login({ email: form.email.trim(), password: form.password });
      const accessToken = res?.data?.accessToken;
      const user = res?.data?.user;

      if (!accessToken || !user) {
        setAlert({
          kind: 'error',
          title: 'Something went wrong on our side.',
          text: 'Try again in a moment.',
          action: 'retry',
          focus: 'alert',
        });
        return;
      }

      setSession(accessToken, user);
    } catch (err) {
      handleLoginError(err);
    } finally {
      setLoading(false);
      setAnnouncement('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitLogin();
  };

  const handleResend = async () => {
    if (!blocked?.email || resend.state === 'loading' || resend.cooldown > 0) return;

    setResend({ state: 'loading', cooldown: 0, message: '' });
    try {
      await resendActivationEmail(blocked.email);
      setResend({
        state: 'sent',
        cooldown: 60,
        message: 'Activation email sent. Check your inbox.',
      });
      setAnnouncement('Activation email sent. Check your inbox.');
    } catch (err) {
      setResend({
        state: 'error',
        cooldown: 0,
        message: err?.message || 'We couldn’t send that email. Try again or contact support.',
      });
      setAnnouncement('We couldn’t send the activation email.');
    }
  };

  const resetToForm = () => {
    setBlocked(null);
    setAlert(null);
    setFieldErrors({});
    setForm({ email: '', password: '' });
    setResend({ state: 'idle', cooldown: 0, message: '' });
    setAnnouncement('');
    window.setTimeout(() => emailRef.current?.focus(), 0);
  };

  if (blocked) {
    const copy = STATUS_COPY[blocked.kind];
    const StatusIcon =
      copy.icon === 'clock'
        ? ClockIcon
        : copy.icon === 'mail'
          ? MailIcon
          : copy.icon === 'lock'
            ? LockIcon
            : AlertCircleIcon;
    const canResend = blocked.kind === 'unverified';
    const resendLabel =
      resend.state === 'loading'
        ? 'Sending…'
        : resend.cooldown > 0
          ? `Email sent · ${resend.cooldown}s`
          : resend.state === 'sent'
            ? 'Email sent'
            : resend.state === 'error'
              ? 'Try sending again'
              : 'Resend activation email';

    return (
      <div className="login-status" ref={statusRef} tabIndex={-1}>
        <div className={`login-status-icon is-${blocked.kind}`}>
          <StatusIcon size={21} />
        </div>
        <h1 className="login-status-title" id="login-title">
          {copy.title}
        </h1>
        <p className="login-status-text">{copy.text}</p>
        <p className="login-status-email">
          <MailIcon size={14} />
          <span>{blocked.email}</span>
        </p>

        {blocked.kind === 'pending' ? (
          <ol className="login-timeline" aria-label="Account approval progress">
            <li className="login-timeline-step is-done">
              <span className="login-timeline-dot">
                <CheckIcon size={11} />
              </span>
              <div className="login-timeline-copy">
                <p className="login-timeline-title">Registration received</p>
                <p className="login-timeline-desc">Your details reached our team.</p>
              </div>
            </li>
            <li className="login-timeline-step is-current">
              <span className="login-timeline-dot">
                <ClockIcon size={11} />
              </span>
              <div className="login-timeline-copy">
                <p className="login-timeline-title">
                  Under review
                  <span className="login-timeline-pill">In review</span>
                </p>
                <p className="login-timeline-desc">
                  We’re checking your registration and payment.
                </p>
              </div>
            </li>
            <li className="login-timeline-step">
              <span className="login-timeline-dot" aria-hidden="true" />
              <div className="login-timeline-copy">
                <p className="login-timeline-title">Access granted</p>
                <p className="login-timeline-desc">
                  You’ll get an email the moment you’re in.
                </p>
              </div>
            </li>
          </ol>
        ) : null}

        <div className="login-status-actions">
          {canResend ? (
            <Button
              variant="secondary"
              className="login-resend"
              onClick={handleResend}
              loading={resend.state === 'loading'}
              disabled={resend.state === 'loading' || resend.cooldown > 0}
            >
              {resend.state !== 'loading' ? <MailIcon size={16} /> : null}
              {resendLabel}
            </Button>
          ) : null}

          <div className="login-status-links">
            <a className="login-status-link" href={supportMailto(blocked.email)}>
              Contact support
            </a>
            <button
              type="button"
              className="login-status-link as-button"
              onClick={resetToForm}
            >
              Use a different account
            </button>
          </div>
        </div>

        {resend.message ? (
          <p
            className={`login-resend-note${resend.state === 'error' ? ' is-error' : ''}`}
            role="status"
          >
            {resend.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="login-card-head">
        <h1 className="login-card-title" id="login-title">
          Welcome back
        </h1>
        <p className="login-card-sub">Log in to continue your course.</p>
      </div>

      {resetNotice && !alert ? (
        <div className="login-alert login-alert-success" role="status">
          <span className="login-alert-icon">
            <CheckCircleIcon size={18} />
          </span>
          <div className="login-alert-body">
            <p className="login-alert-title">Password updated</p>
            <p className="login-alert-text">Log in with your new password.</p>
          </div>
        </div>
      ) : null}

      {alert ? (
        <div
          className="login-alert"
          role="alert"
          tabIndex={-1}
          ref={alertRef}
        >
          <span className="login-alert-icon">
            <AlertCircleIcon size={18} />
          </span>
          <div className="login-alert-body">
            <p className="login-alert-title">{alert.title}</p>
            <p className="login-alert-text">{alert.text}</p>
            {alert.action === 'forgot' ? (
              <Link to="/forgot-password" className="login-alert-action">
                Reset your password
              </Link>
            ) : null}
            {alert.action === 'retry' ? (
              <button type="button" className="login-alert-action" onClick={submitLogin}>
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <form
        className="login-form"
        onSubmit={handleSubmit}
        noValidate
        autoComplete="on"
        aria-busy={loading}
      >
        <AuthField
          id="login-email"
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
          onChange={update('email')}
          onBlur={handleEmailBlur}
          onKeyDown={handleEmailKeyDown}
          error={fieldErrors.email}
          inputRef={emailRef}
          enterKeyHint="next"
          readOnly={loading}
        />

        <AuthField
          id="login-password"
          name="password"
          label="Password"
          action={
            <Link to="/forgot-password" className="login-label-link">
              Forgot password?
            </Link>
          }
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={update('password')}
          onKeyDown={handlePasswordKey}
          onKeyUp={handlePasswordKey}
          onBlur={() => setCapsLock(false)}
          error={fieldErrors.password}
          hint={
            capsLock ? (
              <span className="login-caps">
                <CapsLockIcon size={14} />
                Caps Lock is on
              </span>
            ) : null
          }
          inputRef={passwordRef}
          enterKeyHint="go"
          readOnly={loading}
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

        {!online ? (
          <p className="login-inline-note" role="status">
            <OfflineIcon size={15} />
            You’re offline. Reconnect to log in.
          </p>
        ) : null}

        <Button
          type="submit"
          className="login-submit"
          loading={loading}
          disabled={loading || !online}
          aria-busy={loading}
        >
          Log in
        </Button>

        {slow ? (
          <p className="login-slow" role="status">
            Still connecting — the server may be waking up.
          </p>
        ) : null}
      </form>

      <div className="login-card-foot">
        <p>
          New to Mentriv? <Link to="/register">Create an account</Link>
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
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
        d="m8 12.2 2.6 2.6L16.2 9"
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
        d="m5 12.5 4.2 4.2L19 7"
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
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5V12l3 1.8"
        stroke="currentColor"
        strokeWidth="1.8"
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
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m4.5 7 7.5 5.6L19.5 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockIcon({ size }) {
  return (
    <Svg size={size}>
      <rect
        x="5"
        y="10.5"
        width="14"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.2" r="1.1" fill="currentColor" />
    </Svg>
  );
}

function CapsLockIcon({ size }) {
  return (
    <Svg size={size}>
      <path
        d="M12 4.5 6.5 10h3v3h5v-3h3L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 19.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

function OfflineIcon({ size }) {
  return (
    <Svg size={size}>
      <path
        d="M3.5 8.5a13 13 0 0 1 17 0M6.5 12a8.5 8.5 0 0 1 11 0M9.5 15.3a4 4 0 0 1 5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="18.6" r="1.1" fill="currentColor" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}