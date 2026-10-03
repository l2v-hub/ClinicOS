// Elenco delle dosi di una fascia «paziente · farmaco · dose · stato» (UX 2026-10-03): la stessa
// riga nel calendario di reparto e nella card terapia dell'Agenda. Tutte le dosi, mai «+N»; lo
// stato è sempre testo (il colore lo rinforza soltanto); in ritardo per prime.
import type { CellDose } from '../../lib/therapyDoseStatus';
import './TherapyDoseList.css';

export function TherapyDoseList({
  doses,
  partial = false,
}: {
  doses: CellDose[];
  partial?: boolean;
}) {
  if (doses.length === 0) return null;
  return (
    <>
      <ul className="tdose-list" data-testid="therapy-dose-list">
        {doses.map((dose) => (
          <li key={dose.key} className={`tdose tdose--${dose.status.tone}`}>
            <span className="tdose__who">{dose.patientName}</span>
            <span className="tdose__what">
              {dose.drugName} · {dose.dose}
            </span>
            <span className="tdose__status">{dose.status.text}</span>
          </li>
        ))}
      </ul>
      {partial && <p className="tdose-list__partial">Elenco parziale: apri il giro per tutte.</p>}
    </>
  );
}
