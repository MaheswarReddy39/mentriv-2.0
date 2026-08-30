import { useId } from 'react';

export default function Radio({ label, name, value, id, ...rest }) {
  const generatedId = useId();
  const inputId = id || `${name}-${value}-${generatedId}`;

  return (
    <div className="radio-row">
      <input id={inputId} type="radio" name={name} value={value} {...rest} />
      {label ? <label htmlFor={inputId}>{label}</label> : null}
    </div>
  );
}
