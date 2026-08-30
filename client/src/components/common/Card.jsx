export default function Card({ variant = '', title, footer, children }) {
  return (
    <div className={`card ${variant}`.trim()}>
      {title ? <h3>{title}</h3> : null}
      {children}
      {footer ? <div style={{ marginTop: 'var(--space-4)' }}>{footer}</div> : null}
    </div>
  );
}

export const CARD_VARIANTS = {
  STANDARD: '',
  ELEVATED: 'card-elevated',
  INTERACTIVE: 'card-interactive',
  COURSE: 'card-course',
  STAT: 'card-stat',
  NOTIFICATION: 'card-notification',
};
