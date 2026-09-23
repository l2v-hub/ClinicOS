import { ASSESSMENT_VERSIONS, type AssessmentType } from './assessmentTypes';
import type { CartellaPaziente } from '../../types';

export const CATALOG_TYPES = ['painad', 'postural_transfers', 'tinetti', 'mna', 'gds15'] as const;
export const CLINICAL_MODULES = [
  { tab: 'medicazioni', label: 'Medicazioni', group: 'Assistenza e mobilizzazione', type: null },
  { tab: 'contenzioni', label: 'Contenzioni', group: 'Assistenza e mobilizzazione', type: null },
  { tab: 'postural_transfers', label: 'Trasferimenti posturali', group: 'Assistenza e mobilizzazione', type: 'postural_transfers' },
  { tab: 'braden', label: 'Braden', group: 'Scale di valutazione', type: null },
  { tab: 'painad', label: 'PAINAD', group: 'Scale di valutazione', type: 'painad' },
  { tab: 'tinetti', label: 'Tinetti', group: 'Scale di valutazione', type: 'tinetti' },
  { tab: 'mna', label: 'MNA', group: 'Scale di valutazione', type: 'mna' },
  { tab: 'gds', label: 'GDS-15', group: 'Scale di valutazione', type: 'gds15' },
] as const;
export type ClinicalModule = typeof CLINICAL_MODULES[number];
interface CatalogRecord {
  id: string;
  formVersion: string;
  assessedAt: string;
  createdAt: string;
}
export interface AssessmentCatalogItem {
  type: AssessmentType;
  formVersion: string;
  latestFinal: (CatalogRecord & { finalizedAt: string }) | null;
  ownDraftCount: number;
  latestOwnDraft: (CatalogRecord & { updatedAt: string }) | null;
}
export interface AssessmentCatalogData { items: AssessmentCatalogItem[] }
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export function catalogInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function catalogRecord(value: unknown, version: string, last: 'finalizedAt' | 'updatedAt') {
  return value === null || (object(value) && exact(value, ['id', 'formVersion', 'assessedAt', 'createdAt', last]) &&
    typeof value.id === 'string' && value.id.length > 0 && value.formVersion === version &&
    ['assessedAt', 'createdAt', last].every(key => catalogInstant(value[key])));
}
export function parseAssessmentCatalog(value: unknown): AssessmentCatalogData {
  if (!object(value) || !exact(value, ['items']) || !Array.isArray(value.items) || value.items.length !== 5)
    throw new Error('Impossibile leggere date e bozze dei moduli.');
  const valid = value.items.every((item, index) => {
    const type = CATALOG_TYPES[index];
    const version = ASSESSMENT_VERSIONS[type];
    return object(item) && exact(item, ['type', 'formVersion', 'latestFinal', 'ownDraftCount', 'latestOwnDraft']) &&
      item.type === type && item.formVersion === version &&
      Number.isSafeInteger(item.ownDraftCount) && Number(item.ownDraftCount) >= 0 &&
      catalogRecord(item.latestFinal, version, 'finalizedAt') && catalogRecord(item.latestOwnDraft, version, 'updatedAt') &&
      ((item.ownDraftCount === 0) === (item.latestOwnDraft === null));
  });
  if (!valid) throw new Error('Impossibile leggere date e bozze dei moduli.');
  return value as unknown as AssessmentCatalogData;
}
export type AssessmentCatalogReader = (signal: AbortSignal) => Promise<AssessmentCatalogData>;
export function createAssessmentCatalogReader(base: string, patientId: string, headers: HeadersInit, request: typeof fetch = fetch): AssessmentCatalogReader {
  return async signal => {
    const response = await request(`${base}/patients/${encodeURIComponent(patientId)}/assessments/catalog`, { headers, signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Impossibile caricare date e bozze dei moduli.');
    return parseAssessmentCatalog(await response.json());
  };
}
export function legacyModuleCount(cartella: CartellaPaziente, tab: ClinicalModule['tab']): number | null {
  const rows: unknown = tab === 'medicazioni' ? cartella.medicazioniFerite : tab === 'contenzioni' ? cartella.contenzioni : tab === 'braden' ? cartella.valutazioniBraden : [];
  return rows === undefined ? 0 : Array.isArray(rows) ? rows.length : null;
}
/** Clinical legacy dates are not finalization metadata. Follow-ups are separate events. */
export function legacyModuleDate(cartella: CartellaPaziente, tab: ClinicalModule['tab']): string | null {
  const rows: unknown = tab === 'medicazioni' ? cartella.medicazioniFerite : tab === 'contenzioni' ? cartella.contenzioni : tab === 'braden' ? cartella.valutazioniBraden : [];
  const key = tab === 'contenzioni' ? 'dataInizio' : 'data';
  if (!Array.isArray(rows)) return null;
  const dates = rows.flatMap(row => {
    const value: unknown = object(row) ? row[key] : null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return [];
    const parsed = new Date(`${value}T12:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? [value] : [];
  });
  return dates.sort().at(-1) ?? null;
}
