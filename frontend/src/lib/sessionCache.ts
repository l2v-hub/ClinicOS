// Cache di sessione per la navigazione "stale-while-revalidate".
//
// Ogni pagina (lista pazienti, agenda, consegne, note, terapie, tab della cartella) si smonta al
// cambio contesto e, rimontandosi, ripartiva da zero: placeholder "Caricamento…" e una nuova
// catena di richieste, anche se i dati erano stati mostrati pochi secondi prima. Qui restano gli
// ultimi dati mostrati per chiave: al ritorno la pagina si ridisegna subito con quelli e li
// rivalida in background. Non e' una cache HTTP (vedi cachedFetch.ts): non evita richieste, evita
// l'attesa a schermo vuoto.
//
// Contiene dati clinici: vive solo in memoria, per la sessione dell'operatore corrente, e va
// svuotata al logout (App.handleLogout → clearSessionCache) come cachedFetch.

const store = new Map<string, unknown>();

export function readSessionCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function writeSessionCache<T>(key: string, value: T): void {
  store.set(key, value);
}

/** Rimuove le voci la cui chiave inizia col prefisso (es. dopo una mutazione su quel dominio). */
export function invalidateSessionCache(prefix: string): void {
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
}

export function clearSessionCache(): void {
  store.clear();
}
