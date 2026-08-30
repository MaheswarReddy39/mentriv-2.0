import { Link, NavLink } from 'react-router-dom';

export default function StudentSidebar({ links, unreadCount = 0 }) {
  return (
    <aside className="sidebar" aria-label="Student navigation">
      <Link to="/dashboard" className="sidebar-brand">
        Mentriv
      </Link>
      {(links || []).map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/dashboard'}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          {link.label}
          {link.badge && unreadCount > 0 ? (
            <span className="nav-badge">{unreadCount}</span>
          ) : null}
        </NavLink>
      ))}
    </aside>
  );
}
