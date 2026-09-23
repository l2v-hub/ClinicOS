import type { DischargeTherapyRow } from './dischargeTherapy';
export interface ImportProposal {
  id: string;
  groupId: string;
  inputHash: string;
  row: DischargeTherapyRow;
  status: 'pending' | 'added' | 'deferred';
}
export function ImportProposalsReview({
  proposals,
  busy,
  onDecision,
}: {
  proposals: ImportProposal[];
  busy: boolean;
  onDecision(id: string, action: 'add' | 'defer'): void;
}) {
  if (!proposals.length) return null;
  return (
    <section
      className="discharge-therapy-review"
      aria-label="Nuove proposte dalle pagine aggiornate"
    >
      <h3>Nuove proposte dalle pagine aggiornate</h3>
      <p>
        Confronta queste proposte con le terapie già corrette. Aggiungile solo se sono nuove; le
        altre possono restare da verificare senza creare duplicati.
      </p>
      {proposals.map((proposal) => (
        <article className="discharge-therapy-review__item" key={proposal.id}>
          <strong>{proposal.row.farmacoNome || 'Terapia da identificare'}</strong>
          <blockquote>{proposal.row.originalText}</blockquote>
          {proposal.status === 'pending' ? (
            <div className="discharge-therapy-review__item-head">
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => onDecision(proposal.id, 'add')}
              >
                Aggiungi come proposta da verificare
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => onDecision(proposal.id, 'defer')}
              >
                Lascia da verificare senza aggiungere
              </button>
            </div>
          ) : (
            <p>
              {proposal.status === 'added'
                ? 'Aggiunta alle terapie da verificare'
                : 'Conservata da verificare, senza nuova prescrizione'}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
