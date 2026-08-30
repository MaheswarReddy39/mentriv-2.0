export default function ProgressBar({ value = 0, label }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div>
      {label ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <span className="text-meta">{label}</span>
          <span className="text-meta" style={{ fontWeight: 600, color: 'var(--text)' }}>
            {clamped}%
          </span>
        </div>
      ) : null}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
