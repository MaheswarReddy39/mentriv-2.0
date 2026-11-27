import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import AppSidebar from '../components/navigation/AppSidebar.jsx';
import AccountMenu from '../components/navigation/AccountMenu.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import useAuth from '../hooks/useAuth.js';

export default function AdminLayout() {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleLogout = () => {
    setSession(null);
    navigate('/login');
  };

  return (
    <div className="app-shell" data-rail={expanded ? 'expanded' : 'collapsed'}>
      <AppSidebar
        role="admin"
        user={user}
        expanded={expanded}
        onExpandedChange={setExpanded}
        mobileOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onLogout={() => setLogoutOpen(true)}
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
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <AccountMenu onLogout={() => setLogoutOpen(true)} role="admin" user={user} />
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
