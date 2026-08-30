import { useId } from 'react';

export default function Select({ label, error, hint, children, id, ...rest }) {
  const inputId = id || useId();

  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      {label ? <label className="field-label" htmlFor={inputId}>{label}</label> : null}
      <select
        id={inputId}
        className="select"
        aria-invalid={Boolean(error) || undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? <span className="field-error-text">{error}</span> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
