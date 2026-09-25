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
// Letture anticipate ancora in volo per chiave: chi monta nel frattempo aspetta quella invece di
// aprire una seconda richiesta identica.
const pending = new Map<string, Promise<unknown>>();

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
  pending.clear();
}

/** Registra una lettura anticipata in volo per la chiave (rimossa al termine, esito qualsiasi). */
export function trackSessionCache(key: string, promise: Promise<unknown>): void {
  pending.set(key, promise);
  // Gestisce entrambi gli esiti senza creare una catena che rigetta (una lettura fallita non deve
  // diventare una unhandled rejection: chi aspetta ricevera' comunque un pending gia' risolto).
  const done = () => {
    if (pending.get(key) === promise) pending.delete(key);
  };
  promise.then(done, done);
}

/** La lettura anticipata in volo per la chiave, se c'e'. Non rigetta mai. */
export function pendingSessionCache(key: string): Promise<void> | undefined {
  const p = pending.get(key);
  return p
    ? p.then(
        () => undefined,
        () => undefined,
      )
    : undefined;
}
