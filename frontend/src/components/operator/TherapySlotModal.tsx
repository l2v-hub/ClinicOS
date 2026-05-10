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

  // === ROWS: exact spec ===
  const rows = Array.isArray(slot?.somministrazioni) ? slot.somministrazioni : [];

  // === COUNTS: only from rows ===
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
              {daErogare > 0 ? ` \u00b7 ${daErogare} da erogare` : ''}
            </span>
          </div>
          <button className="therapy-modal__close" onClick={onClose} aria-label="Chiudi">&times;</button>
        </div>

        {/* Body */}
        <div className="therapy-modal__body">

          {/* DEBUG visible — remove after fix confirmed */}
          <div style={{ padding: '4px 16px', fontSize: 11, color: '#94A3B8', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
            Debug righe terapia: {rows.length}
            {rows.length === 0 && ` | slot keys: ${Object.keys(slot).join(', ')}`}
            {rows.length === 0 && ` | somministrazioni is ${slot.somministrazioni === undefined ? 'undefined' : Array.isArray(slot.somministrazioni) ? 'empty array' : typeof slot.somministrazioni}`}
          </div>

          {/* Table header — only if rows exist */}
          {rows.length > 0 && (
            <div className="therapy-header-row">
              <span>Paziente</span>
              <span>Camera/Letto</span>
              <span>Terapia</span>
              <span>Orario</span>
              <span>Stato</span>
              <span>Azioni</span>
            </div>
          )}

          {/* Patient rows */}
          {rows.map(row => (
            <div key={row.id}>
              <div className={`therapy-row${row.stato === 'erogata' ? ' therapy-row--erogata' : ''}${row.stato === 'non_erogata' ? ' therapy-row--non-erogata' : ''}`}>
                <div className="therapy-row__patient">{row.pazienteNome || '\u2014'}</div>
                <div className="therapy-row__room">{'Cam. ' + (row.camera || '\u2014') + ' / L. ' + (row.letto || '\u2014')}</div>
                <div>
                  <div className="therapy-row__med">{row.farmaco || '\u2014'}</div>
                  <div className="therapy-row__med-dose">{(row.dose || '\u2014') + ' \u00b7 ' + (row.via || 'orale')}</div>
                </div>
                <div className="therapy-row__time">{row.orarioPrevisto || '\u2014'}</div>
                <div className="therapy-row__status">
                  {row.stato === 'erogata' && (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                      <div className="therapy-row__confirm-info">
                        {row.operatoreConferma} {row.oraConferma}
                      </div>
                    </>
                  )}
                  {row.stato === 'non_erogata' && (
                    <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
                      {'Non erogata'}
                      {row.motivoNonErogazione && <span style={{ fontWeight: 400 }}>{' \u2014 ' + (MOTIVI.find(m => m.value === row.motivoNonErogazione)?.label || '')}</span>}
                    </span>
                  )}
                  {row.stato === 'da_erogare' && (
                    <span style={{ color: '#D97706', fontSize: 12 }}>Da erogare</span>
                  )}
                </div>
                <div className="therapy-actions">
                  {row.stato === 'da_erogare' && (
                    <>
                      <button
                        className="therapy-action-btn therapy-action-btn--confirm"
                        disabled={pendingId === row.id}
                        style={{ opacity: pendingId === row.id ? 0.6 : 1 }}
                        onClick={() => { setPendingId(row.id); onConfirm(row.id); }}>
                        {pendingId === row.id ? 'Invio\u2026' : 'Erogata'}
                      </button>
                      <button className="therapy-action-btn therapy-action-btn--reject" onClick={() => {
                        if (expandedId === row.id) {
                          setExpandedId(null);
                          setSelectedMotivo(null);
                          setNoteText('');
                        } else {
                          setExpandedId(row.id);
                          setSelectedMotivo(null);
                          setNoteText('');
                        }
                      }}>
                        Non erogata
                      </button>
                    </>
                  )}
                  {row.stato === 'erogata' && (
                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{'\u2713 Confermata'}</span>
                  )}
                  {row.stato === 'non_erogata' && (
                    <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Registrata</span>
                  )}
                </div>
              </div>

              {expandedId === row.id && (
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
                      onNotAdministered(row.id, selectedMotivo, noteText);
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

          {/* Empty state — ONLY if rows truly empty */}
          {rows.length === 0 && (
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
