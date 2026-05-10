import { useState } from 'react';
import type { TherapySlot, MotivoNonErogazione } from '../../types';

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

export function TherapySlotModal({ slot, onClose, onConfirm, onNotAdministered }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoNonErogazione | null>(null);
  const [noteText, setNoteText] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  // DIRECT access — no intermediate variable, no helper function
  // This prevents React Compiler from caching an empty result
  const somm = slot.somministrazioni;
  const total = somm ? somm.length : 0;
  const erogate = somm ? somm.filter(s => s.stato === 'erogata').length : 0;
  const nonErogate = somm ? somm.filter(s => s.stato === 'non_erogata').length : 0;
  const daErogare = total - erogate - nonErogate;
  const pctDone = total > 0 ? Math.round((erogate / total) * 100) : 0;

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

        {/* Body — scrollable */}
        <div className="therapy-modal__body">

          {/* DEBUG: visible indicator — remove after fix confirmed */}
          <div style={{ padding: '4px 16px', fontSize: 11, color: '#94A3B8', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
            Debug righe terapia: {total}
            {total === 0 && <> — slot keys: {Object.keys(slot).join(', ')}</>}
            {total === 0 && somm === undefined && <> — somministrazioni: undefined</>}
            {total === 0 && somm !== undefined && <> — somministrazioni: array vuoto</>}
          </div>

          {/* Table header */}
          {total > 0 && (
            <div className="therapy-header-row">
              <span>Paziente</span>
              <span>Camera/Letto</span>
              <span>Terapia</span>
              <span>Orario</span>
              <span>Stato</span>
              <span>Azioni</span>
            </div>
          )}

          {/* Rows — rendered DIRECTLY from slot.somministrazioni */}
          {somm && somm.length > 0 && somm.map(s => {
            const nome = s.pazienteNome || '—';
            const camera = s.camera || '—';
            const letto = s.letto || '—';
            const farmaco = s.farmaco || '—';
            const dose = s.dose || '—';
            const via = s.via || 'orale';
            const orario = s.orarioPrevisto || '—';
            const stato = s.stato || 'da_erogare';

            return (
              <div key={s.id}>
                <div className={`therapy-row${stato === 'erogata' ? ' therapy-row--erogata' : ''}${stato === 'non_erogata' ? ' therapy-row--non-erogata' : ''}`}>
                  <div className="therapy-row__patient">{nome}</div>
                  <div className="therapy-row__room">Cam. {camera} / L. {letto}</div>
                  <div>
                    <div className="therapy-row__med">{farmaco}</div>
                    <div className="therapy-row__med-dose">{dose} &middot; {via}</div>
                  </div>
                  <div className="therapy-row__time">{orario}</div>
                  <div className="therapy-row__status">
                    {stato === 'erogata' && (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                        <div className="therapy-row__confirm-info">
                          {s.operatoreConferma} {s.oraConferma}
                        </div>
                      </>
                    )}
                    {stato === 'non_erogata' && (
                      <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
                        Non erogata
                        {s.motivoNonErogazione && <span style={{ fontWeight: 400 }}> &mdash; {MOTIVI.find(m => m.value === s.motivoNonErogazione)?.label}</span>}
                      </span>
                    )}
                    {stato === 'da_erogare' && (
                      <span style={{ color: '#D97706', fontSize: 12 }}>Da erogare</span>
                    )}
                  </div>
                  <div className="therapy-actions">
                    {stato === 'da_erogare' && (
                      <>
                        <button
                          className="therapy-action-btn therapy-action-btn--confirm"
                          disabled={pendingId === s.id}
                          style={{ opacity: pendingId === s.id ? 0.6 : 1 }}
                          onClick={() => { setPendingId(s.id); onConfirm(s.id); }}>
                          {pendingId === s.id ? 'Invio\u2026' : 'Erogata'}
                        </button>
                        <button className="therapy-action-btn therapy-action-btn--reject" onClick={() => {
                          if (expandedId === s.id) {
                            setExpandedId(null);
                            setSelectedMotivo(null);
                            setNoteText('');
                          } else {
                            setExpandedId(s.id);
                            setSelectedMotivo(null);
                            setNoteText('');
                          }
                        }}>
                          Non erogata
                        </button>
                      </>
                    )}
                    {stato === 'erogata' && (
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Confermata</span>
                    )}
                    {stato === 'non_erogata' && (
                      <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Registrata</span>
                    )}
                  </div>
                </div>

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
                      onClick={() => {
                        if (!selectedMotivo) return;
                        onNotAdministered(s.id, selectedMotivo, noteText);
                        setExpandedId(null);
                        setSelectedMotivo(null);
                        setNoteText('');
                      }}>
                      Conferma
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {total === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
              Nessuna terapia prevista per questa fascia.
            </div>
          )}
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
