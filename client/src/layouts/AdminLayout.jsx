import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/navigation/AdminSidebar.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import useAuth from '../hooks/useAuth.js';

const LINKS = [
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/teachers', label: 'Teachers' },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/announcements', label: 'Announcements' },
];

export default function AdminLayout() {
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
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: collapsed ? '72px 1fr' : '220px 1fr', minHeight: '100vh', transition: 'grid-template-columns var(--dur-expand, 460ms) var(--ease-expand, cubic-bezier(0.4, 0, 0.2, 1))' }}>
      <AdminSidebar
        links={LINKS}
        collapsed={collapsed && !menuOpen}
        mobileOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onLogout={() => setLogoutOpen(true)}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      />
      <div>
        <header className="admin-topbar">
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
        <main style={{ padding: 'var(--space-5)', maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
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
        title="Log out of Mentriv Admin?"
        message="You'll need to sign in again to manage courses, students, and payments."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        danger
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
