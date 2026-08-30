// 015 US5 (T028) — dedup delle GET ripetute con stessi parametri nello stesso flusso.
// Una richiesta in volo per URL è condivisa da tutti i chiamanti; la risposta resta
// valida per un breve TTL. Le mutazioni DEVONO invalidare i prefissi toccati prima
// di ricaricare, altrimenti rileggerebbero il dato precedente dalla cache.

import { operatorHeaders } from './operatorSession';

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { at: number; data: unknown }>();
const urlGenerations = new Map<string, number>();
let sessionGeneration = 0;

const DEFAULT_TTL_MS = 15_000;

export function cachedGetJson<T>(url: string, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.data as T);
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;
  const requestSessionGeneration = sessionGeneration;
  const requestUrlGeneration = urlGenerations.get(url) ?? 0;
  const request: Promise<unknown> = fetch(url, { headers: operatorHeaders() })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data: unknown = await res.json();
      // A logout/session switch invalidates both cached and still-running reads. The old caller may
      // receive its own result, but that result must never repopulate the next operator's cache.
      if (
        requestSessionGeneration === sessionGeneration &&
        requestUrlGeneration === (urlGenerations.get(url) ?? 0)
      ) {
        cache.set(url, { at: Date.now(), data });
      }
      return data;
    })
    .finally(() => {
      // An older request can finish after a new-session request for the same URL has started.
      // Delete only our own slot or the old completion would break deduplication for the new one.
      if (inflight.get(url) === request) inflight.delete(url);
    });
  inflight.set(url, request);
  return request as Promise<T>;
}

/** Invalida tutte le voci di cache il cui URL inizia col prefisso (es. dopo una POST/PATCH). */
export function invalidateCachedGet(prefix: string): void {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
  for (const key of [...inflight.keys()]) {
    if (!key.startsWith(prefix)) continue;
    urlGenerations.set(key, (urlGenerations.get(key) ?? 0) + 1);
    inflight.delete(key);
  }
}

// La cache e' indicizzata solo per URL, non per operatore: al logout va svuotata tutta,
// altrimenti entro il TTL l'operatore successivo leggerebbe dati scaricati sotto
// l'identita' del precedente.
export function clearCachedGet(): void {
  sessionGeneration += 1;
  cache.clear();
  inflight.clear();
  urlGenerations.clear();
}
