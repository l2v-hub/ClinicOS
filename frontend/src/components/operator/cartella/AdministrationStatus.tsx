import './AdministrationStatus.css';

/** Daily slots and history expose different names for the same administration states. */
export function AdministrationStatus({ status }: { status: string }) {
  const state =
    status === 'administered' || status === 'erogata'
      ? 'completed'
      : status === 'not_administered' || status === 'non_erogata'
        ? 'not-given'
        : 'pending';
  const label =
    state === 'completed' ? 'Erogata' : state === 'not-given' ? 'Non erogata' : 'Da erogare';

  return (
    <span className={`administration-status administration-status--${state}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {state === 'completed' ? (
          <path d="m4 10 4 4 8-8" />
        ) : (
          <>
            <circle cx="10" cy="10" r="7" />
            {state === 'pending' ? <path d="M10 6v4l2.5 1.5" /> : <path d="M7 10h6" />}
          </>
        )}
      </svg>
      <span>{label}</span>
    </span>
  );
}
