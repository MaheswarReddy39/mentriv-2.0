import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { forgotPassword } from '../../services/auth.service.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setEmail(event.target.value);
    setFieldError(null);
    setApiError(null);
  };

  const validate = () => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError(null);
    const error = validate();
    if (error) {
      setFieldError(error);
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
      setEmail('');
      setFieldError(null);
    } catch (err) {
      setApiError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fade-in" style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
          Check your email
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
          We sent a password reset link. Check your inbox and follow the instructions.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-5)' }}>
          Didn't receive it? Check your spam folder or try again.
        </p>
        <Link to="/login" style={{ color: 'var(--indigo)', fontWeight: 600 }}>
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
        Forgot Password
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Enter your email and we'll send you a reset link.
      </p>

      {(fieldError || apiError) && (
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
          {fieldError || apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={handleChange}
          error={fieldError}
          aria-invalid={Boolean(fieldError)}
        />

        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          style={{ width: '100%', marginTop: 'var(--space-2)' }}
        >
          Send Reset Link
        </Button>
      </form>

      <p className="text-sm" style={{ color: 'var(--text-tertiary)', marginTop: 'var(--space-5)', textAlign: 'center' }}>
        <Link to="/login" style={{ fontWeight: 600 }}>Back to Login</Link>
      </p>
    </div>
  );
}
