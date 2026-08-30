import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-cols">
        <div>
          <p className="navbar-brand" style={{ margin: 0 }}>
            Men<span className="grad-text">triv</span>
          </p>
          <p className="site-footer-brand">
            A structured learning platform for courses, assignments,
            assessments and visible progress.
          </p>
        </div>

        <nav aria-label="Site">
          <h4>Site</h4>
          <Link to="/">Home</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/announcements">Announcements</Link>
        </nav>

        <nav aria-label="Account">
          <h4>Account</h4>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
        </nav>

        <nav aria-label="Learning">
          <h4>Learning</h4>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Classes</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Assignments</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>MCQ tests</span>
        </nav>
      </div>

      <div className="footer-bar">
        <p>© {new Date().getFullYear()} Mentriv. All rights reserved.</p>
      </div>
    </footer>
  );
}
