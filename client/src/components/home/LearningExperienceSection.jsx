const STEPS = [
  { num: '01', title: 'Classes', body: 'Module-sequenced lessons, always in order.' },
  { num: '02', title: 'Assignments', body: 'Reviewed — marks plus personal feedback.' },
  { num: '03', title: 'MCQs', body: 'Evaluated — instant results & explanations.' },
  { num: '04', title: 'Progress', body: 'Tracked — one percentage per course.' },
];

export default function LearningExperienceSection() {
  return (
    <section
      className="homepage-section homepage-steps-section"
      aria-labelledby="experience-heading"
    >
      <div className="section-head">
        <div>
          <h2 id="experience-heading">How learning works</h2>
          <p>Four steps from enrollment to a completed course.</p>
        </div>
      </div>

      <ol className="homepage-steps-grid">
        {STEPS.map((step) => (
          <li key={step.num} className="homepage-step-card">
            <span className="homepage-step-number">{step.num}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
