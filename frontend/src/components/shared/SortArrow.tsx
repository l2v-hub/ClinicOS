/** Freccia dell'intestazione ordinabile (ds-sort): disegnata, non un carattere, così non diventa
 *  un'emoji colorata con i font di sistema. Segue il colore del testo. */
export function SortArrow({ dir }: { dir: 'asc' | 'desc' | null }) {
  return (
    <svg
      className="ds-sort__arrow"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
      data-dir={dir ?? 'none'}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dir !== 'desc' && <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" />}
        {dir !== 'asc' && <path d="M8 3v10M4.5 9.5 8 13l3.5-3.5" />}
      </g>
    </svg>
  );
}
