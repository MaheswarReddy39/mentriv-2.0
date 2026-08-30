import Card from '../common/Card.jsx';

const PILLARS = [
  { key: 'pd-indigo', title: 'Structured courses', body: 'Clear module and lesson sequence — always know what comes next.' },
  { key: 'pd-coral', title: 'Graded assignments', body: 'Submit before the deadline and receive marks with personal feedback.' },
  { key: 'pd-teal', title: 'Auto-evaluated tests', body: 'MCQs are scored instantly against the answer key, with explanations.' },
  { key: 'pd-amber', title: 'Visible progress', body: 'Every completed item rolls up into one course completion percentage.' },
];

export default function WhyMentrivSection() {
  return (
    <section className="homepage-section" aria-labelledby="why-heading">
      <div className="section-head">
        <div>
          <h2 id="why-heading">Why learn on Mentriv</h2>
          <p>Four reasons students stay organized and keep moving forward.</p>
        </div>
      </div>

      <div className="pillars-grid">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title}>
            <span className={`pillar-dot ${pillar.key}`} aria-hidden="true">✦</span>
            <h3>{pillar.title}</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              {pillar.body}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
