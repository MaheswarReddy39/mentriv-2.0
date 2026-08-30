import { useId } from 'react';

export default function Input({ label, error, hint, id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      {label ? <label className="field-label" htmlFor={inputId}>{label}</label> : null}
      <input
        id={inputId}
        className="input"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...rest}
      />
      {error ? <span className="field-error-text" id={errorId}>{error}</span> : null}
      {!error && hint ? <span className="field-hint" id={hintId}>{hint}</span> : null}
    </div>
  );
}
