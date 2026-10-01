import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import TeacherSidebar from '../components/navigation/TeacherSidebar.jsx';
import useAuth from '../hooks/useAuth.js';

const LINKS = [
  { to: '/teacher/classes', label: 'Classes' },
  { to: '/teacher/assignments', label: 'Assignments' },
  { to: '/teacher/mcqs', label: 'MCQs / Practice' },
  { to: '/teacher/submissions', label: 'Submissions' },
  { to: '/teacher/leaderboard', label: 'Leaderboard' },
  { to: '/teacher/notifications', label: 'Notifications' },
  { to: '/teacher/profile', label: 'Profile' },
];

export default function TeacherLayout() {
  const setSession = useAuth().setSession;
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = () => {
    setSession(null);
    navigate('/login');
  };

  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: collapsed ? '72px 1fr' : '220px 1fr', minHeight: '100vh', transition: 'grid-template-columns var(--transition-normal, 250ms ease)' }}>
      <TeacherSidebar links={LINKS} collapsed={collapsed} 
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
          <span aria-hidden="true" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </header>
        <main style={{ padding: 'var(--space-5)', maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
