import { Link } from 'react-router-dom';

export default function CtaSection() {
  return (
    <section className="homepage-section" aria-labelledby="cta-heading">
      <div className="cta-band">
        <h2 id="cta-heading">Ready to start learning?</h2>
        <p className="text-body-lg" style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch', marginInline: 'auto' }}>
          Create a free account, verify your email, and pick the course you want to begin with.
        </p>
        <div className="cta-actions">
          <Link to="/register" className="btn btn-primary btn-lg" aria-label="Create your Mentriv account">
            Create your account
          </Link>
          <Link to="/courses" className="btn btn-outline btn-lg" aria-label="Explore Mentriv courses first">
            Explore courses first
          </Link>
        </div>
      </div>
    </section>
  );
}
