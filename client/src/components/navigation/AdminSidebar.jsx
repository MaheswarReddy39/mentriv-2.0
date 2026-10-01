import { Link, NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

const ICONS = {
  '/admin/courses': (
    <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  '/admin/students': (
    <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  '/admin/teachers': (
    <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  '/admin/submissions': (
    <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  '/admin/notifications': (
    <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  '/admin/announcements': (
    <svg className="sidebar-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

export default function AdminSidebar({ links, collapsed = false, mobileOpen = false, onNavigate, onMouseEnter, onMouseLeave }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' open' : ''}`} aria-label="Admin navigation" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <Link to="/admin" className="sidebar-brand" onClick={onNavigate}>
        <span className="sidebar-brand-icon">A</span>
        <span className="sidebar-brand-text">Mentriv Admin</span>
      </Link>
      <nav className="sidebar-nav" aria-label="Admin sections">
        {(links || []).map((link) => {
          const Icon = ICONS[link.to];
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onNavigate}
            >
              {Icon}
              <span className="sidebar-link-label">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <ThemeToggle collapsed={collapsed} />
    </aside>
  );
}
