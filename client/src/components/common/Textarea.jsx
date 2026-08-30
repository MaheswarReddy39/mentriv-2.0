import { useId } from 'react';

export default function Textarea({ label, error, hint, rows = 4, id, ...rest }) {
  const inputId = id || useId();
  const errorId = `${inputId}-error`;

  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      {label ? <label className="field-label" htmlFor={inputId}>{label}</label> : null}
      <textarea
        id={inputId}
        rows={rows}
        className="textarea"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error ? <span className="field-error-text" id={errorId}>{error}</span> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
