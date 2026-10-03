/** A clinical load failure must never look like an empty, successful result. */
export function LoadErrorState({
  message,
  onRetry,
  retryLabel = 'Riprova',
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="alert alert--error" role="alert">
      <span>{message}</span>{' '}
      <button type="button" className="ds-btn ds-btn--secondary" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  );
}
