import { useState } from 'react';
import type {
  TherapySlot,
  TherapySlotPatient,
  TherapyAdministration,
  MotivoNonErogazione,
  TherapyActionInfo,
} from '../../types';
import { sortPazienti } from '../../lib/patientSort';

interface Props {
  slot: TherapySlot;
  date: string;
  onClose: () => void;
  /** Vista gestionale (admin): l'elenco resta leggibile ma la firma di somministrazione,
   *  che e' un atto clinico tracciato su administeredBy, non e' offerta. */
  readOnly?: boolean;
  detailsPartial?: boolean;
  loadingMore?: boolean;
  loadMoreError?: string | null;
  onLoadMore?: () => void;
  onConfirm?: (info: TherapyActionInfo) => void;
  onNotAdministered?: (info: TherapyActionInfo, motivo: MotivoNonErogazione, note: string) => void;
}

const MOTIVI: { value: MotivoNonErogazione; label: string }[] = [
  { value: 'rifiutata_paziente', label: 'Rifiutata dal paziente' },
  { value: 'paziente_assente', label: 'Paziente assente' },
  { value: 'sospesa_medico', label: 'Sospesa dal medico' },
  { value: 'farmaco_non_disponibile', label: 'Farmaco non disponibile' },
  { value: 'impossibilita_clinica', label: 'Impossibilità clinica' },
  { value: 'altro', label: 'Altro' },
];

type FiltroStato = 'tutte' | TherapyAdministration['status'];

