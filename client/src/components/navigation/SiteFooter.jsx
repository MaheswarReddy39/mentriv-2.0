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

        <nav aria-label="Company">
          <h4>Company</h4>
          <a href="https://www.instagram.com/dev___dynasty/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://youtube.com/@gmreddy-14" target="_blank" rel="noopener noreferrer">YouTube</a>
          <a href="https://www.linkedin.com/in/maheswar-reddy-gondireddy/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </nav>

        <nav aria-label="Contact & Support">
          <h4>Contact & Support</h4>
          <a href="mailto:maheswarreddygondireddy12@gmail.com" className="site-footer-email">
            maheswarreddygondireddy12@gmail.com
          </a>
        </nav>
      </div>

      <div className="footer-bar">
        <p>© {new Date().getFullYear()} Mentriv. All rights reserved.</p>
      </div>
    </footer>
  );
}
