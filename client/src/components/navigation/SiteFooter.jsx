import { Link } from 'react-router-dom';

const EXPLORE_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/announcements', label: 'Announcements' },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand-col">
          <Link to="/" className="site-footer-wordmark">
            Mentriv
          </Link>
          <p className="site-footer-brand">
            A structured learning platform for courses, assignments,
            assessments and visible progress.
          </p>
        </div>

        <nav className="site-footer-col" aria-label="Explore">
          <h4>Explore</h4>
          {EXPLORE_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="site-footer-col" aria-label="Follow">
          <h4>Follow</h4>
          <a href="https://www.instagram.com/dev___dynasty/" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href="https://youtube.com/@gmreddy-14" target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
          <a href="https://www.linkedin.com/in/maheswar-reddy-gondireddy/" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </nav>

        <div className="site-footer-col site-footer-contact">
          <h4>Contact</h4>
          <a href="mailto:maheswarreddygondireddy12@gmail.com">
            maheswarreddygondireddy12@<wbr />gmail.com
          </a>
        </div>
      </div>

      <div className="footer-bar">
        <p>© {new Date().getFullYear()} Mentriv. All rights reserved.</p>
      </div>
    </footer>
  );
}
