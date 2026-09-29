import { useRef, useState } from 'react';
import type {
  MotivoNonErogazione,
  TherapyActionInfo,
  TherapyAdministration,
  TherapySlotPatient,
} from '../../types';
import {
  parsePatientLocation,
  patientIdentifier,
  patientIdentityName,
} from '../../lib/patientIdentity';
import {
  MOTIVI,
  administeredTime,
  motivoLabel,
  type GiroItem,
  type GiroTime,
} from '../../lib/therapyGiro';
import { IcoCheck } from '../../icons';

export type FiltroStato = 'tutte' | TherapyAdministration['status'];

interface Props {
  time: GiroTime;
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

/** Giro di un'ora: un gruppo per paziente con tutti i suoi farmaci di quell'ora, ciascuno con le
 *  stesse azioni di sempre ("Non somm." con i motivi, "Somministra"). */
export function TherapyGiroRows({
  time,
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
  // Gli invii in corso valgono solo per lo stato dell'ora su cui sono partiti: ogni nuovo stato
  // (conferma, errore con ricarica, cambio data) libera i pulsanti, così un farmaco tornato
  // "da erogare" dopo un errore non resta bloccato su "Invio…".
  const [sending, setSending] = useState<{ time: GiroTime; keys: Set<string> }>({
    time,
    keys: new Set(),
  });
  const pendingKeys = sending.time === time ? sending.keys : new Set<string>();

  // Dopo un'azione il fuoco torna sul farmaco (o sul suo "Non somm."), non sul fondo della pagina.
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const listRef = useRef<HTMLUListElement>(null);
  function focusRow(key: string, selector?: string) {
    requestAnimationFrame(() => {
      const row = rowRefs.current.get(key);
      const target = (selector && row?.querySelector<HTMLElement>(selector)) || row;
      // Farmaco uscito dal filtro (es. "Da erogare"): il fuoco resta sull'elenco.
      (target ?? listRef.current)?.focus();
    });
  }
  function closeReasons() {
    setExpandedKey(null);
    setSelectedMotivo(null);
    setNoteText('');
  }
  function buildInfo(p: TherapySlotPatient, item: GiroItem): TherapyActionInfo {
    return {
      patientId: p.patientId,
      therapyId: item.a.therapyId,
      drugName: item.a.drugName,
      dosage: item.a.dosage,
      route: item.a.route,
      date,
      // la fascia del server resta la chiave di registrazione; l'ora è quella della prescrizione
      fascia: item.fascia,
      ora: item.a.scheduledTime || time.ora,
    };
  }

  // Ordine dei pazienti: quello del giro (server). Ogni gruppo tiene solo i farmaci del filtro.
  const groups = time.patients
    .map((g) => ({
      p: g.patient,
      items: g.items.filter((item) => filtro === 'tutte' || item.a.status === filtro),
    }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="giro-empty">
        {detailsPartial
          ? 'Nessun dettaglio corrispondente è ancora caricato.'
          : filtro === 'tutte'
            ? 'Nessuna somministrazione a quest’ora.'
            : 'Nessuna somministrazione con questo stato.'}
      </p>
    );
  }

  return (
    <ul
      ref={listRef}
      tabIndex={-1}
      className="giro-patients"
      aria-label={`Somministrazioni delle ${time.ora}`}
    >
      {groups.map(({ p, items }) => {
        const identity = { ...p, id: p.patientId };
        const name = patientIdentityName(identity);
        const allDone = items.every((item) => item.a.status !== 'pending');
        return (
          <li
            key={p.patientId}
            className={`giro-patient${allDone ? ' giro-patient--done' : ''}`}
            aria-label={`${name}: ${items.length} ${items.length === 1 ? 'farmaco' : 'farmaci'}`}
          >
            <div className="giro-patient__head">
              <span className="giro-row__bed" aria-hidden="true">
                {roomBox(p)}
              </span>
              <div className="giro-row__who">
                <span className="giro-row__name">{name}</span>
                <span className="giro-row__cap">
                  {roomLabel(p)} · {patientIdentifier(identity)}
                </span>
              </div>
            </div>
            <ul className="giro-drugs" aria-label={`Farmaci di ${name} delle ${time.ora}`}>
              {items.map((item) => {
                const a = item.a;
                const key = `${p.patientId}|${a.therapyId}|${item.fascia}`;
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
                    className={`giro-drug${a.status !== 'pending' ? ' giro-drug--done' : ''}`}
                    aria-label={`${a.drugName} ${a.dosage}`}
                  >
                    <div className="giro-drug__info">
                      <span className="giro-drug__name">
                        {a.drugName} {a.dosage}
                      </span>
                      <span className="giro-drug__cap">
                        {a.quantityLabel ? `${a.quantityLabel} · ` : ''}
                        {a.route}
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
                              setSending({ time, keys: new Set(pendingKeys).add(key) });
                              if (expanded) closeReasons();
                              onConfirm?.(buildInfo(p, item));
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
                        aria-label={`Motivo della mancata somministrazione delle ${time.ora}: ${actionTarget}`}
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
                              onNotAdministered?.(buildInfo(p, item), selectedMotivo, noteText);
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
          </li>
        );
      })}
    </ul>
  );
}
