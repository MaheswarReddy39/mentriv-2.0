const PROMISES = [
  {
    icon: 'sequence',
    label: 'Structured courses',
    copy: 'Every course follows a sequence you can see.',
  },
  {
    icon: 'feedback',
    label: 'Graded assignments',
    copy: 'Every assignment comes back with marks and personal feedback.',
  },
  {
    icon: 'instant',
    label: 'Auto-evaluated tests',
    copy: 'Every test is scored instantly, with explanations.',
  },
  {
    icon: 'progress',
    label: 'Visible progress',
    copy: 'Every course ends in one clear percentage.',
  },
];

function PromiseIcon({ name }) {
  if (name === 'sequence') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4" y="4" width="7.5" height="7.5" rx="2.4" fill="none" stroke="var(--text)" strokeWidth="1.8" />
        <rect x="12.25" y="12.25" width="7.5" height="7.5" rx="2.4" fill="none" stroke="var(--text)" strokeWidth="1.8" />
        <rect x="20.5" y="20.5" width="7.5" height="7.5" rx="2.4" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'feedback') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M8.5 5.25h7.75l4.25 4.25V24a2.25 2.25 0 0 1-2.25 2.25H8.5A2.25 2.25 0 0 1 6.25 24V7.5A2.25 2.25 0 0 1 8.5 5.25Z"
          fill="none"
          stroke="var(--text)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M16.25 5.25v4.25h4.25" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.75 13h5" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" opacity="0.4" />
        <path d="M9.75 17h3.25" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" opacity="0.4" />
        <path
          d="m11.6 20.3 3.1 3.1 5.5-6.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'instant') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M5.5 12.5V7.7a2.2 2.2 0 0 1 2.2-2.2h4.8M19.5 5.5h4.8a2.2 2.2 0 0 1 2.2 2.2v4.8M26.5 19.5v4.8a2.2 2.2 0 0 1-2.2 2.2h-4.8M12.5 26.5H7.7a2.2 2.2 0 0 1-2.2-2.2v-4.8"
          fill="none"
          stroke="var(--text)"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="m10.5 16.2 3.2 3.2 7.7-8.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="10.35" cy="10.85" r="3.4" fill="none" stroke="var(--text)" strokeWidth="2" />
      <circle cx="21.65" cy="21.15" r="3.4" fill="currentColor" />
      <path d="M23.4 6.6 8.6 25.4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
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