export function TherapySlotModal({
  slot,
  date,
  onClose,
  onConfirm,
  onNotAdministered,
  readOnly = false,
  detailsPartial = false,
  loadingMore = false,
  loadMoreError = null,
  onLoadMore,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoNonErogazione | null>(null);
  const [noteText, setNoteText] = useState('');
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('tutte');

  const { summary } = slot;
  // Issue #129: il backend restituisce i pazienti in ordine di terapia — qui
  // li mostriamo sempre in ordine alfabetico (cognome, nome).
  const patients = sortPazienti(slot.patients)
    .map((p) => ({
      ...p,
      administrations:
        filtroStato === 'tutte'
          ? p.administrations
          : p.administrations.filter((a) => a.status === filtroStato),
    }))
    .filter((p) => p.administrations.length > 0);
  const pctDone = summary.total > 0 ? Math.round((summary.administered / summary.total) * 100) : 0;

  const FILTRI: { key: FiltroStato; label: string }[] = [
    { key: 'tutte', label: 'Tutte' },
    { key: 'pending', label: `Da erogare${summary.pending > 0 ? ` (${summary.pending})` : ''}` },
    {
      key: 'administered',
      label: `Erogate${summary.administered > 0 ? ` (${summary.administered})` : ''}`,
    },
    {
      key: 'not_administered',
      label: `Non erogate${summary.notAdministered > 0 ? ` (${summary.notAdministered})` : ''}`,
    },
  ];

  function buildInfo(p: TherapySlotPatient, a: TherapyAdministration) {
    return {
      patientId: p.patientId,
      therapyId: a.therapyId,
      drugName: a.drugName,
      dosage: a.dosage,
      route: a.route,
      date,
      fascia: slot.fascia,
      ora: slot.ora,
    };
  }

  return (
    <div className="therapy-modal-overlay" onClick={onClose}>
      <div className="therapy-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="therapy-modal__header">
          <div>
            <h3>
              {slot.label} &mdash; {slot.ora}
            </h3>
            <span className="therapy-modal__header-info">
              {summary.administered}/{summary.total} erogate
              {summary.pending > 0 ? ` · ${summary.pending} da erogare` : ''}
            </span>
          </div>
          <button className="therapy-modal__close" onClick={onClose} aria-label="Chiudi">
            &times;
          </button>
        </div>

        {/* Filtri per stato somministrazione */}
        <div className="therapy-modal__filters">
          <div className="filter-chips">
            {FILTRI.map((f) => (
              <button
                key={f.key}
                className={`filter-chip${filtroStato === f.key ? ' active' : ''}`}
                onClick={() => setFiltroStato(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="therapy-modal__body">
          {detailsPartial && (
            <div className="therapy-modal__partial" role="status" aria-live="polite">
              <span>I totali sono esatti; l’elenco mostra solo i dettagli già caricati.</span>
              {loadMoreError && <span role="alert">{loadMoreError}</span>}
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Caricamento…' : 'Carica altri dettagli'}
              </button>
            </div>
          )}
          {patients.length === 0 ? (
            <div className="therapy-modal__empty">
              {detailsPartial
                ? 'Nessun dettaglio corrispondente è ancora caricato.'
                : filtroStato === 'tutte'
                  ? 'Nessuna terapia prevista per questa fascia.'
                  : 'Nessuna somministrazione con questo stato.'}
            </div>
          ) : (
            patients.map((p) => (
              <div key={p.patientId}>
                {/* Patient header */}
                <div className="therapy-patient-header">
                  {p.lastName.toUpperCase()}, {p.firstName}
                  <span className="therapy-patient-header__sub">
                    Camera {p.room} / Letto {p.bed}
                  </span>
                </div>

                {/* Drug rows */}
                {p.administrations.map((a) => {
                  const key = `${p.patientId}|${a.therapyId}`;
                  const isPending = pendingKeys.has(key);
                  return (
                    <div key={key}>
                      <div className="therapy-drug-row">
                        <div className="therapy-drug-row__info">
                          <span className="therapy-drug-row__name">{a.drugName}</span>
                          <span className="therapy-drug-row__meta">
                            {a.dosage} · {a.route} · {a.scheduledTime}
                          </span>
                        </div>
                        <div className="therapy-drug-row__actions">
                          {a.status === 'administered' && (
                            <span style={{ color: '#16A37B', fontWeight: 600, fontSize: 12 }}>
                              ✓ Erogata{a.administeredBy ? ` (${a.administeredBy})` : ''}
                            </span>
                          )}
                          {a.status === 'not_administered' && (
                            <span style={{ color: '#DC2626', fontWeight: 600, fontSize: 12 }}>
                              Non erogata
                              {a.notAdministeredReason && (
                                <span style={{ fontWeight: 400 }}>
                                  {' '}
                                  — {a.notAdministeredReason}
                                </span>
                              )}
                            </span>
                          )}
                          {a.status === 'pending' && readOnly && (
                            <span style={{ color: '#C77700', fontWeight: 600, fontSize: 12 }}>
                              Da erogare
                            </span>
                          )}
                          {a.status === 'pending' && !readOnly && (
                            <>
                              <button
                                className="therapy-action-btn therapy-action-btn--confirm"
                                disabled={isPending}
                                style={{ opacity: isPending ? 0.6 : 1 }}
                                onClick={() => {
                                  setPendingKeys((prev) => new Set(prev).add(key));
                                  onConfirm?.(buildInfo(p, a));
                                }}
                              >
                                {isPending ? 'Invio…' : 'Erogata'}
                              </button>
                              <button
                                className="therapy-action-btn therapy-action-btn--reject"
                                onClick={() => {
                                  if (expandedKey === key) {
                                    setExpandedKey(null);
                                    setSelectedMotivo(null);
                                    setNoteText('');
                                  } else {
                                    setExpandedKey(key);
                                    setSelectedMotivo(null);
                                    setNoteText('');
                                  }
                                }}
                              >
                                Non erogata
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {expandedKey === key && (
                        <div className="therapy-nonadmin-expand">
                          <div className="therapy-motivi-grid">
                            {MOTIVI.map((m) => (
                              <button
                                key={m.value}
                                className={`therapy-motivo-btn${selectedMotivo === m.value ? ' selected' : ''}`}
                                onClick={() => setSelectedMotivo(m.value)}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                          {selectedMotivo === 'altro' && (
                            <input
                              className="therapy-note-input"
                              placeholder="Specifica il motivo..."
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                            />
                          )}
                          <button
                            className="therapy-action-btn therapy-action-btn--confirm"
                            disabled={!selectedMotivo}
                            style={{ opacity: selectedMotivo ? 1 : 0.5 }}
                            onClick={() => {
                              if (!selectedMotivo) return;
                              onNotAdministered?.(buildInfo(p, a), selectedMotivo, noteText);
                              setExpandedKey(null);
                              setSelectedMotivo(null);
                              setNoteText('');
                            }}
                          >
                            Conferma
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="therapy-modal__footer">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="therapy-modal__footer-progress">
              {summary.administered}/{summary.total} erogate
            </span>
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
