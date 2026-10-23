import { useEffect, useState } from 'react';
import type { PatientTherapyAPI } from '../../types';
import { readPatientCalendarTherapies } from '../../lib/patientTherapyCalendarRead';
import { buildPatientTherapyDay } from '../../lib/patientTherapyCalendar';
import { facilityLocalMinute } from '../../lib/facilityTime';
import { useRecencyClock } from '../../lib/useRecencyClock';
import { useCan } from '../../lib/capabilities';
import { useUnreadUrgencies } from '../../lib/useUnreadUrgencies';
import {
  PARAMETER_FIELDS,
  formatParameterValue,
  fetchParameterReadings,
  readingTime,
  type PatientParameterReading,
} from '../../lib/patientParameterReadings';
import { API_URL } from '../../config';
import { operatorHeaders } from '../../lib/operatorSession';
import { postDiaryAck } from './cartella/diaryAck';
import { postUrgencyAck, URGENCY_ACKNOWLEDGED_EVENT } from '../../lib/urgency';
import type { UnreadDiaryEntry } from '../../lib/diaryUnreadQueue';
import { UrgencyNotice } from '../shared/UrgencyNotice';
import { PatientTherapySlotDetail } from './cartella/PatientTherapySlotDetail';
import { TherapyDrugDosePanel, useExitRevision } from './cartella/TherapyDrugDosePanel';

export function todayReadings(readings: PatientParameterReading[], day: string) {
  return readings.filter((r) => facilityLocalMinute(new Date(r.measuredAt)).slice(0, 10) === day);
}

/** The daily count and latest values require every page, never an exact count from a prefix. */
export async function loadTodayReadings(
  patientId: string,
  date: string,
  signal: AbortSignal,
  readPage = fetchParameterReadings,
): Promise<PatientParameterReading[]> {
  const readings = new Map<string, PatientParameterReading>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < 200; pageIndex++) {
    const page = await readPage(
      API_URL,
      patientId,
      { date, cursor },
      {
        headers: operatorHeaders(),
        signal,
      },
    );
    if (signal.aborted) throw new DOMException('Lettura annullata', 'AbortError');
    for (const reading of page.readings) {
      if (
        !reading.id ||
        reading.patientId !== patientId ||
        !Number.isFinite(Date.parse(reading.measuredAt)) ||
        facilityLocalMinute(new Date(reading.measuredAt)).slice(0, 10) !== date
      )
        throw new Error('Storico del giorno non verificabile');
      readings.set(reading.id, reading);
    }
    if (!page.hasMore)
      return [...readings.values()].sort(
        (a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt) || b.id.localeCompare(a.id),
      );
    if (!page.nextCursor || cursors.has(page.nextCursor) || !page.readings.length)
      throw new Error('Storico del giorno incompleto');
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw new Error('Storico del giorno incompleto');
}

