export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="state-block" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
