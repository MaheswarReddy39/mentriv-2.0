import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import AppSidebar from '../components/navigation/AppSidebar.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import useAuth from '../hooks/useAuth.js';
import { getUnreadCount } from '../services/notification.service.js';

export default function StudentLayout() {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
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
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

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
    <div className="app-shell" data-rail={expanded ? 'expanded' : 'collapsed'}>
      <AppSidebar
        role="student"
        user={user}
        unreadCount={unreadCount}
        expanded={expanded}
        onExpandedChange={setExpanded}
        mobileOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onLogout={() => setLogoutOpen(true)}
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
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
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