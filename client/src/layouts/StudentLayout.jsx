import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/navigation/StudentSidebar.jsx';
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
  { to: '/announcements', label: 'Announcements' },
  { to: '/profile', label: 'Profile' },
];

export default function StudentLayout() {
  const setSession = useAuth().setSession;
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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
        onLogout={handleLogout}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      />
      <div>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              className="mobile-menu-btn"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMenuOpen((current) => !current)}
            >
              ☰
            </button>
            <span className="text-caption">Signed in</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </header>
        <main style={{ padding: 'var(--space-5)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
      <div
        className={`mobile-sidebar-overlay${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
}