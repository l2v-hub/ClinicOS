// 015 US5 (T028) — dedup delle GET ripetute con stessi parametri nello stesso flusso.
// Una richiesta in volo per URL è condivisa da tutti i chiamanti; la risposta resta
// valida per un breve TTL. Le mutazioni DEVONO invalidare i prefissi toccati prima
// di ricaricare, altrimenti rileggerebbero il dato precedente dalla cache.

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { at: number; data: unknown }>();

const DEFAULT_TTL_MS = 15_000;

export function cachedGetJson<T>(url: string, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.data as T);
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;
  const p = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data: unknown = await res.json();
      cache.set(url, { at: Date.now(), data });
      return data;
    })
    .finally(() => { inflight.delete(url); });
  inflight.set(url, p);
  return p as Promise<T>;
}

/** Invalida tutte le voci di cache il cui URL inizia col prefisso (es. dopo una POST/PATCH). */
export function invalidateCachedGet(prefix: string): void {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
}
