export default function PagePlaceholder({ title, description }) {
  return (
    <section className="card">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <p className="text-caption">This screen will be built in an upcoming step.</p>
    </section>
  );
}
