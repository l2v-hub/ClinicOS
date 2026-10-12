// Allergie dei pazienti con dosi nella coda del Turno (#445): un'unica richiesta al riepilogo
// clinico già usato dalla lista pazienti, solo per i pazienti in coda.
import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import type { ClinicalSummaryEntry } from '../types';
import type { TurnoAllergy } from '../components/operator/AdessoQueue';
import { fetchPatientClinicalSummary } from './patientPage';
import { operatorHeaders } from './operatorSession';

/** Nomi degli allergeni; se il server manda solo il conteggio lo si dice, non si tace. */
export function allergyNames(entry: ClinicalSummaryEntry | undefined): string[] {
  if (!entry) return [];
  const names = (entry.allergeni ?? []).map((a) => a.allergene.trim()).filter(Boolean);
  if (names.length) return names;
  return entry.allergieCount > 0
    ? [`${entry.allergieCount} ${entry.allergieCount === 1 ? 'registrata' : 'registrate'}`]
    : [];
}

export function useTurnoAllergies(patientIds: string[]): Record<string, TurnoAllergy> {
  const key = [...new Set(patientIds)].sort().join(',');
  const [result, setResult] = useState<{ key: string; value: Record<string, TurnoAllergy> }>({
    key: '',
    value: {},
  });
  useEffect(() => {
    if (!key) return;
    const ids = key.split(',');
    const controller = new AbortController();
    fetchPatientClinicalSummary(API_URL, ids, {
      headers: operatorHeaders(),
      signal: controller.signal,
    })
      .then((entries) => {
        const byId = new Map(entries.map((e) => [e.patientId, e]));
        setResult({
          key,
          value: Object.fromEntries(
            ids.map((id) => [
              id,
              byId.has(id)
                ? { state: 'ready' as const, allergeni: allergyNames(byId.get(id)) }
                : { state: 'error' as const, allergeni: [] },
            ]),
          ),
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult({
          key,
          value: Object.fromEntries(
            ids.map((id) => [id, { state: 'error' as const, allergeni: [] }]),
          ),
        });
      });
    return () => controller.abort();
  }, [key]);
  if (result.key === key) return result.value;
  // Pazienti nuovi in coda: in verifica finché la risposta non arriva (mai «nessuna allergia»).
  return Object.fromEntries(
    key
      ? key
          .split(',')
          .map((id) => [id, result.value[id] ?? { state: 'loading' as const, allergeni: [] }])
      : [],
  );
}
