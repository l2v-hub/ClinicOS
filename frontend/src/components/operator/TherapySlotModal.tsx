import { useState } from 'react';
import type { TherapySlot, SomministrazioneTerapia, MotivoNonErogazione } from '../../types';

interface Props {
  slot: TherapySlot;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onNotAdministered: (id: string, motivo: MotivoNonErogazione, note: string) => void;
}

const MOTIVI: { value: MotivoNonErogazione; label: string }[] = [
  { value: 'rifiutata_paziente',       label: 'Rifiutata dal paziente' },
  { value: 'paziente_assente',         label: 'Paziente assente' },
  { value: 'sospesa_medico',           label: 'Sospesa dal medico' },
  { value: 'farmaco_non_disponibile',  label: 'Farmaco non disponibile' },
  { value: 'impossibilita_clinica',    label: 'Impossibilit\u00e0 clinica' },
  { value: 'altro',                    label: 'Altro' },
];

// Normalize row data from any possible API field names
function normalizeRow(raw: Record<string, unknown>): SomministrazioneTerapia {
  return {
    id: (raw.id ?? raw.administrationId ?? '') as string,
    pazienteId: (raw.pazienteId ?? raw.patientId ?? '') as string,
    pazienteNome: (raw.pazienteNome ?? raw.patientName ?? `${raw.patientLastName ?? ''}, ${raw.patientFirstName ?? ''}`.replace(/^, $/, '—')) as string,
    camera: (raw.camera ?? raw.room ?? '—') as string,
    letto: (raw.letto ?? raw.bed ?? '—') as string,
    farmaco: (raw.farmaco ?? raw.drugName ?? '') as string,
    dose: (raw.dose ?? raw.dosage ?? '') as string,
    via: (raw.via ?? raw.route ?? 'orale') as string,
    orarioPrevisto: (raw.orarioPrevisto ?? raw.scheduledTime ?? raw.timeSlot ?? '') as string,
    stato: (raw.stato ?? raw.status ?? 'da_erogare') as SomministrazioneTerapia['stato'],
    operatoreConferma: raw.operatoreConferma as string | undefined,
    oraConferma: (raw.oraConferma ?? raw.administeredAt) as string | undefined,
    motivoNonErogazione: (raw.motivoNonErogazione ?? raw.notAdministeredReason) as MotivoNonErogazione | undefined,
    noteNonErogazione: raw.noteNonErogazione as string | undefined,
  };
}

