import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/announcements', label: 'Announcements' },
];

export default function PublicNavbar({ actions }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

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

        <div className="navbar-links">
          {LINKS.map((link) => (
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
          {isAuthenticated ? (
            <>
              <NavLink
                to="/notifications"
                className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
                onClick={closeMenu}
              >
                Notifications
              </NavLink>
            </>
          ) : null}
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="btn btn-outline btn-sm" onClick={closeMenu}>
                Profile
              </Link>
              <Link to="/courses" className="btn btn-primary btn-sm" onClick={closeMenu}>
                My learning
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm" onClick={closeMenu}>
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>
                Get started
              </Link>
            </>
          )}
          {actions || null}
        </div>
      </div>
    </nav>
  );
}