/** Reuses existing dose write and shared urgency acknowledgement boundaries. */
export function PatientToday({
  patientId,
  onRecordVitals,
  onOpenDiary,
}: {
  patientId: string;
  onRecordVitals: () => void;
  onOpenDiary?: () => void;
}) {
  const now = useRecencyClock(),
    date = facilityLocalMinute(now).slice(0, 10),
    key = `${patientId}:${date}`;
  const canTherapy = useCan('therapy.list'),
    canVitals = useCan('parameters.list_readings'),
    canRecord = useCan('parameters.create_reading'),
    canDiary = useCan('diary.list');
  const urgencies = useUnreadUrgencies(canDiary);
  const [state, setState] = useState<{
    key: string;
    therapies: PatientTherapyAPI[];
    readings: PatientParameterReading[];
    therapyError: boolean;
    vitalError: boolean;
  } | null>(null);
  const [revision, setRevision] = useExitRevision(patientId),
    [ack, setAck] = useState(''),
    [ackError, setAckError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    void Promise.allSettled([
      canTherapy ? readPatientCalendarTherapies(patientId, c.signal) : Promise.resolve([]),
      canVitals ? loadTodayReadings(patientId, date, c.signal) : Promise.resolve([]),
    ]).then(([t, v]) => {
      if (!c.signal.aborted)
        setState((previous) => ({
          key,
          therapies: t.status === 'fulfilled' ? t.value : previous?.key === key ? previous.therapies : [],
          readings: v.status === 'fulfilled' ? v.value : previous?.key === key ? previous.readings : [],
          therapyError: t.status === 'rejected',
          vitalError: v.status === 'rejected',
        }));
    });
    return () => c.abort();
  }, [patientId, key, revision, canTherapy, canVitals]);
  const current = state?.key === key ? state : null;
  const day = buildPatientTherapyDay(current?.therapies ?? [], patientId, date);
  const times = [...new Set(day.events.map((e) => e.time))].sort();
  const readings = todayReadings(current?.readings ?? [], date);
  const rows = urgencies.rows.filter((row) => row.patientId === patientId);
  async function acknowledge(row: UnreadDiaryEntry) {
    if (ack) return;
    setAck(row.id);
    setAckError('');
    try {
      if (row.sourceType === 'diary') await postDiaryAck(patientId, row.sourceId);
      else
        await postUrgencyAck(
          `${API_URL}/consegne/${encodeURIComponent(row.sourceId)}/ack`,
          operatorHeaders(),
        );
      window.dispatchEvent(new CustomEvent(URGENCY_ACKNOWLEDGED_EVENT, { detail: { patientId } }));
    } catch {
      setAckError('Conferma non registrata. Riprova.');
    } finally {
      setAck('');
    }
  }
  return (
    <section className="patient-today" data-patient-today>
      <h2>Oggi · {date.split('-').reverse().join('/')}</h2>
      {canTherapy && (
        <section aria-label="Terapia di oggi">
          <h3>Terapia di oggi</h3>
          {!current ? (
            <p role="status">Caricamento terapie…</p>
          ) : (
            <>
              {current.therapyError && (
                <p role="alert">
                  Aggiornamento terapie non disponibile.{' '}
                  <button className="ds-link" onClick={() => setRevision((r) => r + 1)}>
                    Riprova
                  </button>
                </p>
              )}
              {!current.therapyError && !day.events.length && !day.unscheduled.length && (
                <p>Nessuna terapia programmata oggi.</p>
              )}
              {times.map((time) => (
                <div key={`${key}:${time}`} className="patient-today__time">
                  <h4>Ore {time}</h4>
                  <PatientTherapySlotDetail
                    patientId={patientId}
                    date={date}
                    time={time}
                    events={day.events.filter((e) => e.time === time)}
                    embedded
                    refreshRevision={revision}
                    onClose={() => {}}
                  />
                </div>
              ))}
              {day.unscheduled.map((item) => (
                <div key={item.therapyId}>
                  <strong>{item.drugName}</strong>
                  <span>
                    {' '}
                    · {item.dose} · {item.route}
                  </span>
                  {item.kind === 'as_needed' ? (
                    <TherapyDrugDosePanel
                      patientId={patientId}
                      therapy={current.therapies.find((t) => t.id === item.therapyId)!}
                    />
                  ) : (
                    <p>{item.reason} · Verifica nella Terapia.</p>
                  )}
                </div>
              ))}
            </>
          )}
        </section>
      )}
      {canDiary && (
        <section aria-label="Urgenze da comprendere">
          <h3>Urgenze del diario e consegne</h3>
          {urgencies.state === 'loading' ? (
            <p role="status">Caricamento urgenze…</p>
          ) : urgencies.state === 'error' ? (
            <p role="alert">Urgenze non disponibili: consulta Diario e Consegne.</p>
          ) : (
            <>
              {rows.map((row) => (
                <article key={row.id} data-today-urgency={row.id}>
                  <strong>{row.title || 'Nota urgente'}</strong>
                  <p>{row.content}</p>
                  <UrgencyNotice
                    urgency={row.urgency}
                    subject={row.title ?? undefined}
                    busy={ack === row.id}
                    disabled={Boolean(ack)}
                    onAcknowledge={() => void acknowledge(row)}
                  />
                </article>
              ))}
              {urgencies.atLeast ? (
                <p role="status">
                  La coda è parziale: consulta Diario e Consegne per tutte le voci.
                </p>
              ) : (
                !rows.length && <p>Nessuna urgenza da comprendere nella coda verificata.</p>
              )}
            </>
          )}
          {ackError && <p role="alert">{ackError}</p>}
          {onOpenDiary && (
            <button type="button" className="ds-link" onClick={onOpenDiary}>
              Apri diario completo
            </button>
          )}
        </section>
      )}
      {canVitals && (
        <p className="patient-today__vitals" role="status">
          {!current
            ? 'Caricamento parametri…'
            : current.vitalError
              ? 'Parametri non disponibili'
              : readings.length
                ? `${readings.length} rilevazioni oggi · ultima ${readingTime(readings[0].measuredAt)} · ${PARAMETER_FIELDS.filter(
                    (field) => readings[0].values[field.key]?.trim(),
                  )
                    .map(
                      (field) =>
                        `${field.label} ${formatParameterValue(field.key, readings[0].values[field.key]!)} ${field.unit}`,
                    )
                    .join(' · ')}`
                : 'Nessuna rilevazione oggi'}
          {canRecord && (
            <>
              {' '}
              ·{' '}
              <button className="ds-link" onClick={onRecordVitals}>
                Rileva ora
              </button>
            </>
          )}
        </p>
      )}
    </section>
  );
}
