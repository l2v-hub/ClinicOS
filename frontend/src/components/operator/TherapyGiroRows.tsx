import { useRef, useState } from 'react';
import type {
  MotivoNonErogazione,
  TherapyActionInfo,
  TherapyAdministration,
  TherapySlot,
  TherapySlotPatient,
} from '../../types';
import {
  parsePatientLocation,
  patientIdentifier,
  patientIdentityName,
} from '../../lib/patientIdentity';
import { MOTIVI, administeredTime, motivoLabel } from '../../lib/therapyGiro';
import { IcoCheck } from '../../icons';

export type FiltroStato = 'tutte' | TherapyAdministration['status'];

interface Props {
  slot: TherapySlot;
  date: string;
  filtro: FiltroStato;
  readOnly?: boolean;
  detailsPartial?: boolean;
  onConfirm?: (info: TherapyActionInfo) => void;
  onNotAdministered?: (info: TherapyActionInfo, motivo: MotivoNonErogazione, note: string) => void;
}

/** Camera dalla posizione attuale (mai dai campi storici room/bed della fascia). */
function roomBox(p: TherapySlotPatient): string {
  const location = parsePatientLocation(p.location);
  return location?.status === 'assigned' && location.room ? location.room : '—';
}
function roomLabel(p: TherapySlotPatient): string {
  const location = parsePatientLocation(p.location);
  if (!location || location.status === 'unavailable') return 'Posto letto non disponibile';
  if (location.status === 'unassigned') return 'Posto letto non assegnato';
  const bed = location.bed ? `, letto ${location.bed}` : '';
  return location.room ? `Camera ${location.room}${bed}` : 'Camera non indicata';
}

