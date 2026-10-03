import { useEffect, useState } from 'react';
import type { FasciaOrariaTerapia, TherapySlot } from '../../types';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { buildTherapySlotPageUrl, parseTherapySlotPage } from '../../lib/therapySlotPage';
import { localIsoDate } from '../../lib/appointmentRange';
import { cellLabel, cellTone, weekDays, weekFasce } from '../../lib/therapyWeek';
import { slotDoses } from '../../lib/therapyDoseStatus';
import { TherapyDoseList } from '../shared/TherapyDoseList';
import './TherapyWeekCalendar.css';

type DayState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; slots: TherapySlot[]; exact: boolean };

interface Props {
  /** Un giorno qualsiasi della settimana da mostrare. */
  date: string;
  /** Apre il giro di quel giorno su quella fascia. */
  onOpen: (date: string, fascia: FasciaOrariaTerapia) => void;
}

const WEEKDAY = new Intl.DateTimeFormat('it-IT', { weekday: 'short' });
const DAY = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
});
const LONG = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const at = (d: string) => new Date(`${d}T12:00:00`);

/**
 * Settimana del giro terapia: per ogni giorno e fascia i totali reali del servizio delle fasce e,
 * senza tocchi, l'elenco delle dosi (paziente · farmaco · dose · stato, in ritardo per prime).
 * Su tablet verticale la griglia a 7 colonne diventa un elenco per giorno (nomi mai troncati).
 */
