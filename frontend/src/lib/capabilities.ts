// Capability della sessione corrente (GET /auth/me). La GUI le usa SOLO per nascondere o
// disabilitare voci e azioni: l'autorizzazione vera resta sul backend (403 capability_denied).
import { useSyncExternalStore } from 'react';
import type { CapabilityEffect, CapabilityMap, NavKey } from '../types';

/**
 * true se la capability è consentita. Senza mappa (backend senza policy, sessione non ancora
 * risolta) non si nasconde nulla: decide il server. Con la mappa, una capability assente è negata.
 */
export function can(caps: CapabilityMap | null | undefined, id: string): boolean {
  if (!caps) return true;
  return caps[id]?.allowed === true;
}

/** Effetto della capability, o null se non determinabile. */
export function effectOf(
  caps: CapabilityMap | null | undefined,
  id: string,
): CapabilityEffect | null {
  return caps?.[id]?.effect ?? null;
}

/** Capability che sostiene ogni pagina della barra laterale (assente = sempre visibile). */
export const NAV_CAPABILITY: Partial<Record<NavKey, string>> = {
  'gestione-operatori': 'operators.page',
  'posti-letto': 'rooms.list',
  'orari-operatori': 'operators.schedules',
  'agenda-admin': 'appointments.list',
  'agenda-operatore': 'appointments.list',
  terapie: 'administration.list_slots',
  'parametri-multipaziente': 'parameters.list_page',
  consegne: 'consegne.list',
  note: 'notes.list',
  pazienti: 'patients.list_page',
  'ruoli-permessi': 'authz.view_policy',
};

export function canNavigate(caps: CapabilityMap | null | undefined, key: NavKey): boolean {
  const capability = NAV_CAPABILITY[key];
  return capability ? can(caps, capability) : true;
}

/** Errore 403 della policy (capability_denied / read_only) → messaggio italiano, altrimenti null. */
export function capabilityDeniedMessage(status: number, payload: unknown): string | null {
  if (status !== 403 || !payload || typeof payload !== 'object') return null;
  const code = (payload as { code?: unknown }).code;
  if (code === 'capability_denied') return 'Operazione non consentita per il tuo ruolo';
  if (code === 'read_only') return 'Accesso in sola lettura per il tuo ruolo';
  return null;
}

// Mappa capability della sessione (singleton di modulo, come operatorSession): i componenti
// profondi la leggono con useCan senza props drilling né provider. Aggiornata da App.tsx.
let sessionCapabilities: CapabilityMap | null = null;
const listeners = new Set<() => void>();

export function setSessionCapabilities(caps: CapabilityMap | null): void {
  if (caps === sessionCapabilities) return;
  sessionCapabilities = caps;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lettura fuori dal render (prefetch, caricamenti): stessa mappa di useCan. */
export function sessionCan(id: string): boolean {
  return can(sessionCapabilities, id);
}

export function useCan(id: string): boolean {
  const snapshot = () => sessionCapabilities;
  const caps = useSyncExternalStore(subscribe, snapshot, snapshot);
  return can(caps, id);
}
