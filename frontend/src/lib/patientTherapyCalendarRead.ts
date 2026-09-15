import { API_URL } from '../config';
import type { PatientTherapyAPI } from '../types';
import { operatorHeaders } from './operatorSession';

const MAX_PAGES = 50;
const PAGE_SIZE = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertTherapy(value: unknown, patientId: string): asserts value is PatientTherapyAPI {
  if (
    !isRecord(value) ||
    value.patientId !== patientId ||
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.farmacoNome !== 'string' ||
    !value.farmacoNome.trim() ||
    typeof value.dosaggio !== 'string' ||
    typeof value.viaSomministrazione !== 'string' ||
    !['attiva', 'sospesa', 'conclusa'].includes(String(value.stato)) ||
    !['periodica', 'una_tantum', 'al_bisogno'].includes(String(value.tipo)) ||
    typeof value.dataInizio !== 'string' ||
    ['dataFine', 'dataSomministrazione', 'orarioSomministrazione', 'orarioSpecifico'].some(
      (key) => value[key] !== null && typeof value[key] !== 'string',
    ) ||
    (value.giorniSettimana != null && typeof value.giorniSettimana !== 'string') ||
    ['fasceMattina', 'fascePranzo', 'fascePomeriggio', 'fasceSera', 'fasceNotte'].some(
      (key) => typeof value[key] !== 'boolean',
    )
  ) {
    throw new Error('Dati delle terapie non validi per il paziente');
  }
  if (
    value.schedules !== undefined &&
    (!Array.isArray(value.schedules) ||
      value.schedules.length > 32 ||
      value.schedules.some(
        (schedule) =>
          !isRecord(schedule) ||
          typeof schedule.id !== 'string' ||
          schedule.therapyId !== value.id ||
          typeof schedule.time !== 'string' ||
          typeof schedule.quantityNumerator !== 'number' ||
          typeof schedule.quantityDenominator !== 'number' ||
          typeof schedule.administrationUnit !== 'string',
      ))
  ) {
    throw new Error('Orari delle terapie non validi');
  }
}

/** Complete patient-scoped read, uncached so refresh/retry never republishes an old partial list. */
export async function readPatientCalendarTherapies(
  patientId: string,
  signal: AbortSignal,
  timeoutMs = 15_000,
): Promise<PatientTherapyAPI[]> {
  if (!patientId.trim()) throw new Error('Paziente non valido');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(cancel, timeoutMs);
  const items = new Map<string, PatientTherapyAPI>();
  const seen = new Set<string>();
  let cursor: string | null = null;
  let expectedTotal = 0;
  try {
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      controller.signal.throwIfAborted();
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), status: 'attiva' });
      if (cursor) query.set('cursor', cursor);
      const response = await fetch(
        `${API_URL}/patients/${encodeURIComponent(patientId)}/therapies/page?${query}`,
        {
          headers: operatorHeaders(),
          signal: controller.signal,
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new Error(`Caricamento terapie: errore ${response.status}`);
      const page: unknown = await response.json();
      controller.signal.throwIfAborted();
      if (
        !isRecord(page) ||
        !Array.isArray(page.items) ||
        page.items.length > PAGE_SIZE ||
        !isRecord(page.pageInfo) ||
        typeof page.pageInfo.hasMore !== 'boolean' ||
        (page.pageInfo.hasMore
          ? typeof page.pageInfo.nextCursor !== 'string' ||
            !page.pageInfo.nextCursor ||
            !page.items.length
          : page.pageInfo.nextCursor !== null)
      )
        throw new Error('Paginazione terapie non valida');
      if (pageIndex === 0) {
        const summary = page.summary;
        if (
          !isRecord(summary) ||
          !Number.isSafeInteger(summary.total) ||
          Number(summary.total) < 0 ||
          summary.active !== summary.total ||
          summary.inactive !== 0
        )
          throw new Error('Riepilogo terapie non valido');
        expectedTotal = Number(summary.total);
        if (expectedTotal > MAX_PAGES * PAGE_SIZE)
          throw new Error('Terapie oltre il limite del calendario');
      }
      for (const item of page.items) {
        assertTherapy(item, patientId);
        if (item.stato !== 'attiva' || items.has(item.id))
          throw new Error('Elenco terapie cambiato: riprovare');
        items.set(item.id, item);
      }
      if (!page.pageInfo.hasMore) {
        if (items.size !== expectedTotal) throw new Error('Elenco terapie incompleto: riprovare');
        return [...items.values()];
      }
      const next = page.pageInfo.nextCursor as string;
      if (seen.has(next)) throw new Error('Paginazione terapie non valida');
      seen.add(next);
      cursor = next;
    }
    throw new Error('Terapie oltre il limite del calendario');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
