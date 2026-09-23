import { catalogInstant } from './assessments/assessmentCatalog';
import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { operatorHeaders } from './operatorSession';
export interface PatientIntakeReviewState {
  status: 'loading' | 'ready' | 'error';
  data: PatientIntakeReviewData | null;
}
/** Shared by retained therapies and NRS; a patient/actor change hides previous results immediately. */
export function usePatientIntakeReview(patientId: string, operatorId: string, operatorRole?: string) {
  const scope = JSON.stringify([patientId, operatorId, operatorRole ?? '']);
  const [result, setResult] = useState<{ scope: string; state: PatientIntakeReviewState } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`${API_URL}/patients/${encodeURIComponent(patientId)}/intake-review`, {
      headers: operatorHeaders(), signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error('Revisione ingresso non disponibile');
      return parsePatientIntakeReview(await response.json());
    }).then(data => {
      if (active && !controller.signal.aborted) setResult({ scope, state: { status: 'ready', data } });
    }).catch(() => {
      if (active && !controller.signal.aborted) setResult({ scope, state: { status: 'error', data: null } });
    });
    return () => { active = false; controller.abort(); };
  }, [patientId, scope, retry]);
  const state: PatientIntakeReviewState = result?.scope === scope ? result.state : { status: 'loading', data: null };
  return {
    state,
    retry: () => { setResult(null); setRetry(value => value + 1); },
  };
}
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface LegacyPainDraft { draftId: string; confirmedAt: string | null; pain: JsonValue }
export interface DeferredTherapy {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  times: string[];
  notes: string;
  reason: string;
}
export interface PatientIntakeReviewData {
  draftId: string | null;
  deferredTherapies: DeferredTherapy[];
  sourceDocumentIds: string[];
  legacyPainDrafts: LegacyPainDraft[] | null;
  legacyPainError: 'intake_review_legacy_pain_too_large' | null;
}
function isJson(value: unknown): value is JsonValue {
  const pending = [value];
  const seen = new Set<object>();
  while (pending.length) {
    const item = pending.pop();
    if (item === null || typeof item === 'string' || typeof item === 'boolean') continue;
    if (typeof item === 'number' && Number.isFinite(item)) continue;
    if (!item || typeof item !== 'object' || seen.has(item)) return false;
    seen.add(item);
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype) return false;
    for (const child of Object.values(item)) pending.push(child);
  }
  return true;
}
function parseLegacyPain(data: Record<string, unknown>): Pick<PatientIntakeReviewData, 'legacyPainDrafts' | 'legacyPainError'> {
  const present = Object.hasOwn(data, 'legacyPainDrafts');
  const errorPresent = Object.hasOwn(data, 'legacyPainError');
  if (!present && !errorPresent) return { legacyPainDrafts: [], legacyPainError: null };
  if (!present || !errorPresent) throw new Error('Dati dolore dell’ingresso non validi');
  if (data.legacyPainDrafts === null && data.legacyPainError === 'intake_review_legacy_pain_too_large')
    return { legacyPainDrafts: null, legacyPainError: data.legacyPainError };
  if (data.legacyPainError !== null || !Array.isArray(data.legacyPainDrafts) || data.legacyPainDrafts.length > 100)
    throw thesePainError();
  const ids = new Set<string>();
  for (const row of data.legacyPainDrafts) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== 3 ||
      typeof row.draftId !== 'string' || !row.draftId || ids.has(row.draftId) ||
      !(row.confirmedAt === null || catalogInstant(row.confirmedAt)) || !Object.hasOwn(row, 'pain') || !isJson(row.pain))
      throw thesePainError();
    ids.add(row.draftId);
  }
  return { legacyPainDrafts: data.legacyPainDrafts as LegacyPainDraft[], legacyPainError: null };
}
const thesePainError = () => new Error('Dati dolore dell’ingresso non validi');
export function parsePatientIntakeReview(value: unknown): PatientIntakeReviewData {
  if (!value || typeof value !== 'object') throw new Error('Revisione ingresso non valida');
  const data = value as Partial<PatientIntakeReviewData>;
  if (
    (data.draftId !== null && typeof data.draftId !== 'string') ||
    !Array.isArray(data.deferredTherapies) ||
    !Array.isArray(data.sourceDocumentIds) ||
    !data.sourceDocumentIds.every((id) => typeof id === 'string') ||
    !data.deferredTherapies.every(
      (row) =>
        row &&
        ['name', 'dose', 'route', 'frequency', 'notes', 'reason'].every(
          (key) => typeof row[key as keyof DeferredTherapy] === 'string',
        ) &&
        Array.isArray(row.times) &&
        row.times.every((time) => typeof time === 'string'),
    )
  )
    throw new Error('Revisione ingresso non valida');
  return { ...data, ...parseLegacyPain(value as Record<string, unknown>) } as PatientIntakeReviewData;
}
