export default function AuthSelect({
  id,
  label,
  action,
  error,
  hint,
  selectRef,
  className = '',
  children,
  value,
  ...selectProps
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const fieldClass = ['login-field', error ? 'is-invalid' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={fieldClass}>
      <div className="login-label-row">
        <label className="login-label" htmlFor={id}>
          {label}
        </label>
        {action || null}
      </div>

      <div className="login-select-wrap">
        <select
          id={id}
          ref={selectRef}
          className={`login-input login-select${value ? '' : ' is-placeholder'}`}
          value={value}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...selectProps}
        >
          {children}
        </select>
        <span className="login-select-icon" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            focusable="false"
          >
            <path
              d="M6.5 9.5L12 15L17.5 9.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {error ? (
        <p className="login-field-error" id={`${id}-error`} role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7.5v5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <div className="login-field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
