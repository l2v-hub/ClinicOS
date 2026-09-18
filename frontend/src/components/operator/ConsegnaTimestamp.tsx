export function ConsegnaTimestamp({ createdAt }: { createdAt?: string | null }) {
  const date =
    createdAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(createdAt) ? new Date(createdAt) : null;
  if (!date || !Number.isFinite(date.getTime()))
    return <span className="consegna-creato">Data di creazione non disponibile</span>;
  return (
    <time className="consegna-creato" dateTime={date.toISOString()}>
      Scritta il{' '}
      {date.toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </time>
  );
}
