import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/navigation/StudentSidebar.jsx';
import useAuth from '../hooks/useAuth.js';
import { getUnreadCount } from '../services/notification.service.js';

const LINKS = [
  { to: '/classes', label: 'Classes' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/notifications', label: 'Notifications', badge: true },
  { to: '/profile', label: 'Profile' },
];

export default function StudentLayout() {
  const setSession = useAuth().setSession;
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

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
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <StudentSidebar links={LINKS} unreadCount={unreadCount} />
      <div>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <span className="text-caption">Signed in</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </header>
        <main style={{ padding: 'var(--space-5)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