export function TherapySlotModal({ slot, onClose, onConfirm, onNotAdministered }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoNonErogazione | null>(null);
  const [noteText, setNoteText] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Defensive: normalize from any possible field name
  const slotAny = slot as unknown as Record<string, unknown>;
  const rawRows = (slot.somministrazioni
    ?? (slotAny.patients as unknown as SomministrazioneTerapia[])
    ?? (slotAny.items as unknown as SomministrazioneTerapia[])
    ?? []) as unknown as Record<string, unknown>[];
  const therapyRows: SomministrazioneTerapia[] = rawRows.map(r =>
    typeof r === 'object' && r !== null && 'pazienteNome' in r
      ? r as unknown as SomministrazioneTerapia
      : normalizeRow(r)
  );

  const erogate = therapyRows.filter(s => s.stato === 'erogata').length;
  const nonErogate = therapyRows.filter(s => s.stato === 'non_erogata').length;
  const total = therapyRows.length;
  const daErogare = total - erogate - nonErogate;
  const pctDone = total > 0 ? Math.round((erogate / total) * 100) : 0;

  function handleConfirmNonErogata(id: string) {
    if (!selectedMotivo) return;
    onNotAdministered(id, selectedMotivo, noteText);
    setExpandedId(null);
    setSelectedMotivo(null);
    setNoteText('');
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setSelectedMotivo(null);
      setNoteText('');
    } else {
      setExpandedId(id);
      setSelectedMotivo(null);
      setNoteText('');
    }
  }

  return (
    <div className="therapy-modal-overlay" onClick={onClose}>
      <div className="therapy-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="therapy-modal__header">
          <div>
            <h3>{slot.label} &mdash; {slot.ora}</h3>
            <span className="therapy-modal__header-info">
              {erogate}/{total} erogate
              {daErogare > 0 && <> &middot; {daErogare} da erogare</>}
            </span>
          </div>
          <button className="therapy-modal__close" onClick={onClose} aria-label="Chiudi">&times;</button>
        </div>

        {/* Body */}
        <div className="therapy-modal__body">
          {therapyRows.length > 0 && (
            <div className="therapy-header-row">
              <span>Paziente</span>
              <span>Camera/Letto</span>
              <span>Terapia</span>
              <span>Orario</span>
              <span>Stato</span>
              <span>Azioni</span>
            </div>
          )}

          {therapyRows.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
              Nessuna terapia prevista per questa fascia.
            </div>
          )}

          {therapyRows.map(s => (
            <div key={s.id}>
              <div className={`therapy-row${s.stato === 'erogata' ? ' therapy-row--erogata' : ''}${s.stato === 'non_erogata' ? ' therapy-row--non-erogata' : ''}`}>
                <div className="therapy-row__patient">{s.pazienteNome}</div>
                <div className="therapy-row__room">Cam. {s.camera} / L. {s.letto}</div>
                <div>
                  <div className="therapy-row__med">{s.farmaco}</div>
                  <div className="therapy-row__med-dose">{s.dose} &middot; {s.via}</div>
                </div>
                <div className="therapy-row__time">{s.orarioPrevisto}</div>
                <div className="therapy-row__status">
                  {s.stato === 'erogata' && (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                      <div className="therapy-row__confirm-info">
                        {s.operatoreConferma} {s.oraConferma}
                      </div>
                    </>
                  )}
                  {s.stato === 'non_erogata' && (
                    <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
                      Non erogata
                      {s.motivoNonErogazione && <span style={{ fontWeight: 400 }}> &mdash; {MOTIVI.find(m => m.value === s.motivoNonErogazione)?.label}</span>}
                    </span>
                  )}
                  {s.stato === 'da_erogare' && (
                    <span style={{ color: '#D97706', fontSize: 12 }}>Da erogare</span>
                  )}
                </div>
                <div className="therapy-actions">
                  {s.stato === 'da_erogare' && (
                    <>
                      <button
                        className="therapy-action-btn therapy-action-btn--confirm"
                        disabled={pendingId === s.id}
                        style={{ opacity: pendingId === s.id ? 0.6 : 1 }}
                        onClick={() => { setPendingId(s.id); onConfirm(s.id); }}>
                        {pendingId === s.id ? 'Invio\u2026' : 'Erogata'}
                      </button>
                      <button className="therapy-action-btn therapy-action-btn--reject" onClick={() => toggleExpand(s.id)}>
                        Non erogata
                      </button>
                    </>
                  )}
                  {s.stato === 'erogata' && (
                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Confermata</span>
                  )}
                  {s.stato === 'non_erogata' && (
                    <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Registrata</span>
                  )}
                </div>
              </div>

              {/* Non-erogata inline expand */}
              {expandedId === s.id && (
                <div className="therapy-nonadmin-expand">
                  <div className="therapy-motivi-grid">
                    {MOTIVI.map(m => (
                      <button key={m.value}
                        className={`therapy-motivo-btn${selectedMotivo === m.value ? ' selected' : ''}`}
                        onClick={() => setSelectedMotivo(m.value)}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {selectedMotivo === 'altro' && (
                    <input
                      className="therapy-note-input"
                      placeholder="Specifica il motivo..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                    />
                  )}
                  <button
                    className="therapy-action-btn therapy-action-btn--confirm"
                    disabled={!selectedMotivo}
                    style={{ opacity: selectedMotivo ? 1 : 0.5 }}
                    onClick={() => handleConfirmNonErogata(s.id)}>
                    Conferma
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="therapy-modal__footer">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="therapy-modal__footer-progress">{erogate}/{total} erogate</span>
            <span className="therapy-modal__footer-bar">
              <span className="therapy-modal__footer-fill" style={{ width: `${pctDone}%` }} />
            </span>
          </div>
          <button className="therapy-action-btn therapy-action-btn--reject" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
