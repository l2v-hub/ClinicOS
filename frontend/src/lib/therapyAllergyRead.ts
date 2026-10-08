import { API_URL } from '../config';
import type { AllergyStatus } from '../types';
import { operatorHeaders } from './operatorSession';

export interface GiroAllergy {
  allergene: string;
  gravita?: 'lieve' | 'moderata' | 'grave';
  reazione: string;
  documentato: string;
  documentatoDa: string;
  note: string;
}
export interface GiroAllergySnapshot {
  items: GiroAllergy[];
  status?: AllergyStatus;
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Reject malformed or mismatched source rather than silently asserting absence. */
export function projectGiroAllergies(body: unknown, patientId: string): GiroAllergySnapshot {
  if (!record(body) || body.patientId !== patientId) throw new Error('Invalid allergy source');
  if (body.data === null) return { items: [] };
  if (!record(body.data)) throw new Error('Invalid allergy source');
  const { allergie, allergieStatus } = body.data;
  if (allergie !== undefined && !Array.isArray(allergie)) throw new Error('Invalid allergy list');
  if (
    allergieStatus !== undefined &&
    !['presenti', 'assenti', 'paziente_nega'].includes(String(allergieStatus))
  ) {
    throw new Error('Invalid allergy status');
  }
  if (allergie === undefined) return { items: [] };
  const items = allergie.map((item: unknown): GiroAllergy => {
    if (!record(item) || !text(item.allergene)) throw new Error('Invalid allergy entry');
    return {
      allergene: text(item.allergene),
      gravita: ['lieve', 'moderata', 'grave'].includes(String(item.gravita))
        ? (item.gravita as GiroAllergy['gravita'])
        : undefined,
      reazione: text(item.reazione),
      documentato: text(item.documentato),
      documentatoDa: text(item.documentatoDa),
      note: text(item.note),
    };
  });
  return { items, status: allergieStatus as AllergyStatus | undefined };
}

// Semaphore stores no patient/chart cache; cancelled queued reads never start.
let active = 0;
const waiting = new Set<() => void>();
function acquire(signal: AbortSignal): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      waiting.delete(start);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const start = () => {
      if (signal.aborted) return abort();
      if (active >= 4) {
        waiting.add(start);
        return;
      }
      waiting.delete(start);
      signal.removeEventListener('abort', abort);
      active += 1;
      resolve(() => {
        active -= 1;
        for (const next of waiting) {
          if (active >= 4) break;
          next();
        }
      });
    };
    signal.addEventListener('abort', abort, { once: true });
    start();
  });
}

export async function readGiroAllergies(
  patientId: string,
  signal: AbortSignal,
): Promise<GiroAllergySnapshot> {
  const release = await acquire(signal);
  try {
    const response = await fetch(`${API_URL}/patients/${encodeURIComponent(patientId)}/cartella`, {
      headers: operatorHeaders(),
      cache: 'no-store',
      signal,
    });
    if (!response.ok) throw new Error('Allergy source unavailable');
    const snapshot = projectGiroAllergies(await response.json(), patientId);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return snapshot;
  } finally {
    release();
  }
}
