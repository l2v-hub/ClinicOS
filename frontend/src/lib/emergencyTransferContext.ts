// Read-only emergency transfer context. Printing never records an exit or changes therapy.
import type { DiarioPazienteEntry, PatientTherapyAPI } from '../types';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
import { loadAllDiaryPages } from './diaryPages';
import { loadAllTherapyPages } from './therapyPages';
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
export interface EmergencyTransferSources {
  patientId: string;
  loadedAt: string;
  therapies: PatientTherapyAPI[];
  readings: PatientParameterReading[];
  diary: DiarioPazienteEntry[];
  scheduled: EmergencyScheduledAdministration[];
  prn: PrnAdministration[];
}
const MAX_PAGES = 1000;
function assertActive(signal: AbortSignal) {
  signal.throwIfAborted();
}

/** Full keyset feed: no oldest-first shortcut based on the prescribed time. */
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
  const rows = new Map<string, EmergencyScheduledAdministration>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber++) {
    assertActive(signal);
    const page = await loadPage(patientId, cursor);
    assertActive(signal);
    for (const row of page.items) {
      if (
        !row ||
        row.patientId !== patientId ||
        typeof row.id !== 'string' ||
        !row.id ||
        typeof row.stato !== 'string' ||
        typeof row.farmacoNome !== 'string' ||
        typeof row.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
        (row.confirmedAt != null && !Number.isFinite(Date.parse(row.confirmedAt)))
      )
        throw new Error('Storico somministrazioni non valido');
      if (rows.has(row.id)) throw new Error('Storico somministrazioni cambiato: ricaricare');
      rows.set(row.id, row);
    }
    if (!page.pageInfo.hasMore) return [...rows.values()];
    const next = page.pageInfo.nextCursor;
    if (!next || cursors.has(next) || page.items.length === 0)
      throw new Error('Storico somministrazioni incompleto');
    cursors.add(next);
    cursor = next;
  }
  throw new Error('Storico somministrazioni oltre il limite operativo');
}

async function loadEmergencyReadings(patientId: string, signal: AbortSignal) {
  const rows = new Map<string, PatientParameterReading>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber++) {
    assertActive(signal);
    const page = await fetchParameterReadings(
      API_URL,
      patientId,
      { cursor },
      { headers: operatorHeaders(), signal },
    );
    for (const row of page.readings) {
      if (
        !row ||
        row.patientId !== patientId ||
        !row.id ||
        !Number.isFinite(Date.parse(row.measuredAt)) ||
        !row.values ||
        typeof row.values !== 'object' ||
        rows.has(row.id)
      )
        throw new Error('Parametri non validi o cambiati: ricaricare');
      rows.set(row.id, row);
    }
    if (!page.hasMore) return [...rows.values()];
    if (!page.nextCursor || cursors.has(page.nextCursor) || page.readings.length === 0)
      throw new Error('Storico parametri incompleto');
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw new Error('Storico parametri oltre il limite operativo');
}

/** The legacy PRN endpoint has a 200-row hard cap, without a completeness flag. At that
 * boundary completeness is unknown, so printing is blocked rather than silently truncated. */
async function loadEmergencyPrnDay(
  patientId: string,
  date: string,
  signal: AbortSignal,
): Promise<PrnAdministration[]> {
  const query = new URLSearchParams({ patientId, date });
  const response = await fetch(`${API_URL}/therapy-slots/prn?${query}`, {
    headers: operatorHeaders(),
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Dosi al bisogno non disponibili');
  const body: unknown = await response.json();
  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length >= 200)
    throw new Error('Completezza delle dosi al bisogno non verificabile');
  const ids = new Set<string>();
  for (const row of items) {
    if (
      !row ||
      row.patientId !== patientId ||
      row.date !== date ||
      typeof row.id !== 'string' ||
      !row.id ||
      ids.has(row.id) ||
      typeof row.drugName !== 'string' ||
      typeof row.dosage !== 'string' ||
      typeof row.route !== 'string' ||
      !Number.isFinite(Date.parse(row.administeredAt))
    )
      throw new Error('Dosi al bisogno non valide');
    ids.add(row.id);
  }
  return items as PrnAdministration[];
}

export async function loadEmergencyTransferSources(
  patientId: string,
  signal: AbortSignal,
  now = new Date(),
): Promise<EmergencyTransferSources> {
  const today = facilityLocalDate(now);
  const previous = new Date(`${today}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const yesterday = previous.toISOString().slice(0, 10);
  const [therapies, readings, diary, scheduled, todayPrn, yesterdayPrn] = await Promise.all([
    loadAllTherapyPages(patientId, 'attiva'),
    loadEmergencyReadings(patientId, signal),
    loadAllDiaryPages(patientId, signal),
    loadEmergencyAdministrationHistory(patientId, signal),
    loadEmergencyPrnDay(patientId, today, signal),
    loadEmergencyPrnDay(patientId, yesterday, signal),
  ]);
  assertActive(signal);
  if (
    therapies.some((row) => row.patientId !== patientId) ||
    diary.some((row) => row.patientId !== patientId)
  )
    throw new Error('Contesto clinico non coerente con il paziente');
  return {
    patientId,
    loadedAt: new Date().toISOString(),
    therapies,
    readings,
    diary,
    scheduled,
    prn: [...todayPrn, ...yesterdayPrn],
  };
}
