export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="state-block" role="alert">
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {onRetry ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
