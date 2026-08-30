import { NavLink } from 'react-router-dom';

export default function TeacherSidebar({ links }) {
  return (
    <aside className="sidebar" aria-label="Teacher navigation">
      <div className="sidebar-brand" aria-label="Mentriv Teacher">
        Mentriv Teacher
      </div>
      <nav className="sidebar-nav" aria-label="Teacher sections">
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
