const INPUTS = [
  {
    step: '01',
    title: 'Classes',
    body: 'Lessons follow a fixed module sequence, so you always know what comes next.',
  },
  {
    step: '02',
    title: 'Assignments',
    body: 'Every submission is reviewed and returned with marks and written feedback.',
  },
  {
    step: '03',
    title: 'MCQs',
    body: 'Tests are scored the moment you submit, with an explanation for each answer.',
  },
  {
    step: '04',
    title: 'Progress',
    body: 'Your activity comes together in one clear course view, so you can pick up where you left off.',
  },
];

export default function LearningExperienceSection() {
  return (
    <section
      className="homepage-section experience-section"
      aria-labelledby="experience-heading"
    >
      <div className="experience-head">
        <h2 id="experience-heading">How learning works</h2>
      </div>

      <div className="learning-path">
        {INPUTS.map((part, index) => (
          <article key={part.title} className="learning-step">
            <div className="learning-step-top">
              <span className="learning-step-number">{part.step}</span>
              {index < INPUTS.length - 1 ? <span className="learning-step-line" aria-hidden="true" /> : null}
            </div>
            <h3>{part.title}</h3>
            <p>{part.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
