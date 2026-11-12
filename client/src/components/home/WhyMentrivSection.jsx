const PROMISES = [
  {
    icon: 'route',
    label: 'Structured courses',
    copy: 'Every course follows a sequence you can see.',
  },
  {
    icon: 'feedback',
    label: 'Graded assignments',
    copy: 'Every assignment comes back with marks and personal feedback.',
  },
  {
    icon: 'bolt',
    label: 'Auto-evaluated tests',
    copy: 'Every test is scored instantly, with explanations.',
  },
  {
    icon: 'chart',
    label: 'Visible progress',
    copy: 'Every course ends in one clear percentage.',
  },
];

function PromiseIcon({ name }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

  if (name === 'route') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M5 18V6m0 0 3 3m-3-3L2 9M19 6v12m0 0 3-3m-3 3-3-3M5 9h7a3 3 0 0 1 3 3v3" /></svg>;
  }
  if (name === 'feedback') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M20 11.5a7.5 7.5 0 0 1-8 7.48A7.5 7.5 0 1 1 19.5 11v3.5Z" /><path {...common} d="M8 11h8M8 14h5" /></svg>;
  }
  if (name === 'bolt') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m13 2-8 12h6l-1 8 9-13h-6l0-7Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-2" /><path {...common} d="m7 7 4-3 4 2 4-3" /></svg>;
}

export default function WhyMentrivSection() {
  return (
    <section className="homepage-section why-section" aria-labelledby="why-heading">
      <div className="why-head">
        <h2 id="why-heading">Why learn on Mentriv</h2>
      </div>

      <ul className="why-promises">
        {PROMISES.map((promise) => (
          <li key={promise.label} className="why-promise">
            <span className={`why-promise-icon why-icon-${promise.icon}`}>
              <PromiseIcon name={promise.icon} />
            </span>
            <h3>{promise.label}</h3>
            <p>{promise.copy}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
