import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="hero-grid homepage-hero" aria-labelledby="hero-heading">
      <div className="hero-copy fade-in">
        <h1 className="text-display" id="hero-heading">
          Learn real skills with{' '}
          <span className="grad-text">structure that works.</span>
        </h1>
        <p>
          Mentriv gives students guided classes, graded assignments, instant MCQ
          feedback and progress they can actually see.
        </p>
        <p className="text-sm">
          Built for learners who want organized courses instead of scattered videos.
        </p>

        <div className="hero-ctas">
          <Link to="/courses" className="btn btn-primary btn-lg">
            Browse courses
          </Link>
          <Link to="/register" className="btn btn-outline btn-lg">
            Create free account
          </Link>
        </div>

        <div className="hero-trust" aria-label="What you get with Mentriv">
          {['Free account', 'Verified payments', 'Visible progress'].map((item) => (
            <span key={item} className="text-meta">✓ {item}</span>
          ))}
        </div>
      </div>

      <div className="hero-visual fade-in d2" aria-hidden="true">
        <div className="glass-card float-card f1 glass-row">
          <span className="glass-icon gi-indigo">01</span>
          <div>
            <p className="glass-title">Classes in order</p>
            <p className="glass-sub">Module-sequenced lessons</p>
          </div>
        </div>
        <div className="glass-card float-card f2 glass-row">
          <span className="glass-icon gi-coral">02</span>
          <div>
            <p className="glass-title">Assignments reviewed</p>
            <p className="glass-sub">Marks + personal feedback</p>
          </div>
        </div>
        <div className="glass-card float-card f3 glass-row">
          <span className="glass-icon gi-teal">03</span>
          <div>
            <p className="glass-title">MCQs evaluated</p>
            <p className="glass-sub">Instant results & explanations</p>
          </div>
        </div>
        <div className="glass-card float-card f2 glass-row">
          <span className="glass-icon gi-indigo">04</span>
          <div>
            <p className="glass-title">Progress tracked</p>
            <p className="glass-sub">One percentage per course</p>
          </div>
        </div>
      </div>
    </section>
  );
}
