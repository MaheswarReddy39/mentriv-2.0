import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { resetPassword } from '../../services/auth.service.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token') || '';

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const validate = () => {
    const errors = {};
    if (!token) errors.general = 'Reset token is missing. Please use the link from your email.';
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (form.password.length > 72) {
      errors.password = 'Password cannot exceed 72 characters';
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, password: form.password });
      navigate('/login?reset=success', { replace: true });
    } catch (err) {
      setApiError(err.message || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="fade-in" style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Invalid reset link
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
          This password reset link is invalid or missing a token.
        </p>
        <Link to="/forgot-password" style={{ color: 'var(--indigo)', fontWeight: 600 }}>
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        Reset Password
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Enter your new password below.
      </p>

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

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={setField('password')}
          error={fieldErrors.password}
          hint="Minimum 8 characters"
          aria-invalid={Boolean(fieldErrors.password)}
        />
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={setField('confirmPassword')}
          error={fieldErrors.confirmPassword}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
        />

        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          style={{ width: '100%', marginTop: 'var(--space-2)' }}
        >
          Reset Password
        </Button>
      </form>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-5)', textAlign: 'center' }}>
        <Link to="/login" style={{ fontWeight: 600 }}>Back to Login</Link>
      </p>
    </div>
  );
}
