import { Outlet, useLocation } from 'react-router-dom';

export default function AuthLayout() {
  const location = useLocation();
  const isWideRegistration =
    location.pathname === '/teacher-registration' || location.pathname === '/register';

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-surface-muted)',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: isWideRegistration ? 760 : 420,
        padding: 'var(--space-8)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Outlet />
      </div>
    </main>
  );
}
