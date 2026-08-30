import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/auth.service.js';
import useAuth from '../../hooks/useAuth.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';

export default function LoginPage() {
  const setSession = useAuth().setSession;
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError(null);
  };

  const validate = () => {
    const errors = {};
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address';
    if (!form.password) errors.password = 'Password is required';
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      const res = await login({ email: form.email.trim(), password: form.password });
      const { accessToken, user } = res.data;
      setSession(accessToken, user);

      const redirectPath =
        user.role === 'admin' || user.role === 'superAdmin'
          ? '/admin'
          : user.role === 'teacher'
            ? '/teacher'
            : user.role === 'student'
              ? '/dashboard'
              : '/';

      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('inactive')) {
        setApiError('This account is inactive. Please contact support.');
      } else if (err.statusCode === 403 && err.message.includes('verification')) {
        setApiError('Please verify your email and activate your account before logging in.');
      } else {
        setApiError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        Welcome back
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Log in to continue learning.
      </p>

      {apiError ? (
        <div role="alert" style={{
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
          background: 'rgba(240,82,63,0.08)',
          borderLeft: '3px solid var(--coral-dark)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--coral-dark)',
          fontSize: 'var(--font-size-sm)',
        }} role="alert">
          {apiError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email}
          aria-invalid={Boolean(fieldErrors.email)}
        />

        <div style={{ position: 'relative' }}>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => {
              setForm((f) => ({ ...f, password: e.target.value }));
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: 'absolute',
              right: 'var(--space-3)',
              top: '38px',
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-caption)',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <Link to="/forgot-password" className="text-sm" style={{ color: 'var(--indigo)' }}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={loading} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="text-sm" style={{ marginTop: 'var(--space-5)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link to="/register" style={{ color: 'var(--indigo)', fontWeight: 600 }}>Create one</Link>
      </p>
    </div>
  );
}
