import { Link } from 'react-router-dom';

export default function CtaSection() {
  return (
    <section className="homepage-section cta-section" aria-labelledby="cta-heading">
      <div className="cta-panel">
        <h2 id="cta-heading">Ready to start learning?</h2>
        <p className="cta-copy">
          Create a free account, verify your email, and pick the course you want
          to begin with.
        </p>
        <div className="cta-actions">
          <Link
            to="/register"
            className="btn btn-lg cta-primary"
            aria-label="Create your Mentriv account"
          >
            Create your account
          </Link>
          <Link
            to="/courses"
            className="btn btn-lg cta-secondary"
            aria-label="Explore Mentriv courses first"
          >
            Explore courses first
          </Link>
        </div>
      </div>
    </section>
  );
}
