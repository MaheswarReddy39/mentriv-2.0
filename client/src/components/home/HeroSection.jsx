import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="homepage-hero" aria-labelledby="hero-heading">
      <div className="hero-stage">
        <h1 className="hero-title" id="hero-heading">
          <span>Every course, in order.</span>
          <span>
            Every step, <span className="hero-accent">visible.</span>
          </span>
        </h1>

        <p className="hero-lede">
          Classes, assignments, and assessments in one place, with grades,
          feedback, and progress as you go.
        </p>

        <div className="hero-ctas">
          <Link to="/courses" className="btn btn-lg btn-primary hero-primary">
            Browse courses
          </Link>
          <Link to="/register" className="btn btn-lg btn-outline">
            Create free account
          </Link>
        </div>
      </div>
    </section>
  );
}
