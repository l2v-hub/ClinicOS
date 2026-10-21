// Read-only emergency transfer context. Printing never records an exit or changes therapy.
import type { DiarioPazienteEntry, PatientTherapyAPI } from '../types';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import {
  loadMedicationAdministrationPage,
  type MedicationAdministrationPage,
} from './medicationAdministrationPages';
import { fetchParameterReadings, type PatientParameterReading } from './patientParameterReadings';
import type { PrnAdministration } from './therapyAdministrationWrite';
import { facilityLocalDate } from './facilityTime';

export interface EmergencyScheduledAdministration {
  id: string;
  patientId: string;
  therapyId: string | null;
  farmacoNome: string;
  farmacoDose: string;
  farmacoVia: string;
  date: string;
  ora: string;
  stato: string;
  confirmedAt?: string | null;
}
export type EmergencySourceKey = 'therapies' | 'readings' | 'diary' | 'scheduled' | 'prn';
export type EmergencySourceState = 'loading' | 'verified' | 'partial' | 'unverifiable';
export interface EmergencySourceStatus {
  state: EmergencySourceState;
  detail: string;
}
export interface EmergencyTransferSources {
  patientId: string;
  loadedAt: string;
  therapies: PatientTherapyAPI[];
  readings: PatientParameterReading[];
  diary: DiarioPazienteEntry[];
  scheduled: EmergencyScheduledAdministration[];
  prn: PrnAdministration[];
  /** Optional only for older pure projection callers; the live loader always supplies statuses. */
  status?: Record<EmergencySourceKey, EmergencySourceStatus>;
}

export const EMERGENCY_PAGE_LIMIT = 2;
export const EMERGENCY_SOURCE_TIMEOUT_MS = 8000;
const SOURCE_KEYS: EmergencySourceKey[] = ['therapies', 'readings', 'diary', 'scheduled', 'prn'];
export function emptyEmergencyTransferSources(patientId: string): EmergencyTransferSources {
  return {
    patientId,
    loadedAt: '',
    therapies: [],
    readings: [],
    diary: [],
    scheduled: [],
    prn: [],
    status: Object.fromEntries(
      SOURCE_KEYS.map((key) => [
        key,
        {
          state: 'loading',
          detail: 'Fonte in caricamento: non verificabile, compilare a mano se necessario.',
        },
      ]),
    ) as Record<EmergencySourceKey, EmergencySourceStatus>,
  };
}

export function emergencySourceMessage(status: EmergencySourceStatus): string {
  const label =
    status.state === 'verified'
      ? 'Fonte verificata'
      : status.state === 'partial'
        ? 'Fonte parziale: completezza non verificabile, compilare a mano'
        : 'Fonte non verificabile, compilare a mano';
  return `${label}. ${status.detail}`;
}

type SourceRow =
  | PatientTherapyAPI
  | PatientParameterReading
  | DiarioPazienteEntry
  | EmergencyScheduledAdministration
  | PrnAdministration;
interface BoundedRows<T> {
  rows: T[];
  truncated: boolean;
}
async function boundedPages<T extends { id: string }>(
  signal: AbortSignal,
  load: (cursor: string | null) => Promise<MedicationAdministrationPage<T>>,
  validate: (row: T) => boolean,
): Promise<BoundedRows<T>> {
  const rows = new Map<string, T>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let n = 0; n < EMERGENCY_PAGE_LIMIT; n++) {
    signal.throwIfAborted();
    const page = await load(cursor);
    signal.throwIfAborted();
    if (
      !Array.isArray(page.items) ||
      page.items.length > 100 ||
      !page.pageInfo ||
      typeof page.pageInfo.hasMore !== 'boolean' ||
      (page.pageInfo.hasMore
        ? typeof page.pageInfo.nextCursor !== 'string' || !page.pageInfo.nextCursor
        : page.pageInfo.nextCursor !== null)
    )
      throw new Error('Fonte non valida');
    for (const row of page.items) {
      if (!row || typeof row.id !== 'string' || !row.id || !validate(row))
        throw new Error('Dato sorgente non valido');
      if (rows.has(row.id)) throw new Error('Dato sorgente cambiato: ricaricare');
      rows.set(row.id, row);
    }
    if (!page.pageInfo.hasMore) return { rows: [...rows.values()], truncated: false };
    const next = page.pageInfo.nextCursor!;
    if (cursors.has(next) || !page.items.length) throw new Error('Fonte incompleta');
    cursors.add(next);
    cursor = next;
  }
  return { rows: [...rows.values()], truncated: true };
}
function validScheduled(row: EmergencyScheduledAdministration, patientId: string) {
  return (
    row.patientId === patientId &&
    typeof row.id === 'string' &&
    ['stato', 'farmacoNome', 'farmacoDose', 'farmacoVia', 'date', 'ora'].every(
      (key) => typeof row[key as keyof EmergencyScheduledAdministration] === 'string',
    ) &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    (row.confirmedAt == null || Number.isFinite(Date.parse(row.confirmedAt)))
  );
}

