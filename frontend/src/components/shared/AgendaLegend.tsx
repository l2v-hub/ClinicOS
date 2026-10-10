const VOCI = [
  { label: 'Completato', style: { background: '#16A37B' } },
  { label: 'In corso', style: { background: '#2F6BED' } },
  { label: 'Programmato', style: { background: '#C77700' } },
  { label: 'Annullato', style: { background: '#64748B' } },
  { label: 'Disponibile', style: { background: '#E5E7EB', border: '1px dashed #9DB7D5' } },
];

/** Chiave di lettura dei colori di stato, identica in agenda operatore e agenda admin. */
export function AgendaLegend() {
  return (
    <div className="agt-legend" role="group" aria-label="Stati delle attività">
      <strong className="agt-legend__title">Stati delle attività</strong>
      {VOCI.map((v) => (
        <span key={v.label} className="agt-legend__item">
          <span className="agt-legend__dot" style={v.style} aria-hidden="true" />
          {v.label}
        </span>
      ))}
    </div>
  );
}
