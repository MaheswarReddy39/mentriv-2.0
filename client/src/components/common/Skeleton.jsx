export default function Skeleton({
  width = '100%',
  height = '1rem',
  count = 1,
  gap = 'var(--space-2)',
  radius,
  style,
}) {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap, ...style }}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="skeleton"
          style={{ width, height, borderRadius: radius }}
        />
      ))}
    </div>
  );
}
