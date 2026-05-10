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
  { value: 'impossibilita_clinica',    label: 'Impossibilità clinica' },
  { value: 'altro',                    label: 'Altro' },
];

export function TherapySlotModal({ slot, onClose, onConfirm, onNotAdministered }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoNonErogazione | null>(null);
  const [noteText, setNoteText] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rows = Array.isArray(slot?.somministrazioni) ? slot.somministrazioni : [];

  const total = rows.length;
  const erogate = rows.filter(r => r.stato === 'erogata').length;
  const nonErogate = rows.filter(r => r.stato === 'non_erogata').length;
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
              {daErogare > 0 ? ` · ${daErogare} da erogare` : ''}
            </span>
          </div>
          <button className="therapy-modal__close" onClick={onClose} aria-label="Chiudi">&times;</button>
        </div>

        {/* Body */}
        <div className="therapy-modal__body">

          {/* Debug line — remove after confirmed working */}
          <div style={{ padding: '4px 16px', fontSize: 11, color: '#94A3B8', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
            Debug righe terapia: {rows.length}
            {rows.length === 0 && ` | slot keys: ${Object.keys(slot).join(', ')}`}
            {rows.length === 0 && ` | somministrazioni: ${slot.somministrazioni === undefined ? 'undefined' : Array.isArray(slot.somministrazioni) ? 'empty array' : typeof slot.somministrazioni}`}
          </div>

          {rows.length === 0 ? (
            <div className="therapy-modal__empty">Nessuna terapia prevista per questa fascia.</div>
          ) : (
            <div className="therapy-modal__rows">
              {rows.map((r) => (
                <div key={r.id}>
                  <div className="therapy-modal__row">
                    <div className="therapy-modal__row-patient">
                      <strong>{r.pazienteNome || '—'}</strong>
                      <span>Camera {r.camera || '-'} · Letto {r.letto || '-'}</span>
                    </div>
                    <div className="therapy-modal__row-drug">
                      <strong>{r.farmaco || '—'}</strong>
                      <span>{r.dose || '—'} · {r.via || 'orale'} · {r.orarioPrevisto || '—'}</span>
                    </div>
                    <div className="therapy-modal__row-stato">
                      {r.stato === 'erogata' && (
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: 12 }}>✓ Erogata</span>
                      )}
                      {r.stato === 'non_erogata' && (
                        <span style={{ color: '#DC2626', fontWeight: 600, fontSize: 12 }}>
                          Non erogata
                          {r.motivoNonErogazione && (
                            <span style={{ fontWeight: 400 }}>
                              {' — ' + (MOTIVI.find(m => m.value === r.motivoNonErogazione)?.label || r.motivoNonErogazione)}
                            </span>
                          )}
                        </span>
                      )}
                      {r.stato === 'da_erogare' && (
                        <span style={{ color: '#D97706', fontSize: 12 }}>Da erogare</span>
                      )}
                    </div>
                    <div className="therapy-modal__row-actions">
                      {r.stato === 'da_erogare' && (
                        <>
                          <button
                            className="therapy-action-btn therapy-action-btn--confirm"
                            disabled={pendingId === r.id}
                            style={{ opacity: pendingId === r.id ? 0.6 : 1 }}
                            onClick={() => { setPendingId(r.id); onConfirm(r.id); }}>
                            {pendingId === r.id ? 'Invio…' : 'Erogata'}
                          </button>
                          <button
                            className="therapy-action-btn therapy-action-btn--reject"
                            onClick={() => {
                              if (expandedId === r.id) {
                                setExpandedId(null);
                                setSelectedMotivo(null);
                                setNoteText('');
                              } else {
                                setExpandedId(r.id);
                                setSelectedMotivo(null);
                                setNoteText('');
                              }
                            }}>
                            Non erogata
                          </button>
                        </>
                      )}
                      {r.stato === 'erogata' && (
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Confermata</span>
                      )}
                      {r.stato === 'non_erogata' && (
                        <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Registrata</span>
                      )}
                    </div>
                  </div>

                  {expandedId === r.id && (
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
                          onNotAdministered(r.id, selectedMotivo, noteText);
                          setExpandedId(null);
                          setSelectedMotivo(null);
                          setNoteText('');
                        }}>
                        Conferma
                      </button>
                    </div>
                  )}
                </div>
              ))}
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
