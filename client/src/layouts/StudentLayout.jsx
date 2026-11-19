import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/navigation/StudentSidebar.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import useAuth from '../hooks/useAuth.js';
import { getUnreadCount } from '../services/notification.service.js';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/classes', label: 'Classes' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/mcqs', label: 'MCQs / Practice' },
  { to: '/coding-practice', label: 'Coding Practice' },
  { to: '/progress', label: 'Progress' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/notifications', label: 'Notifications', badge: true },
  { to: '/student/announcements', label: 'Announcements' },
  { to: '/profile', label: 'Profile' },
];

export default function StudentLayout() {
  const setSession = useAuth().setSession;
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    getUnreadCount()
      .then((res) => {
        if (!cancelled) setUnreadCount(res.data.unreadCount);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [location.pathname]);

  // The notifications page marks items read in place; refresh the badge
  // without waiting for the next navigation.
  useEffect(() => {
    const handleInboxChange = () => {
      getUnreadCount()
        .then((res) => setUnreadCount(res.data.unreadCount))
        .catch(() => {});
    };
    window.addEventListener('mentriv:notifications-changed', handleInboxChange);
    return () => window.removeEventListener('mentriv:notifications-changed', handleInboxChange);
  }, []);

  const handleLogout = () => {
    setSession(null);
    navigate('/login');
  };

  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: collapsed ? '72px 1fr' : '220px 1fr', minHeight: '100vh', transition: 'grid-template-columns var(--transition-normal, 250ms ease)' }}>
      <StudentSidebar
        links={LINKS}
        unreadCount={unreadCount}
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
        message="You'll need to sign in again to get back to your classes, assignments, and practice."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        danger
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}