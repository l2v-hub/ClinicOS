// Milo fase 2: delega di lettura per il team di agenti del servizio AI.
//
// Il team lavora in ciclo (chiede dati, li vede, ne chiede altri). Ogni lettura torna al backend:
// il servizio AI non ha accesso al database e non decide chi può vedere cosa. Per una domanda il
// backend crea una DELEGA: un codice casuale, valido pochi minuti, legato al contesto verificato
// dell'operatore (perimetro dei pazienti, permessi per strumento, paziente aperto). Il servizio AI
// riceve solo il codice e lo restituisce a ogni lettura; il backend risolve il contesto, applica
// gli stessi controlli di Milo ed esegue. La delega registra anche le fonti restituite: la risposta
// finale può citare SOLO fonti che il backend ha davvero consegnato.
//
// Memoria del processo: adatto a un'istanza del backend (come oggi su Railway). Con più istanze la
// delega va spostata in un archivio condiviso.

import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { SourceReference, UserContext } from '../gateway/types.js';

export interface AgentGrant {
  id: string;
  ctx: UserContext;
  currentPatientId?: string;
  operatorName?: string;
  expiresAt: number;
  calls: number;
  maxCalls: number;
  /** Fonti restituite dalle letture della delega, in ordine. */
  sources: SourceReference[];
  /** Dati restituiti (per la risposta strutturata e per i blocchi). */
  results: Array<{ tool: string; data: unknown[] }>;
  revoked: boolean;
}

const GRANTS = new Map<string, AgentGrant>();
const MAX_GRANTS = 500;
export const GRANT_TTL_MS = 3 * 60_000;
export const GRANT_MAX_CALLS = 12;

function sweep(now = Date.now()) {
  for (const [id, grant] of GRANTS) if (grant.expiresAt <= now || grant.revoked) GRANTS.delete(id);
  while (GRANTS.size >= MAX_GRANTS) GRANTS.delete(GRANTS.keys().next().value as string);
}

export function createAgentGrant(
  ctx: UserContext,
  opts: {
    currentPatientId?: string;
    operatorName?: string;
    ttlMs?: number;
    maxCalls?: number;
  } = {},
  now = Date.now(),
): AgentGrant {
  sweep(now);
  const grant: AgentGrant = {
    id: randomBytes(32).toString('base64url'),
    ctx,
    currentPatientId: opts.currentPatientId,
    operatorName: opts.operatorName,
    expiresAt: now + (opts.ttlMs ?? GRANT_TTL_MS),
    calls: 0,
    maxCalls: opts.maxCalls ?? GRANT_MAX_CALLS,
    sources: [],
    results: [],
    revoked: false,
  };
  GRANTS.set(grant.id, grant);
  return grant;
}

/** Delega valida per il codice dato, o null (assente, scaduta, revocata). Confronto a tempo costante. */
export function resolveAgentGrant(code: unknown, now = Date.now()): AgentGrant | null {
  if (typeof code !== 'string' || code.length !== 43) return null;
  for (const [id, grant] of GRANTS) {
    const a = Buffer.from(id);
    const b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      if (grant.revoked || grant.expiresAt <= now) return null;
      return grant;
    }
  }
  return null;
}

/** Fine della domanda: la delega non vale più, i dati raccolti restano a chi l'ha creata. */
export function revokeAgentGrant(grant: AgentGrant) {
  grant.revoked = true;
  GRANTS.delete(grant.id);
}

export function activeGrantCount() {
  sweep();
  return GRANTS.size;
}