/** Compatibility helper for complete small histories; never traverses more than two pages. */
export async function loadEmergencyAdministrationHistory(
  patientId: string,
  signal: AbortSignal,
  loadPage: (
    patientId: string,
    cursor: string | null,
  ) => Promise<
    MedicationAdministrationPage<EmergencyScheduledAdministration>
  > = loadMedicationAdministrationPage,
): Promise<EmergencyScheduledAdministration[]> {
  const result = await boundedPages(
    signal,
    (cursor) => loadPage(patientId, cursor),
    (row) => validScheduled(row, patientId),
  );
  if (result.truncated) throw new Error('Storico parziale: completezza non verificabile');
  return result.rows;
}

async function readJson(path: string, query: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`${API_URL}${path}?${query}`, {
    headers: operatorHeaders(),
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Fonte non disponibile o non autorizzata');
  return response.json();
}

/** Supported backend contracts inspected: readings measuredAt DESC; diary from/to civil
 * dates, entryDateTime DESC; administrations date/createdAt DESC (NOT confirmedAt).
 * No invented since/field filters. At most 11 GETs (3 PRN civil days across spring DST), concurrency 3, 8s per source.
 * Truncated administration pages cannot prove that late confirmations are absent. */
export async function loadEmergencyTransferSources(
  patientId: string,
  signal: AbortSignal,
  now = new Date(),
  options: {
    allowed?: Partial<Record<EmergencySourceKey, boolean>>;
    onProgress?: (sources: EmergencyTransferSources) => void;
  } = {},
): Promise<EmergencyTransferSources> {
  const sources = emptyEmergencyTransferSources(patientId);
  const today = facilityLocalDate(now);
  const yesterday = facilityLocalDate(new Date(now.getTime() - 24 * 3600000));
  const from = facilityLocalDate(new Date(now.getTime() - 48 * 3600000));
  // A 24-hour interval can touch three civil days when Rome advances to summer time.
  const prnDates: string[] = [];
  for (
    const day = new Date(`${yesterday}T12:00:00Z`);
    day.toISOString().slice(0, 10) <= today;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    prnDates.push(day.toISOString().slice(0, 10));
  }
  const path = `/patients/${encodeURIComponent(patientId)}`;
  const publish = () => {
    signal.throwIfAborted();
    options.onProgress?.({ ...sources, status: { ...sources.status! } });
  };
  publish();
  const loaders: Record<
    EmergencySourceKey,
    (signal: AbortSignal) => Promise<BoundedRows<SourceRow>>
  > = {
    therapies: async (sourceSignal) => {
      let total: number | undefined;
      const result = await boundedPages<PatientTherapyAPI>(
        sourceSignal,
        async (cursor) => {
          const page = await readJson(
            `${path}/therapies/page`,
            new URLSearchParams({
              limit: '100',
              status: 'attiva',
              ...(cursor ? { cursor } : {}),
            }),
            sourceSignal,
          );
          if (!cursor || page.summary) {
            if (
              !page.summary ||
              !Number.isSafeInteger(page.summary.total) ||
              page.summary.total < 0 ||
              page.summary.active !== page.summary.total ||
              page.summary.inactive !== 0 ||
              (total !== undefined && total !== page.summary.total)
            )
              throw new Error('Riepilogo terapie non valido');
            total = page.summary.total;
          }
          return page;
        },
        (row) =>
          row.patientId === patientId &&
          row.stato === 'attiva' &&
          ['farmacoNome', 'dosaggio', 'viaSomministrazione'].every(
            (key) => typeof row[key as keyof PatientTherapyAPI] === 'string',
          ) &&
          (!row.schedules ||
            (Array.isArray(row.schedules) &&
              row.schedules.every(
                (s) =>
                  s &&
                  typeof s.time === 'string' &&
                  typeof s.administrationUnit === 'string' &&
                  Number.isFinite(s.quantityNumerator) &&
                  Number.isFinite(s.quantityDenominator),
              ))),
      );
      if (
        result.truncated
          ? total === undefined || total <= result.rows.length
          : total !== result.rows.length
      )
        throw new Error('Elenco terapie incompleto');
      return result;
    },
    readings: async (sourceSignal) =>
      boundedPages<PatientParameterReading>(
        sourceSignal,
        async (cursor) => {
          const page = await fetchParameterReadings(
            API_URL,
            patientId,
            { ...(cursor ? { cursor } : {}) },
            { headers: operatorHeaders(), signal: sourceSignal },
          );
          return { items: page.readings, pageInfo: page };
        },
        (row) =>
          row.patientId === patientId &&
          Number.isFinite(Date.parse(row.measuredAt)) &&
          Boolean(row.values) &&
          typeof row.values === 'object' &&
          Object.values(row.values).every((value) => typeof value === 'string'),
      ),
    diary: async (sourceSignal) =>
      boundedPages<DiarioPazienteEntry>(
        sourceSignal,
        async (cursor) => {
          const page = await readJson(
            `${path}/diary`,
            new URLSearchParams({
              limit: '100',
              from,
              to: today,
              ...(cursor ? { cursor } : {}),
            }),
            sourceSignal,
          );
          return { items: page.entries, pageInfo: page };
        },
        (row) =>
          row.patientId === patientId &&
          typeof row.entryDateTime === 'string' &&
          typeof row.content === 'string' &&
          (row.title == null || typeof row.title === 'string'),
      ),
    scheduled: async (sourceSignal) =>
      boundedPages<EmergencyScheduledAdministration>(
        sourceSignal,
        (cursor) =>
          readJson(
            `${path}/medication-administrations/page`,
            new URLSearchParams({
              limit: '100',
              ...(cursor ? { cursor } : {}),
            }),
            sourceSignal,
          ),
        (row) => validScheduled(row, patientId),
      ),
    prn: async (sourceSignal) => {
      const rows: PrnAdministration[] = [];
      let truncated = false;
      for (const date of prnDates) {
        sourceSignal.throwIfAborted();
        const body = await readJson(
          '/therapy-slots/prn',
          new URLSearchParams({ patientId, date }),
          sourceSignal,
        );
        if (!Array.isArray(body.items) || body.items.length > 200)
          throw new Error('Dosi al bisogno non valide');
        const ids = new Set(rows.map((row) => row.id));
        for (const row of body.items) {
          if (
            !row ||
            row.patientId !== patientId ||
            row.date !== date ||
            typeof row.id !== 'string' ||
            !row.id ||
            ids.has(row.id) ||
            !['drugName', 'dosage', 'route'].every((key) => typeof row[key] === 'string') ||
            !Number.isFinite(Date.parse(row.administeredAt))
          )
            throw new Error('Dosi al bisogno non valide');
          ids.add(row.id);
          rows.push(row);
        }
        truncated ||= body.items.length === 200;
      }
      return { rows, truncated };
    },
  };
  const details: Record<EmergencySourceKey, string> = {
    therapies: 'Prescrizioni attive: massimo 2 pagine da 100.',
    readings:
      'Ultimi valori disponibili nelle prime 2 pagine da 50, ordinate per rilevazione decrescente; campi mancanti da verificare.',
    diary: `Diario dal ${from} al ${today}, massimo 2 pagine da 100; note urgenti mostrate nelle ultime 24 ore.`,
    scheduled:
      'Prime 2 pagine da 100 per data prevista decrescente; dosi mostrate nelle ultime 24 ore. In caso di fonte parziale anche le conferme tardive restano da verificare.',
    prn: `Dosi al bisogno dal ${yesterday} al ${today}; al limite di 200 per giorno la completezza non è verificabile.`,
  };
  const jobs = [...SOURCE_KEYS];
  async function worker() {
    for (let key = jobs.shift(); key; key = jobs.shift()) {
      signal.throwIfAborted();
      if (options.allowed?.[key] === false) {
        sources.status![key] = {
          state: 'unverifiable',
          detail: 'Consultazione non autorizzata per il ruolo corrente.',
        };
        publish();
        continue;
      }
      const controller = new AbortController();
      const abort = () => controller.abort(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          loaders[key](controller.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error('Timeout'));
            }, EMERGENCY_SOURCE_TIMEOUT_MS);
          }),
        ]);
        signal.throwIfAborted();
        Object.assign(sources, { [key]: result.rows });
        sources.status![key] = {
          state: result.truncated ? 'partial' : 'verified',
          detail: details[key],
        };
      } catch {
        signal.throwIfAborted();
        sources.status![key] = {
          state: 'unverifiable',
          detail:
            'Fonte non disponibile, non valida o tempo di lettura superato. Nessuna assenza clinica verificata.',
        };
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
      }
      publish();
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  signal.throwIfAborted();
  sources.loadedAt = new Date().toISOString();
  return { ...sources, status: { ...sources.status! } };
}
