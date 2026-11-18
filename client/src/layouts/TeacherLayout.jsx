import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TeacherSidebar from '../components/navigation/TeacherSidebar.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import useAuth from '../hooks/useAuth.js';

const LINKS = [
  { to: '/teacher', label: 'Dashboard' },
  { to: '/teacher/classes', label: 'Classes' },
  { to: '/teacher/assignments', label: 'Assignments' },
  { to: '/teacher/mcqs', label: 'MCQs / Practice' },
  { to: '/teacher/coding-practice', label: 'Coding Practice' },
  { to: '/teacher/submissions', label: 'Submissions' },
  { to: '/teacher/leaderboard', label: 'Leaderboard' },
  { to: '/teacher/notifications', label: 'Notifications' },
  { to: '/teacher/profile', label: 'Profile' },
];

export default function TeacherLayout() {
  const setSession = useAuth().setSession;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Close the mobile drawer on navigation and when resizing back to desktop.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    setSession(null);
    navigate('/login');
  };

  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: collapsed ? '72px 1fr' : '220px 1fr', minHeight: '100vh', transition: 'grid-template-columns var(--transition-normal, 250ms ease)' }}>
      <TeacherSidebar
        links={LINKS}
        collapsed={collapsed && !menuOpen}
        mobileOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onLogout={() => setLogoutOpen(true)}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      />
      <div>
        <header className="student-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            ☰
          </button>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <div
        className={`mobile-sidebar-overlay${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <ConfirmDialog
        open={logoutOpen}
        title="Log out of Mentriv?"
        message="You'll need to sign in again to get back to your classes, assignments, and submissions."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        danger
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
