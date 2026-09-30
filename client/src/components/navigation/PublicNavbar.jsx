import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/announcements', label: 'Announcements' },
];

export default function PublicNavbar({ actions }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) setOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <nav
      className={`navbar${open ? ' open' : ''}${isHomePage ? ' homepage-navbar' : ''}`}
      aria-label="Main navigation"
    >
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          Men<span className="grad-text">triv</span>
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-expanded={open}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setOpen((current) => !current)}
        >
          ☰
        </button>

        <div className="navbar-menu">
          <div className="navbar-links">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-actions">
            <Link to="/login" className="btn btn-ghost btn-sm" onClick={closeMenu}>
              Log in
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>
              Get started
            </Link>
            {actions || null}
          </div>
        </div>
      </div>

      {open && (
        <div className="navbar-overlay" onClick={closeMenu} />
      )}
    </nav>
  );
}
