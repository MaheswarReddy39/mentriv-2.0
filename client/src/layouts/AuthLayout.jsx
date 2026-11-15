import { Link, Outlet, useLocation } from 'react-router-dom';
import { supportMailto } from '../constants/contact.js';

const FOCUSED_AUTH_PATHS = new Set(['/login', '/forgot-password', '/register']);

export default function AuthLayout() {
  const { pathname } = useLocation();
  const usesFocusedAuth = FOCUSED_AUTH_PATHS.has(pathname);
  const isRegistration = pathname === '/register';
  const isWideTeacherRegistration = pathname === '/teacher-registration';

  if (usesFocusedAuth) {
    return (
      <main className="login-page">
        <header className="login-topbar">
          <Link to="/" className="login-brand">
            <span className="login-brand-word">Mentriv</span>
          </Link>

          <nav className="login-topbar-links" aria-label="Account help">
            <a href={supportMailto()} className="login-topbar-link">
              Need help?
            </a>
            <span className="login-topbar-sep" aria-hidden="true" />
            <Link to="/" className="login-topbar-link login-topbar-back">
              Back to home
            </Link>
          </nav>
        </header>

        <section className="login-panel" aria-labelledby="login-title">
          <div className={`login-card${isRegistration ? ' login-card-wide' : ''}`}>
            <Outlet />
          </div>
        </section>

        <footer className="login-footer">
          <p>© {new Date().getFullYear()} Mentriv</p>
        </footer>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <div
        className={`auth-default-panel${
          isWideTeacherRegistration ? ' auth-default-panel-wide' : ''
        }`}
      >
        <Outlet />
      </div>
    </main>
  );
}
