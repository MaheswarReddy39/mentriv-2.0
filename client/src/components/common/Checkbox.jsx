import { useId } from 'react';

export default function Checkbox({ label, id, ...rest }) {
  const inputId = id || useId();

  return (
    <div className="checkbox-row">
      <input id={inputId} type="checkbox" {...rest} />
      {label ? <label htmlFor={inputId}>{label}</label> : null}
    </div>
  );
}