export function TherapyWeekCalendar({ date, onOpen }: Props) {
  const days = weekDays(date);
  const key = days[0];
  const [state, setState] = useState<{
    key: string;
    days: Record<string, DayState>;
  }>({
    key,
    days: {},
  });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    for (const day of weekDays(key)) {
      fetch(buildTherapySlotPageUrl(API_URL, day), {
        headers: operatorHeaders(),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          const page = parseTherapySlotPage(await response.json());
          const ready: DayState = {
            status: 'ready',
            slots: page.slots,
            exact: page.pageInfo.summaryExact,
          };
          // Una settimana nuova riparte da zero; le richieste della precedente sono annullate.
          setState((current) => ({
            key,
            days: { ...(current.key === key ? current.days : {}), [day]: ready },
          }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState((current) => ({
            key,
            days: { ...(current.key === key ? current.days : {}), [day]: { status: 'error' } },
          }));
        });
    }
    return () => controller.abort();
  }, [key, retry]);

  const byDay: Record<string, DayState> = state.key === key ? state.days : {};
  const ready: Record<string, TherapySlot[] | undefined> = Object.fromEntries(
    days.map((d) => {
      const s = byDay[d];
      return [d, s?.status === 'ready' ? s.slots : undefined];
    }),
  );
  const fasce = weekFasce(ready);
  const today = localIsoDate();
  const nowHm = new Date().toTimeString().slice(0, 5);
  const anyError = days.some((d) => byDay[d]?.status === 'error');
  const anyLoading = days.some((d) => !byDay[d] || byDay[d].status === 'loading');
  const partialDays = days.filter((d) => {
    const s = byDay[d];
    return s?.status === 'ready' && !s.exact;
  });

  return (
    <section className="tcal" aria-label="Calendario della settimana">
      {anyError && (
        <div className="tcal__note" role="alert">
          Alcuni giorni non sono stati caricati: i loro totali non sono mostrati.
          <button
            type="button"
            className="ds-btn ds-btn--secondary"
            onClick={() => {
              setState({ key, days: {} });
              setRetry((n) => n + 1);
            }}
          >
            Riprova
          </button>
        </div>
      )}
      {partialDays.length > 0 && (
        <p className="tcal__note" role="status">
          Totali non esatti per {partialDays.map((x) => LONG.format(at(x))).join(', ')}: aprire il
          giro per il dettaglio.
        </p>
      )}
      {anyLoading && fasce.length === 0 ? (
        <p role="status">Caricamento della settimana…</p>
      ) : fasce.length === 0 && !anyError ? (
        <p className="tcal__note">Nessuna terapia programmata in questa settimana.</p>
      ) : (
        <div className="tcal__scroll">
          <table className="tcal__table">
            <thead>
              <tr>
                <th scope="col" className="tcal__corner">
                  <span className="ds-sr-only">Fascia</span>
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    scope="col"
                    className={`tcal__day${d === today ? ' tcal__day--today' : ''}`}
                    aria-current={d === today ? 'date' : undefined}
                  >
                    <span className="tcal__weekday">{WEEKDAY.format(at(d))}</span>
                    <span className="tcal__date">{DAY.format(at(d))}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fasce.map((f) => (
                <tr key={f.fascia}>
                  <th scope="row" className="tcal__fascia">
                    {f.ora}
                  </th>
                  {days.map((d) => {
                    const s = byDay[d];
                    if (!s || s.status === 'loading')
                      return (
                        <td key={d} className="tcal__cell tcal__cell--wait">
                          <span aria-hidden="true">…</span>
                          <span className="ds-sr-only">Caricamento</span>
                        </td>
                      );
                    if (s.status === 'error')
                      return (
                        <td key={d} className="tcal__cell tcal__cell--wait">
                          <span aria-hidden="true">—</span>
                          <span className="ds-sr-only">Non caricato</span>
                        </td>
                      );
                    const slot = s.slots.find((x) => x.fascia === f.fascia);
                    const tone = cellTone(slot, d, today, nowHm);
                    if (!slot || tone === 'vuota')
                      return (
                        <td key={d} className="tcal__cell">
                          <span className="tcal__none" aria-hidden="true">
                            ·
                          </span>
                          <span className="ds-sr-only">Nessuna somministrazione</span>
                        </td>
                      );
                    const doneCount = slot.summary.administered + slot.summary.notAdministered;
                    return (
                      <td key={d} className="tcal__cell">
                        <button
                          type="button"
                          className={`tcal__btn tcal__btn--${s.exact ? tone : 'parziale'}`}
                          aria-label={`${LONG.format(at(d))}, ore ${slot.ora}: ${cellLabel(slot, tone)}${s.exact ? '' : ' (totali non esatti)'}. Apri il giro`}
                          onClick={() => onOpen(d, slot.fascia)}
                        >
                          <span className="tcal__count">
                            {doneCount}/{slot.summary.total}
                          </span>
                          {tone === 'mancanti' && (
                            <span className="tcal__hint">{slot.summary.pending} da verificare</span>
                          )}
                          {tone === 'da-fare' && (
                            <span className="tcal__hint">{slot.summary.pending} da fare</span>
                          )}
                        </button>
                        <TherapyDoseList
                          doses={slotDoses(slot, d)}
                          partial={!s.exact || loadedCount(slot) < slot.summary.total}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {fasce.length > 0 && (
        <ol className="tcal__stack" aria-label="Dosi della settimana per giorno">
          {days.map((d) => {
            const s = byDay[d];
            return (
              <li key={d} className={`tcal__stack-day${d === today ? ' is-today' : ''}`}>
                <h3 className="tcal__stack-head">{LONG.format(at(d))}</h3>
                {(!s || s.status === 'loading') && <p role="status">Caricamento…</p>}
                {s?.status === 'error' && <p>Giorno non caricato.</p>}
                {s?.status === 'ready' &&
                  (s.slots.length === 0 ? (
                    <p className="tcal__none-text">Nessuna somministrazione.</p>
                  ) : (
                    s.slots
                      .filter((slot) => slot.summary.total > 0)
                      .sort((a, b) => a.ora.localeCompare(b.ora))
                      .map((slot) => (
                        <section key={slot.fascia} className="tcal__stack-fascia">
                          <button
                            type="button"
                            className="tcal__stack-open"
                            onClick={() => onOpen(d, slot.fascia)}
                            aria-label={`${LONG.format(at(d))}, ore ${slot.ora}: ${cellLabel(slot, cellTone(slot, d, today, nowHm))}. Apri il giro`}
                          >
                            <strong>{slot.ora}</strong>{' '}
                            {slot.summary.administered + slot.summary.notAdministered}/
                            {slot.summary.total} registrate · Apri il giro
                          </button>
                          <TherapyDoseList
                            doses={slotDoses(slot, d)}
                            partial={!s.exact || loadedCount(slot) < slot.summary.total}
                          />
                        </section>
                      ))
                  ))}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function loadedCount(slot: TherapySlot): number {
  return (slot.patients ?? []).reduce((n, p) => n + p.administrations.length, 0);
}
