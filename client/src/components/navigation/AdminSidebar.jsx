import { NavLink } from 'react-router-dom';

export default function AdminSidebar({ links }) {
  return (
    <aside className="sidebar" aria-label="Admin navigation">
      <div className="sidebar-brand" aria-label="Mentriv Admin">
        Mentriv Admin
      </div>
      <nav className="sidebar-nav" aria-label="Admin sections">
        {(links || []).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
