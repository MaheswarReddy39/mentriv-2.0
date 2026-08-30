import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { activateAccount } from '../../services/auth.service.js';

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token') || '';

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const validate = () => {
    const errors = {};
    if (!token) errors.general = 'Activation token is missing.';
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
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
      await activateAccount({ token, password: form.password });
      setSuccess(true);
      setForm({ password: '', confirmPassword: '' });
      setFieldErrors({});
    } catch (err) {
      setApiError(err.message || 'Account activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fade-in" style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Account activated
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
          Your password is set. You can now log in to Mentriv.
        </p>
        <Link to="/login" style={{ color: 'var(--indigo)', fontWeight: 600 }}>
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        Activate Account
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Set your password to finish account activation.
      </p>

      {fieldErrors.general || apiError ? (
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
          {fieldErrors.general || apiError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Password"
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
          Activate Account
        </Button>
      </form>
    </div>
  );
}
