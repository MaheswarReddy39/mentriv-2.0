import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/announcements', label: 'Announcements' },
];

export default function PublicNavbar({ actions }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header className={`navbar${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
        <nav className="navbar-inner" aria-label="Main navigation">
          <Link to="/" className="navbar-brand" onClick={closeMenu}>
            Mentriv
          </Link>

          <button
            type="button"
            className="navbar-toggle"
            aria-expanded={open}
            aria-controls="site-nav-menu"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="navbar-toggle-line" aria-hidden="true" />
            <span className="navbar-toggle-line" aria-hidden="true" />
          </button>

          <div id="site-nav-menu" className={`navbar-menu${open ? ' is-open' : ''}`}>
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
              <Link to="/login" className="navbar-login" onClick={closeMenu}>
                Log in
              </Link>
              <Link to="/register" className="navbar-cta" onClick={closeMenu}>
                Get started
              </Link>
              {actions || null}
            </div>
          </div>
        </nav>
      </header>

      {open && (
        <div className="navbar-scrim" aria-hidden="true" onClick={closeMenu} />
      )}
    </>
  );
}