/** Una riga per somministrazione, con le stesse azioni del dialogo della fascia. */
export function TherapyGiroRows({
  slot,
  date,
  filtro,
  readOnly = false,
  detailsPartial = false,
  onConfirm,
  onNotAdministered,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedMotivo, setSelectedMotivo] = useState<MotivoNonErogazione | null>(null);
  const [noteText, setNoteText] = useState('');
  // Gli invii in corso valgono solo per lo stato delle fasce su cui sono partiti: ogni nuovo
  // stato (conferma, errore con ricarica, cambio data) libera i pulsanti, così una riga tornata
  // "da erogare" dopo un errore non resta bloccata su "Invio…".
  const [sending, setSending] = useState<{ slot: TherapySlot; keys: Set<string> }>({
    slot,
    keys: new Set(),
  });
  const pendingKeys = sending.slot === slot ? sending.keys : new Set<string>();

  // Dopo un'azione il fuoco torna sulla riga (o sul suo "Non somm."), non sul fondo della pagina.
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const listRef = useRef<HTMLUListElement>(null);
  function focusRow(key: string, selector?: string) {
    requestAnimationFrame(() => {
      const row = rowRefs.current.get(key);
      const target = (selector && row?.querySelector<HTMLElement>(selector)) || row;
      // Riga uscita dal filtro (es. "Da erogare"): il fuoco resta sull'elenco, non sul fondo.
      (target ?? listRef.current)?.focus();
    });
  }
  function closeReasons() {
    setExpandedKey(null);
    setSelectedMotivo(null);
    setNoteText('');
  }
  function buildInfo(p: TherapySlotPatient, a: TherapyAdministration): TherapyActionInfo {
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

  // L'ordine dei pazienti è quello del server (ordinamento del roster).
  const rows = slot.patients.flatMap((p) =>
    p.administrations
      .filter((a) => filtro === 'tutte' || a.status === filtro)
      .map((a) => ({ p, a })),
  );

  if (rows.length === 0) {
    return (
      <p className="giro-empty">
        {detailsPartial
          ? 'Nessun dettaglio corrispondente è ancora caricato.'
          : filtro === 'tutte'
            ? 'Nessuna somministrazione in questa fascia.'
            : 'Nessuna somministrazione con questo stato.'}
      </p>
    );
  }

  return (
    <ul
      ref={listRef}
      tabIndex={-1}
      className="giro-rows"
      aria-label={`Somministrazioni delle ${slot.ora}`}
    >
      {rows.map(({ p, a }) => {
        const key = `${p.patientId}|${a.therapyId}`;
        const identity = { ...p, id: p.patientId };
        const name = patientIdentityName(identity);
        const actionTarget = `${name} · ${patientIdentifier(identity)} · ${a.drugName} · ${a.dosage}`;
        const isSending = pendingKeys.has(key);
        const expanded = expandedKey === key && !readOnly;
        const at = administeredTime(a.administeredAt);
        const reason = motivoLabel(a.notAdministeredReason);
        return (
          <li
            key={key}
            ref={(el) => {
              if (el) rowRefs.current.set(key, el);
              else rowRefs.current.delete(key);
            }}
            tabIndex={-1}
            className={`giro-row${a.status !== 'pending' ? ' giro-row--done' : ''}`}
            aria-label={`${name}, ${a.drugName} ${a.dosage}`}
          >
            <span className="giro-row__bed" aria-hidden="true">
              {roomBox(p)}
            </span>
            <div className="giro-row__who">
              <span className="giro-row__name">{name}</span>
              <span className="giro-row__cap">
                <span className="giro-sr">{roomLabel(p)} · </span>
                {patientIdentifier(identity)}
              </span>
            </div>
            <div className="giro-row__drug">
              <span className="giro-row__name">
                {a.drugName} {a.dosage}
              </span>
              <span className="giro-row__cap">
                {a.quantityLabel ? `${a.quantityLabel} · ` : ''}
                {a.route} · {a.scheduledTime}
              </span>
            </div>
            <div className="giro-row__act">
              {a.status === 'administered' && (
                <span className="giro-badge giro-badge--ok">
                  <IcoCheck />
                  {at ?? 'Erogata'}
                  {a.administeredBy ? ` · ${a.administeredBy}` : ''}
                </span>
              )}
              {a.status === 'not_administered' && (
                <span className="giro-badge giro-badge--warn">
                  Non somm.{reason ? ` · ${reason}` : ''}
                </span>
              )}
              {a.status === 'pending' && readOnly && (
                <span className="giro-badge giro-badge--due">Da erogare</span>
              )}
              {a.status === 'pending' && !readOnly && (
                <>
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    aria-label={`Non erogata: ${actionTarget}`}
                    aria-expanded={expanded}
                    onClick={() => {
                      if (expanded) closeReasons();
                      else {
                        setExpandedKey(key);
                        setSelectedMotivo(null);
                        setNoteText('');
                      }
                    }}
                  >
                    Non somm.
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary"
                    aria-label={`Erogata: ${actionTarget}`}
                    disabled={isSending}
                    onClick={() => {
                      if (pendingKeys.has(key)) return;
                      setSending({ slot, keys: new Set(pendingKeys).add(key) });
                      if (expanded) closeReasons();
                      onConfirm?.(buildInfo(p, a));
                      focusRow(key);
                    }}
                  >
                    <IcoCheck />
                    {isSending ? 'Invio…' : 'Somministra'}
                  </button>
                </>
              )}
            </div>
            {expanded && (
              <div
                className="giro-row__reasons"
                role="group"
                aria-label={`Motivo della mancata somministrazione delle ${slot.ora}: ${actionTarget}`}
              >
                <div className="giro-reasons">
                  {MOTIVI.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      className="ds-chip"
                      aria-label={`${m.label}: ${actionTarget}`}
                      aria-pressed={selectedMotivo === m.value}
                      onClick={() => setSelectedMotivo(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {selectedMotivo === 'altro' && (
                  <input
                    className="form-input giro-note"
                    aria-label={`Motivo della mancata erogazione: ${actionTarget}`}
                    placeholder="Specifica il motivo..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                )}
                <div className="giro-reasons__actions">
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    onClick={() => {
                      closeReasons();
                      focusRow(key, '.ds-btn--secondary');
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary"
                    aria-label={`Conferma non erogata: ${actionTarget}`}
                    disabled={!selectedMotivo}
                    onClick={() => {
                      if (!selectedMotivo) return;
                      onNotAdministered?.(buildInfo(p, a), selectedMotivo, noteText);
                      closeReasons();
                      focusRow(key);
                    }}
                  >
                    Conferma
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
