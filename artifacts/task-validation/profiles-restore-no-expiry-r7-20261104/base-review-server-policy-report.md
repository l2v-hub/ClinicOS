# Complete unchanged simulator and policy modules

Whole unchanged source dependencies at 6872ad02b78a9cfd147a4a9cb78f335e8d9f177f; source hashes are verified, no excerpt is represented as a full module. Changed modules are supplied in full before/after by the native reviewer.

## backend/src/authz/simulator.ts

SHA256 1c76e24cc4c5778723b685ab0337626f95d18124cb7a522aa4c1a8b32ef88058

```text
// Development Role Simulator — a temporary IDENTITY SOURCE, not an authorization shortcut.
//
// It issues a server-signed session token that names one of five server-owned identities. The
// token carries NO role: the role is resolved from the active policy on every request, so a policy
// change or revocation hits already-open sessions at their next protected call. When the real login
// arrives, only this identity source is replaced (requireOperator keeps resolving roles the same way).
//
// Enabled only with ROLE_SIMULATOR_ENABLED=true in AUTH_MODE=demo, never in production unless
// ROLE_SIMULATOR_ALLOW_PRODUCTION=true is set explicitly — and NEVER on a real production deployment
// (lib/deployment.ts tier 'production'), whatever the flags say. While enabled, self-declared
// X-Operator-* headers are refused.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isRealProduction } from '../lib/deployment.js';

export interface SimulatedIdentity {
  id: string;
  name: string;
  email: string;
  /** Professional title (Operator.ruolo): drives e.g. the diary author type. */
  ruolo: string;
  /** Legacy User.role used only if the policy assignment is ever removed. */
  userRole: 'OPERATOR' | 'MANAGER';
  /** Role assigned in the baseline policy (informative; the active policy decides). */
  baselineRole: string;
}

export const SIMULATED_IDENTITIES: readonly SimulatedIdentity[] = [
  {
    id: 'SIM-ADMIN',
    name: 'Amministratore',
    email: 'sim-admin@clinicos.local',
    ruolo: 'altro',
    userRole: 'MANAGER',
    baselineRole: 'administrator',
  },
  {
    id: 'SIM-SUPERVISOR-1',
    name: 'Supervisore 1',
    email: 'sim-supervisor-1@clinicos.local',
    ruolo: 'coordinatore',
    userRole: 'MANAGER',
    baselineRole: 'supervisor',
  },
  {
    id: 'SIM-DOCTOR-1',
    name: 'Medico 1',
    email: 'sim-doctor-1@clinicos.local',
    ruolo: 'medico',
    userRole: 'OPERATOR',
    baselineRole: 'doctor',
  },
  {
    id: 'SIM-NURSE-1',
    name: 'Infermiere 1',
    email: 'sim-nurse-1@clinicos.local',
    ruolo: 'infermiere',
    userRole: 'OPERATOR',
    baselineRole: 'nurse',
  },
  {
    id: 'SIM-OSS-1',
    name: 'OSS 1',
    email: 'sim-oss-1@clinicos.local',
    ruolo: 'oss',
    userRole: 'OPERATOR',
    baselineRole: 'oss',
  },
];

const BY_ID = new Map(SIMULATED_IDENTITIES.map((identity) => [identity.id, identity]));
export const SIMULATOR_TOKEN_PREFIX = 'sim.';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export function simulatedIdentity(id: string): SimulatedIdentity | undefined {
  return BY_ID.get(id);
}

export function simulatorEnabled(authMode: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.ROLE_SIMULATOR_ENABLED || '').trim().toLowerCase() !== 'true') return false;
  if (authMode !== 'demo') return false;
  // Phase 9: no flag combination re-enables the simulator on a real production deployment.
  if (isRealProduction(env)) return false;
  if (env.NODE_ENV === 'production') {
    return (env.ROLE_SIMULATOR_ALLOW_PRODUCTION || '').trim().toLowerCase() === 'true';
  }
  return true;
}

let processSecret: Buffer | null = null;
function secret(env: NodeJS.ProcessEnv = process.env): Buffer {
  const configured = env.ROLE_SIMULATOR_SECRET;
  if (configured && configured.length >= 32) return Buffer.from(configured, 'utf8');
  // Development default: per-process secret (sessions end when the backend restarts).
  processSecret ??= randomBytes(32);
  return processSecret;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSimulatorToken(
  identityId: string,
  now = Date.now(),
): { token: string; expiresAt: string } {
  if (!BY_ID.has(identityId)) throw new Error('unknown_simulated_identity');
  const exp = now + TOKEN_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      sub: identityId,
      sid: randomBytes(9).toString('base64url'),
      iat: now,
      exp,
    }),
    'utf8',
  ).toString('base64url');
  return {
    token: `${SIMULATOR_TOKEN_PREFIX}${payload}.${sign(payload)}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

// Phase 9: server-side logout. Revoked session ids are kept until their own expiry (bounded by the
// token TTL), so a copied token stops working at logout instead of living 12 h. In-memory: a
// backend restart already invalidates every session signed with the per-process secret; with a
// configured ROLE_SIMULATOR_SECRET a restart forgets revocations (demo only, synthetic data).
const revokedSessions = new Map<string, number>();
const MAX_REVOKED = 10_000;

function tokenClaims(token: string): { sub: string; sid: string; exp: number } | null {
  if (!token.startsWith(SIMULATOR_TOKEN_PREFIX) || token.length > 512) return null;
  const [payload, signature] = token.slice(SIMULATOR_TOKEN_PREFIX.length).split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number;
      sub?: string;
      sid?: string;
      exp?: number;
    };
    if (claims.v !== 1 || typeof claims.sub !== 'string' || typeof claims.exp !== 'number')
      return null;
    return { sub: claims.sub, sid: String(claims.sid ?? ''), exp: claims.exp };
  } catch {
    return null;
  }
}

/** Revoke a valid simulator session (logout). Returns false for an invalid/unknown token. */
export function revokeSimulatorToken(token: string, now = Date.now()): boolean {
  const claims = tokenClaims(token);
  if (!claims || !claims.sid || claims.exp <= now) return false;
  if (revokedSessions.size >= MAX_REVOKED) {
    for (const [sid, exp] of revokedSessions) if (exp <= now) revokedSessions.delete(sid);
    // Still full (demo flood): drop the oldest revocation — bounded memory beats a perfect list.
    if (revokedSessions.size >= MAX_REVOKED) {
      const oldest = revokedSessions.keys().next().value;
      if (oldest !== undefined) revokedSessions.delete(oldest);
    }
  }
  revokedSessions.set(claims.sid, claims.exp);
  return true;
}

/** Returns the identity id of a valid, unexpired token; null otherwise (never throws). */
export function verifySimulatorToken(token: string, now = Date.now()): string | null {
  const claims = tokenClaims(token);
  if (!claims) return null;
  if (claims.exp <= now || !BY_ID.has(claims.sub)) return null;
  if (claims.sid && revokedSessions.has(claims.sid)) return null;
  return claims.sub;
}

/** Idempotently provisions the User + Operator rows of a simulated identity (simulator only). */
export async function ensureSimulatedIdentity(identity: SimulatedIdentity): Promise<void> {
  try {
    await upsertSimulatedIdentity(identity);
  } catch (error) {
    // Two first logins at the same time race on the unique email/id: the loser simply re-runs.
    if ((error as { code?: string })?.code !== 'P2002') throw error;
    await upsertSimulatedIdentity(identity);
  }
}

async function upsertSimulatedIdentity(identity: SimulatedIdentity): Promise<void> {
  const { prisma } = await import('../lib/prisma.js');
  const user = await prisma.user.upsert({
    where: { email: identity.email },
    update: { fullName: identity.name, isActive: true },
    create: {
      email: identity.email,
      passwordHash: 'ROLE_SIMULATOR_NO_LOCAL_LOGIN',
      fullName: identity.name,
      role: identity.userRole,
    },
  });
  await prisma.operator.upsert({
    where: { id: identity.id },
    update: { ruolo: identity.ruolo },
    create: { id: identity.id, userId: user.id, ruolo: identity.ruolo, department: 'Simulazione' },
  });
}

```

## backend/src/authz/baseline.ts

SHA256 789fc5e8a021a6b70b5898ab6ff7c4a1ae8c9bbd42f1a1197eaaa084682f6d99

```text
// Proactive baseline policy (version 0) — a development/demo starting point that Administrator can
// edit, NOT a normative truth. Built from the real capability registry by semantic clustering:
// domain + type + sensitivity + the legacy admin gates. Doubtful cells carry a `review` note that the
// Administrator UI highlights. Sensitive clinical writes are prudent (DENIED or with confirmation).
//
// Legacy roles keep today's behaviour for identities without an explicit assignment:
//   legacy_admin = everything (as admin|manager today); operator = everything except the
//   capabilities whose route is gated by requireRole('admin','manager').

import { governedCapabilities } from './registry.js';
import type { CapabilityEntry, Effect, PolicyDocument, RoleDefinition } from './types.js';

export const ROLE_IDS = {
  administrator: 'administrator',
  supervisor: 'supervisor',
  doctor: 'doctor',
  nurse: 'nurse',
  oss: 'oss',
  operator: 'operator',
  legacyAdmin: 'legacy_admin',
} as const;

export const BASELINE_ROLES: RoleDefinition[] = [
  {
    id: 'administrator',
    label: 'Amministratore',
    description:
      'Amministratore tecnico: ruoli e permessi, operatori, struttura (camere/letti), configurazione. Nessuna scrittura clinica.',
    legacyRole: 'admin',
    uiShell: 'admin',
  },
  {
    id: 'supervisor',
    label: 'Supervisore',
    description:
      'Coordinatore operativo: supervisione di reparto, agenda multi-operatore, consegne, turni, posti letto. Letture cliniche complete, nessuna prescrizione.',
    legacyRole: 'manager',
    uiShell: 'admin',
  },
  {
    id: 'doctor',
    label: 'Medico',
    description:
      'Medico: cartella clinica, anamnesi, prescrizioni (con conferma), diario, valutazioni.',
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'nurse',
    label: 'Infermiere',
    description:
      'Infermiere: somministrazioni, parametri, diario, scale di valutazione, consegne. Nessuna prescrizione.',
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'oss',
    label: 'OSS',
    description:
      'Operatore socio-sanitario: assistenza di base, parametri, diario assistenziale, consegne. Nessun accesso a terapie e documenti clinici (l’anagrafica farmaci resta consultabile).',
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'operator',
    label: 'Operatore (legacy)',
    description:
      'Ruolo storico "Operatore": mantenuto per le identità non ancora migrate. Stessi permessi di oggi.',
    legacy: true,
    legacyRole: 'operatore',
    uiShell: 'operator',
  },
  {
    id: 'legacy_admin',
    label: 'Amministratore (legacy)',
    description:
      'Ruolo storico "Amministratore/Manager": mantenuto per le identità non ancora migrate. Stessi permessi di oggi (tutto).',
    legacy: true,
    legacyRole: 'admin',
    uiShell: 'admin',
  },
];

/** Server-owned simulated identities (Role Simulator) and their baseline assignment. */
export const SIMULATED_ASSIGNMENTS: Record<string, string> = {
  'SIM-ADMIN': 'administrator',
  'SIM-SUPERVISOR-1': 'supervisor',
  'SIM-DOCTOR-1': 'doctor',
  'SIM-NURSE-1': 'nurse',
  'SIM-OSS-1': 'oss',
};

type Rule = { effect: Effect; review?: string };

const ADMIN_ONLY = (cap: CapabilityEntry) => cap.legacyRoles.length > 0;
const isRead = (cap: CapabilityEntry) => cap.type === 'read';

// Technical administration capabilities (structure, users, policy, platform).
const TECHNICAL = new Set([
  'authz.view_policy',
  'authz.manage_policy',
  'operators.create',
  'operators.update',
  'operators.list',
  'operators.page',
  'operators.directory',
  'operators.directory_page',
  'operators.schedules',
  'operators.directory_schedules',
  'operators.set_schedule',
  'rooms.create',
  'rooms.update',
  'rooms.delete',
  'rooms.add_bed',
  'rooms.update_bed',
  'rooms.delete_bed',
  'rooms.get',
  'rooms.list',
  'rooms.list_beds',
  'rooms.available_beds',
  'rooms.occupancy',
  'roster.list_contexts',
  'roster.set_context_default',
  'ai.audit.list',
  'import_jobs.sweep',
]);

// Operational overview reads the Administrator dashboard needs: aggregates and identity/bed
// metadata only. Phase 4 (Prompt 4 §1.3): per-resident clinical content (clinical summary
// badges, handover texts, therapy administration slots) is NOT implicit for the technical role.
const ADMIN_OVERVIEW_READS = new Set([
  'patients.list_page',
  'patients.search',
  'patients.clinical_overview',
  'patients.settings',
  'consegne.overview',
  'appointments.list',
  'room_assignments.list',
  'rooms.patient_room_options',
  'notes.list',
  'roster.get_my_order',
]);

function administrator(cap: CapabilityEntry): Rule {
  if (cap.domain === 'dev')
    return { effect: 'DENIED', review: 'Solo sviluppo: non serve in esercizio.' };
  if (cap.id.startsWith('intake.legacy_'))
    return { effect: 'DENIED', review: 'Endpoint deprecato del vecchio import.' };
  if (cap.id === 'drugs.reload')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Scarica ~82 MB da AIFA e sostituisce l’anagrafica.',
    };
  if (cap.id === 'drugs.status') return { effect: 'ALLOWED' };
  if (TECHNICAL.has(cap.id)) return { effect: 'ALLOWED' };
  if (ADMIN_OVERVIEW_READS.has(cap.id)) return { effect: 'READ_ONLY' };
  if (cap.domain === 'room_assignments') {
    if (cap.id === 'room_assignments.delete') return { effect: 'ALLOWED_WITH_CONFIRMATION' };
    return { effect: 'ALLOWED', review: 'Gestione posti letto: tecnica o di coordinamento?' };
  }
  if (cap.domain === 'notes') return { effect: 'ALLOWED' };
  if (cap.id === 'roster.set_my_order') return { effect: 'ALLOWED' };
  if (cap.domain === 'appointments')
    return {
      effect: 'DENIED',
      review: 'In passato l’amministratore gestiva l’agenda globale: ora è compito del Supervisor.',
    };
  if (
    [
      'patients.clinical_summary',
      'consegne.list',
      'consegne.patient_summary',
      'administration.list_slots',
      'administration.list_slots_page',
    ].includes(cap.id)
  )
    return {
      effect: 'DENIED',
      review:
        'Contenuto clinico per singolo ospite: non implicito per l’amministratore tecnico (Prompt 4 §1.3). Riattivabile se serve a una funzione amministrativa reale.',
    };
  if (['assistant', 'agnos', 'voice'].includes(cap.domain))
    return {
      effect: 'DENIED',
      review: 'L’assistente legge dati clinici: minimo privilegio per l’amministratore tecnico.',
    };
  if (cap.domain === 'consegne')
    return {
      effect: 'DENIED',
      review: 'Consegne cliniche: di norma non competono all’amministratore tecnico.',
    };
  // Clinical record and every other clinical capability: least privilege.
  return { effect: 'DENIED' };
}

function supervisor(cap: CapabilityEntry): Rule {
  if (cap.domain === 'dev' || cap.id.startsWith('intake.legacy_')) return { effect: 'DENIED' };
  if (cap.id === 'authz.manage_policy') return { effect: 'DENIED' };
  if (cap.id === 'authz.view_policy') return { effect: 'READ_ONLY' };
  if (cap.id === 'drugs.reload' || cap.id === 'import_jobs.sweep') return { effect: 'DENIED' };
  if (isRead(cap)) return { effect: 'ALLOWED' };
  if (cap.id === 'operators.create' || cap.id === 'operators.update')
    return { effect: 'DENIED', review: 'Anagrafica utenti = amministrazione tecnica.' };
  if (cap.id === 'operators.set_schedule') return { effect: 'ALLOWED' };
  if (cap.domain === 'rooms') {
    if (cap.id === 'rooms.update_bed')
      return { effect: 'ALLOWED', review: 'Manutenzione letto: operativa o tecnica?' };
    return { effect: 'DENIED', review: 'Struttura camere/letti = amministrazione tecnica.' };
  }
  if (cap.id === 'room_assignments.delete')
    return {
      effect: 'DENIED',
      review: 'Cancellazione definitiva: preferire la chiusura del ricovero.',
    };
  if (['consegne', 'appointments', 'notes', 'roster', 'room_assignments'].includes(cap.domain)) {
    return cap.id.endsWith('.delete')
      ? { effect: 'ALLOWED_WITH_CONFIRMATION' }
      : { effect: 'ALLOWED' };
  }
  if (
    ['therapy.create', 'therapy.update', 'therapy.delete', 'diary.create_with_therapy'].includes(
      cap.id,
    )
  )
    return { effect: 'DENIED', review: 'Prescrizione = atto medico.' };
  if (cap.domain === 'administration')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Il coordinatore è spesso infermiere: somministrazione ammessa con conferma?',
    };
  if (['narrative.save', 'clinical_record.save'].includes(cap.id))
    return { effect: 'DENIED', review: 'Anamnesi/cartella: redazione medica.' };
  if (cap.domain === 'assessments')
    return { effect: 'DENIED', review: 'Scale di valutazione compilate da medico/infermiere.' };
  if (cap.id === 'diary.delete_entry' || cap.id === 'patients.delete') return { effect: 'DENIED' };
  if (cap.id === 'diary.update_entry')
    return { effect: 'DENIED', review: 'La modifica voce diario non verifica l’autore (GAP).' };
  return { effect: 'ALLOWED' };
}

function doctor(cap: CapabilityEntry): Rule {
  if (ADMIN_ONLY(cap) || cap.domain === 'dev') return { effect: 'DENIED' };
  if (isRead(cap)) return { effect: 'ALLOWED' };
  if (['therapy.create', 'therapy.update', 'diary.create_with_therapy'].includes(cap.id))
    return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  if (cap.id === 'therapy.delete')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Cancellazione definitiva della prescrizione.',
    };
  if (cap.domain === 'administration')
    return {
      effect: 'DENIED',
      review: 'Somministrazione = atto infermieristico; il medico può averne bisogno in urgenza.',
    };
  if (cap.id === 'diary.delete_entry')
    return { effect: 'DENIED', review: 'Hard delete senza controllo autore.' };
  if (cap.id === 'diary.update_entry')
    return { effect: 'ALLOWED', review: 'La modifica voce diario non verifica l’autore (GAP).' };
  if (cap.id === 'patients.delete') return { effect: 'DENIED' };
  if (cap.id === 'intake.confirm_draft' || cap.id === 'import_jobs.confirm')
    return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  if (cap.domain === 'room_assignments')
    return { effect: 'DENIED', review: 'Assegnazione letto: di solito il coordinatore.' };
  if (cap.id.endsWith('.delete')) return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  return { effect: 'ALLOWED' };
}

function nurse(cap: CapabilityEntry): Rule {
  if (ADMIN_ONLY(cap) || cap.domain === 'dev') return { effect: 'DENIED' };
  if (isRead(cap)) return { effect: 'ALLOWED' };
  if (['therapy.create', 'therapy.update', 'therapy.delete'].includes(cap.id))
    return { effect: 'DENIED' };
  if (cap.id === 'diary.create_with_therapy')
    return { effect: 'DENIED', review: 'Crea una prescrizione dal diario: atto medico.' };
  if (cap.id === 'narrative.save')
    return { effect: 'READ_ONLY', review: 'Anamnesi e sezioni narrative: redazione medica.' };
  if (cap.id === 'clinical_record.save')
    return {
      effect: 'ALLOWED',
      review:
        'Il salvataggio cartella copre sezioni infermieristiche e mediche insieme (da separare).',
    };
  if (cap.id === 'diary.delete_entry' || cap.id === 'patients.delete') return { effect: 'DENIED' };
  if (cap.id === 'diary.update_entry')
    return { effect: 'ALLOWED', review: 'La modifica voce diario non verifica l’autore (GAP).' };
  if (cap.id === 'patients.create')
    return { effect: 'DENIED', review: 'I pazienti nascono dall’ingresso (bozza confermata).' };
  if (cap.id === 'intake.confirm_draft' || cap.id === 'import_jobs.confirm')
    return {
      effect: 'ALLOWED_WITH_CONFIRMATION',
      review: 'Conferma ingresso da parte dell’infermiere?',
    };
  if (cap.domain === 'room_assignments')
    return { effect: 'DENIED', review: 'Assegnazione letto: di solito il coordinatore.' };
  if (cap.id.endsWith('.delete')) return { effect: 'ALLOWED_WITH_CONFIRMATION' };
  return { effect: 'ALLOWED' };
}

const OSS_READS = new Set([
  'patients.list_page',
  'patients.search',
  'patients.get',
  'patients.clinical_summary',
  'patients.clinical_overview',
  'patients.settings',
  'diary.list',
  'diary.get_entry',
  'parameters.list_page',
  'parameters.list_readings',
  'consegne.list',
  'consegne.overview',
  'consegne.patient_summary',
  'appointments.list',
  'notes.list',
  'room_assignments.list',
  'rooms.patient_room_options',
  'roster.get_my_order',
  'operators.directory',
  'operators.directory_page',
  'assistant.query',
  'agnos.catalog',
  'voice.stt_status',
  'assessments.catalog',
  'assessments.list',
  'assessments.get',
  'assessments.current',
]);

function oss(cap: CapabilityEntry): Rule {
  if (ADMIN_ONLY(cap) || cap.domain === 'dev') return { effect: 'DENIED' };
  if (OSS_READS.has(cap.id)) {
    if (cap.id === 'assistant.query')
      return {
        effect: 'ALLOWED',
        review: 'Le letture AI restano filtrate dai permessi dei singoli dati.',
      };
    if (cap.domain === 'assessments')
      return {
        effect: 'READ_ONLY',
        review: 'Consultazione delle scale; compilazione a medico/infermiere.',
      };
    return { effect: 'ALLOWED' };
  }
  if (cap.id === 'clinical_record.get')
    return {
      effect: 'READ_ONLY',
      review: 'Cartella completa (diagnosi, allergie): utile per l’assistenza?',
    };
  if (cap.id === 'diary.create')
    return { effect: 'ALLOWED', review: 'Diario assistenziale OSS (tipo autore "oss").' };
  if (cap.id === 'parameters.create_reading' || cap.id === 'parameters.save_month')
    return { effect: 'ALLOWED', review: 'Rilevazione parametri da parte dell’OSS.' };
  if (cap.id === 'consegne.create' || cap.id === 'consegne.update') return { effect: 'ALLOWED' };
  if (cap.domain === 'notes')
    return cap.id === 'notes.delete' ? { effect: 'DENIED' } : { effect: 'ALLOWED' };
  if (cap.id === 'roster.set_my_order') return { effect: 'ALLOWED' };
  if (
    ['agnos.plan_command', 'agnos.execute_command', 'voice.plan', 'voice.execute'].includes(cap.id)
  )
    return {
      effect: 'ALLOWED',
      review: 'Le azioni AI restano filtrate dal permesso funzionale sottostante.',
    };
  if (cap.domain === 'therapy' || cap.domain === 'administration')
    return {
      effect: 'DENIED',
      review: isRead(cap) ? 'Informazioni su farmaci e somministrazioni.' : undefined,
    };
  return { effect: 'DENIED' };
}

function operatorLegacy(cap: CapabilityEntry): Rule {
  return ADMIN_ONLY(cap) ? { effect: 'DENIED' } : { effect: 'ALLOWED' };
}

const RULES: Record<string, (cap: CapabilityEntry) => Rule> = {
  administrator,
  supervisor,
  doctor,
  nurse,
  oss,
  operator: operatorLegacy,
  legacy_admin: () => ({ effect: 'ALLOWED' }),
};

export function buildBaselinePolicy(): PolicyDocument {
  const grants: PolicyDocument['grants'] = {};
  const review: Record<string, string> = {};
  for (const role of BASELINE_ROLES) {
    const rule = RULES[role.id];
    grants[role.id] = {};
    for (const cap of governedCapabilities()) {
      const decided = rule(cap);
      grants[role.id][cap.id] = decided.effect;
      if (decided.review) review[`${role.id}:${cap.id}`] = decided.review;
    }
  }
  return {
    schema: 'clinicos.authz-policy/v1',
    defaultEffect: 'DENIED',
    roles: BASELINE_ROLES.map((role) => ({ ...role })),
    grants,
    assignments: { ...SIMULATED_ASSIGNMENTS },
    review,
  };
}

```

## backend/src/authz/decision.ts

SHA256 1d52c247a4bad4be14aff3416101b49a1d63eb4737b610b8a00202b34162e6c6

```text
// The single decision function used by routes, Tool Layer, Agnos and the GUI contract.

import { capabilityById, governedCapabilities, governingCapability } from './registry.js';
import type { Decision, PolicyDocument, RoleDefinition } from './types.js';

/** Legacy role strings (Entra User.role, demo headers) → legacy role of the policy. */
export function legacyRoleIdFor(legacyRole: string): string {
  return ['admin', 'manager'].includes(legacyRole.trim().toLowerCase())
    ? 'legacy_admin'
    : 'operator';
}

/**
 * Role of an identity: the explicit assignment in the ACTIVE policy wins; otherwise the legacy
 * fallback derived from the server-verified legacy role string. Never from client input.
 */
export function resolveRoleId(
  document: PolicyDocument,
  operatorId: string,
  legacyRole: string,
): { roleId: string; source: 'assignment' | 'legacy' } {
  const assigned = document.assignments[operatorId];
  if (assigned && document.roles.some((role) => role.id === assigned)) {
    return { roleId: assigned, source: 'assignment' };
  }
  return { roleId: legacyRoleIdFor(legacyRole), source: 'legacy' };
}

export function roleDefinition(
  document: PolicyDocument,
  roleId: string,
): RoleDefinition | undefined {
  return document.roles.find((role) => role.id === roleId);
}

export function decide(document: PolicyDocument, roleId: string, capabilityId: string): Decision {
  const governing = governingCapability(capabilityId);
  const denied = (code: string): Decision => ({
    capabilityId,
    roleId,
    effect: 'DENIED',
    allowed: false,
    requiresConfirmation: false,
    code,
  });
  if (!governing) return denied('unknown_capability');
  if (governing.gate !== 'policy') {
    return { capabilityId, roleId, effect: 'ALLOWED', allowed: true, requiresConfirmation: false };
  }
  if (!roleDefinition(document, roleId)) return denied('unknown_role');
  const effect = document.grants[roleId]?.[governing.id] ?? document.defaultEffect;
  switch (effect) {
    case 'ALLOWED':
      return { capabilityId, roleId, effect, allowed: true, requiresConfirmation: false };
    case 'ALLOWED_WITH_CONFIRMATION':
      return { capabilityId, roleId, effect, allowed: true, requiresConfirmation: true };
    case 'READ_ONLY':
      return governing.type === 'read'
        ? { capabilityId, roleId, effect, allowed: true, requiresConfirmation: false }
        : { ...denied('read_only'), effect };
    default:
      return denied('capability_denied');
  }
}

export interface EffectiveCapability {
  id: string;
  effect: Decision['effect'];
  allowed: boolean;
  requiresConfirmation: boolean;
}

/** Every governed + derived capability with its effective decision for one role. */
export function effectiveCapabilities(
  document: PolicyDocument,
  roleId: string,
): EffectiveCapability[] {
  const out: EffectiveCapability[] = [];
  for (const cap of governedCapabilities()) {
    const d = decide(document, roleId, cap.id);
    out.push({
      id: cap.id,
      effect: d.effect,
      allowed: d.allowed,
      requiresConfirmation: d.requiresConfirmation,
    });
  }
  return out;
}

export function isKnownCapability(id: string): boolean {
  return Boolean(capabilityById(id));
}

```

## backend/src/authz/policy-store.ts

SHA256 43c5e23685ec7f44f7134bb835e6f42724c29a73f8ca0332aaaf8aa051a72c4e

```text
// Versioned policy store (AuthzPolicyVersion). The active policy is read FRESH on every protected
// operation (one indexed query), so a revocation applies to already-open sessions at their next
// protected call, on every backend instance. No version is ever rewritten: Save inserts a new row
// (draft or active); Apply only moves status draft → active and active → superseded.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { buildBaselinePolicy } from './baseline.js';
import { diffPolicies, parsePolicyDocument, type PolicyDiff } from './policy-document.js';
import type { ActivePolicy, PolicyDocument } from './types.js';

export class PolicyStoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PolicyStoreError';
  }
}

export interface PolicyActor {
  operatorId: string;
  name?: string;
  roleId: string;
}

const LOCK_KEY = 'clinicos-authz-policy';
let baselineCache: PolicyDocument | null = null;

export function baselinePolicy(): PolicyDocument {
  baselineCache ??= buildBaselinePolicy();
  return structuredClone(baselineCache);
}

export async function loadActivePolicy(): Promise<ActivePolicy> {
  const row = await prisma.authzPolicyVersion.findFirst({
    where: { status: 'active' },
    orderBy: { version: 'desc' },
    select: { version: true, document: true, appliedAt: true },
  });
  if (!row) return { version: 0, document: baselinePolicy(), source: 'baseline', appliedAt: null };
  return {
    version: row.version,
    // Stored documents were validated on save; re-parse defends against manual DB edits.
    document: parsePolicyDocument(row.document),
    source: 'database',
    appliedAt: row.appliedAt?.toISOString() ?? null,
  };
}

async function documentOfVersion(
  tx: Prisma.TransactionClient,
  version: number,
): Promise<PolicyDocument> {
  if (version === 0) return baselinePolicy();
  const row = await tx.authzPolicyVersion.findUnique({
    where: { version },
    select: { document: true },
  });
  if (!row) throw new PolicyStoreError(`Versione ${version} inesistente`, 404, 'version_not_found');
  return parsePolicyDocument(row.document);
}

function summaryOf(diff: PolicyDiff) {
  return {
    grants: diff.grants,
    rolesAdded: diff.rolesAdded,
    rolesRemoved: diff.rolesRemoved,
    rolesChanged: diff.rolesChanged,
    assignments: diff.assignments,
    defaultEffect: diff.defaultEffect,
    counts: {
      grants: diff.grants.length,
      roles: diff.rolesAdded.length + diff.rolesRemoved.length + diff.rolesChanged.length,
      assignments: diff.assignments.length,
    },
  };
}

async function activeVersion(tx: Prisma.TransactionClient): Promise<number> {
  const row = await tx.authzPolicyVersion.findFirst({
    where: { status: 'active' },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  return row?.version ?? 0;
}

async function lock(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`;
}

export interface SaveInput {
  document: unknown;
  basedOnVersion: number;
  note?: string;
  apply: boolean;
  actor: PolicyActor;
}

/**
 * Save a new version based on the ACTIVE one (optimistic concurrency: a stale basedOnVersion is a
 * 409). `apply: true` activates it in the same transaction (Save + Apply); otherwise it is a draft.
 */
export async function savePolicyVersion(input: SaveInput) {
  const document = parsePolicyDocument(input.document);
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : undefined;
  return prisma.$transaction(async (tx) => {
    await lock(tx);
    const current = await activeVersion(tx);
    if (input.basedOnVersion !== current) {
      throw new PolicyStoreError(
        `La policy è cambiata nel frattempo (attiva: v${current}, base della modifica: v${input.basedOnVersion}). Ricarica e ripeti.`,
        409,
        'policy_version_conflict',
      );
    }
    const before = await documentOfVersion(tx, current);
    const diff = diffPolicies(before, document);
    if (
      diff.grants.length +
        diff.assignments.length +
        diff.rolesAdded.length +
        diff.rolesRemoved.length +
        diff.rolesChanged.length ===
        0 &&
      !diff.defaultEffect
    ) {
      throw new PolicyStoreError(
        'Nessuna modifica rispetto alla versione attiva',
        400,
        'policy_unchanged',
      );
    }
    const last = await tx.authzPolicyVersion.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;
    const now = new Date();
    if (input.apply) {
      await tx.authzPolicyVersion.updateMany({
        where: { status: 'active' },
        data: { status: 'superseded' },
      });
    }
    return tx.authzPolicyVersion.create({
      data: {
        version,
        status: input.apply ? 'active' : 'draft',
        document: document as unknown as Prisma.InputJsonValue,
        basedOnVersion: current,
        changeSummary: summaryOf(diff) as unknown as Prisma.InputJsonValue,
        note: note || null,
        createdById: input.actor.operatorId,
        createdByName: input.actor.name ?? null,
        createdByRole: input.actor.roleId,
        ...(input.apply ? { appliedAt: now, appliedById: input.actor.operatorId } : {}),
      },
      select: versionSelect,
    });
  });
}

/** Activate a draft. Only a draft based on the currently active version can be applied. */
export async function applyPolicyVersion(version: number, actor: PolicyActor) {
  return prisma.$transaction(async (tx) => {
    await lock(tx);
    const draft = await tx.authzPolicyVersion.findUnique({ where: { version } });
    if (!draft)
      throw new PolicyStoreError(`Versione ${version} inesistente`, 404, 'version_not_found');
    if (draft.status !== 'draft')
      throw new PolicyStoreError('Solo una bozza può essere applicata', 409, 'version_not_draft');
    const current = await activeVersion(tx);
    if (draft.basedOnVersion !== current) {
      throw new PolicyStoreError(
        `La bozza v${version} è basata su v${draft.basedOnVersion}, ma la policy attiva è v${current}. Crea una nuova bozza.`,
        409,
        'stale_draft',
      );
    }
    parsePolicyDocument(draft.document);
    await tx.authzPolicyVersion.updateMany({
      where: { status: 'active' },
      data: { status: 'superseded' },
    });
    return tx.authzPolicyVersion.update({
      where: { version },
      data: { status: 'active', appliedAt: new Date(), appliedById: actor.operatorId },
      select: versionSelect,
    });
  });
}

const versionSelect = {
  version: true,
  status: true,
  basedOnVersion: true,
  changeSummary: true,
  note: true,
  createdById: true,
  createdByName: true,
  createdByRole: true,
  createdAt: true,
  appliedAt: true,
  appliedById: true,
} as const;

export async function listPolicyVersions(limit = 50) {
  return prisma.authzPolicyVersion.findMany({
    orderBy: { version: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    select: versionSelect,
  });
}

export async function getPolicyVersion(version: number) {
  if (version === 0) {
    return { version: 0, status: 'baseline', document: baselinePolicy() };
  }
  const row = await prisma.authzPolicyVersion.findUnique({
    where: { version },
    select: { ...versionSelect, document: true },
  });
  if (!row) throw new PolicyStoreError(`Versione ${version} inesistente`, 404, 'version_not_found');
  return row;
}

```

## backend/src/authz/request-context.ts

SHA256 91076b1718c815f970a83c21252dde589ecaadfe3464bfbc11fe24e7962111cc

```text
// Per-request authorization context: identity (from the auth gate) → role (from the ACTIVE policy)
// → decisions. Attached once per request by ensureAuthorization (after requireOperator); the route
// gate, the Tool Layer, /authz, /auth/me and Agnos all read it from here, so every channel uses the
// same policy snapshot for one request.

import type { NextFunction, Response } from 'express';
import type { Operator } from '../ai/auth.js';
import { decide, resolveRoleId, roleDefinition } from './decision.js';
import { loadActivePolicyCached } from './policy-cache.js';
import type { ActivePolicy, Decision, ResolvedIdentity } from './types.js';

export interface AuthzContext {
  policy: ActivePolicy;
  identity: ResolvedIdentity;
  can(capabilityId: string): Decision;
}

interface WithAuthz {
  operator?: Operator;
  authz?: AuthzContext;
  identitySource?: ResolvedIdentity['identitySource'];
}

export function enforcementEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AUTHZ_ENFORCEMENT || 'enforce').trim().toLowerCase() !== 'off';
}

export function buildAuthzContext(
  policy: ActivePolicy,
  operator: Operator,
  identitySource: ResolvedIdentity['identitySource'],
): AuthzContext {
  const { roleId, source } = resolveRoleId(policy.document, operator.id, operator.role);
  const role = roleDefinition(policy.document, roleId);
  // Assigned roles speak to the pre-existing services through their compat role string; the
  // legacy fallback keeps the exact string the identity already had (zero behaviour change).
  const legacyRole = source === 'assignment' && role ? role.legacyRole : operator.role;
  const identity: ResolvedIdentity = {
    operatorId: operator.id,
    name: operator.name,
    roleId,
    roleSource: source,
    legacyRole,
    identitySource,
  };
  return {
    policy,
    identity,
    can: (capabilityId) => decide(policy.document, roleId, capabilityId),
  };
}

/** Resolve and attach the authorization context; rewrites req.operator.role to the compat role. */
export async function attachAuthorization(
  req: WithAuthz,
  identitySource: ResolvedIdentity['identitySource'],
): Promise<AuthzContext> {
  const operator = req.operator!;
  const policy = await loadActivePolicyCached();
  const context = buildAuthzContext(policy, operator, identitySource);
  req.operator = {
    ...operator,
    role: context.identity.legacyRole,
    appRole: context.identity.roleId,
  };
  req.authz = context;
  return context;
}

export function authzOf(req: unknown): AuthzContext | undefined {
  return (req as WithAuthz).authz;
}

/** Attach the authorization context once per request (after requireOperator). */
export async function ensureAuthorization(req: unknown): Promise<AuthzContext> {
  const target = req as WithAuthz;
  if (target.authz) return target.authz;
  return attachAuthorization(target, target.identitySource ?? 'demo-header');
}

/** Express middleware form of ensureAuthorization; fails closed (503) if the policy is unreadable. */
export function requireAuthorizationContext(req: unknown, res: Response, next: NextFunction): void {
  ensureAuthorization(req).then(
    () => next(),
    () => {
      res.status(503).json({ error: 'Autorizzazione non disponibile', code: 'authz_unavailable' });
    },
  );
}

```

## backend/src/authz/route-gate.ts

SHA256 1a84d4537da1b6f8308605cf252ca6f67371878166f9bc0ce299840a7f0a20bd

```text
// Backend enforcement for GUI/API routes ("deny by backend, not by UI").
//
// Mounted once in app.ts before the routers. For a request whose method+path matches a catalogued
// capability governed by the policy, it establishes the identity with the SAME requireOperator gate
// the routers use (idempotent), asks the policy, and refuses with 403 before any route code runs.
// A direct call that bypasses the GUI or Agno therefore meets the same decision.
// Writes and denials are audited with identity + role at the time of the action.

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { recordAuditEvent, type AiAuditChannel, type AiAuditKind } from '../ai/audit-store.js';
import { requireOperator, type AuthedRequest } from '../ai/auth.js';
import { governingCapability, matchRoute } from './registry.js';
import { authzOf, enforcementEnabled, ensureAuthorization } from './request-context.js';
import type { CapabilityEntry, Decision } from './types.js';

/**
 * Phase 6 (fail closed): a route missing from the capability catalog is DENIED by default — a new
 * uncatalogued endpoint must never become reachable without a capability check. `allow` remains an
 * explicit, documented escape hatch for local development only.
 */
function unmappedRoutesDenied(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AUTHZ_UNMAPPED_ROUTES || 'deny').trim().toLowerCase() !== 'allow';
}

// Routes that are part of the authorization/identity/tool infrastructure itself and enforce their
// own capability checks (or are pre-auth by design).
// /skills composes Tool Layer tools: every tool call is re-authorized by the tool hook.
const SELF_GOVERNED_PREFIXES = ['/auth/', '/authz/', '/tools', '/skills'];

function channelOf(req: Request): AiAuditChannel {
  return req.path.startsWith('/ai/') ? 'ai' : 'gui';
}

function auditKindOf(capability: CapabilityEntry, method: string): AiAuditKind {
  if (method === 'DELETE') return 'delete';
  if (capability.type === 'write') return method === 'POST' ? 'create' : 'update';
  return capability.type === 'read' ? 'read' : 'action';
}

function patientIdOf(req: Request): string | null {
  const match = /^\/patients\/([^/]+)/i.exec(req.path);
  if (
    match &&
    !['page', 'parameters', 'clinical-summary', 'settings', 'seed', 'demo-setup'].includes(match[1])
  ) {
    // Client-controlled path: a malformed escape must never throw (it would crash the process
    // from a promise/finish callback). Keep the raw segment instead.
    try {
      return decodeURIComponent(match[1]).slice(0, 64);
    } catch {
      return match[1].slice(0, 64);
    }
  }
  // Phase 6 (audit integrity): body-scoped writes (/therapy-slots/confirm, /consegne…) name the
  // resident in the body — record it (as an identifier only; never other body values).
  const body = req.body as Record<string, unknown> | undefined;
  const fromBody = body && typeof body === 'object' ? (body.patientId ?? body.pazienteId) : null;
  return typeof fromBody === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(fromBody) ? fromBody : null;
}

function audit(
  req: AuthedRequest,
  capability: CapabilityEntry,
  decision: Decision | null,
  outcome: 'ok' | 'denied' | 'error',
  requestId: string,
): void {
  try {
    writeAudit(req, capability, decision, outcome, requestId);
  } catch (error) {
    // Audit is best-effort and must never break (or crash) the request.
    console.error('[authz-audit] failed:', error instanceof Error ? error.name : 'unknown');
  }
}

function writeAudit(
  req: AuthedRequest,
  capability: CapabilityEntry,
  decision: Decision | null,
  outcome: 'ok' | 'denied' | 'error',
  requestId: string,
): void {
  const identity = authzOf(req)?.identity;
  recordAuditEvent({
    requestId,
    operatorId: identity?.operatorId ?? req.operator?.id ?? 'unknown',
    operatorRole: identity?.roleId ?? 'unknown',
    patientId: patientIdOf(req),
    actionType: capability.id,
    kind: outcome === 'denied' ? 'refusal' : auditKindOf(capability, req.method),
    channel: channelOf(req),
    // Field NAMES / decision metadata only (PHI-safe).
    fields: [
      `route:${req.method}`,
      `effect:${decision?.effect ?? 'n/a'}`,
      `policy:v${authzOf(req)?.policy.version ?? 'n/a'}`,
    ],
    outcome,
  });
}

export function capabilityRouteGate(req: Request, res: Response, next: NextFunction): void {
  if (!enforcementEnabled()) {
    next();
    return;
  }
  if (req.method === 'OPTIONS' || SELF_GOVERNED_PREFIXES.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }
  const matched = matchRoute(req.method, req.path);
  if (!matched) {
    if (unmappedRoutesDenied() && req.path !== '/health') {
      res.status(403).json({ error: 'Operazione non catalogata', code: 'capability_unmapped' });
      return;
    }
    next();
    return;
  }
  const capability = governingCapability(matched.id) ?? matched;
  if (capability.gate !== 'policy') {
    next();
    return;
  }
  const authed = req as AuthedRequest;
  requireOperator(authed, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }
    ensureAuthorization(authed).then(
      (context) => decideRoute(authed, res, next, capability, context),
      () => {
        res
          .status(503)
          .json({ error: 'Autorizzazione non disponibile', code: 'authz_unavailable' });
      },
    );
  });
}

function decideRoute(
  authed: AuthedRequest,
  res: Response,
  next: NextFunction,
  capability: CapabilityEntry,
  context: NonNullable<ReturnType<typeof authzOf>>,
): void {
  {
    // Same decision function as the Tool Layer and Agnos (authz/decision.ts#decide).
    const decision = context.can(capability.id);
    const requestId = `route-${randomUUID()}`;
    if (!decision.allowed) {
      audit(authed, capability, decision, 'denied', requestId);
      res.status(403).json({
        error:
          decision.code === 'read_only'
            ? 'Il tuo ruolo ha accesso in sola lettura a questa funzione'
            : 'Operazione non consentita al tuo ruolo',
        code: decision.code ?? 'capability_denied',
        capability: capability.id,
        role: decision.roleId,
      });
      return;
    }
    if (capability.type !== 'read') {
      res.on('finish', () => {
        const outcome = res.statusCode === 403 ? 'denied' : res.statusCode < 400 ? 'ok' : 'error';
        audit(authed, capability, decision, outcome, requestId);
      });
    }
    next();
  }
}

```

## backend/src/server.ts

SHA256 c52d816fac624b2cb70ee27f202093a0877e59d1fd71269a4d7289e1db9a3eb2

```text
import app from './app.js';
import { publicStatus } from './ai/config.js';
import { validateDeploymentConfig } from './lib/deployment.js';
import { markShuttingDown } from './lib/readiness.js';
import { sweepExpiredJobs } from './ai/upload/job-service.js';
import { startWorker } from './ai/upload/worker.js';

const DEFAULT_PORT = 3001;

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

const port = process.env.PORT || 3001;

// Phase 6 (availability): a stray rejected promise must not take the whole service down for every
// operator. It is logged (no payloads) — request handlers answer their own errors.
process.on('unhandledRejection', (reason) => {
  console.error(
    `[unhandledRejection] ${reason instanceof Error ? `${reason.name}: ${reason.message.slice(0, 200)}` : typeof reason}`,
  );
});

// Phase 9: fail fast on dangerous configuration. Errors stop a NODE_ENV=production (or tier
// production) process before it
// accepts traffic (the platform keeps the previous deployment); warnings are logged. Names only —
// never values.
const config = validateDeploymentConfig();
for (const warning of config.warnings) console.warn(`[config] ${config.tier}: ${warning}`);
if (config.errors.length > 0) {
  for (const error of config.errors) console.error(`[config] ${config.tier}: ERRORE ${error}`);
  if (process.env.NODE_ENV === 'production' || config.tier === 'production') {
    console.error('[config] configurazione di produzione non sicura: avvio rifiutato');
    process.exit(1);
  }
}

const server = app.listen(port, () => {
  console.log(`ClinicOS backend listening on port ${port}`);
  // Controlled AI config validation at startup (secret-free).
  const ai = publicStatus();
  if (ai.available) {
    console.log(`[ai] extraction ready: provider=${ai.provider} model=${ai.model}`);
  } else {
    console.warn(`[ai] extraction NOT available: ${ai.errors.join('; ')}`);
  }
  // Periodic retention sweep for expired import jobs (REQ-014/019). Best-effort.
  const SWEEP_MS = 15 * 60_000;
  setInterval(() => {
    sweepExpiredJobs().catch(() => {
      /* DB may be unavailable; ignore */
    });
  }, SWEEP_MS).unref();
  // Async import worker (REQ-022): processes queued jobs in the background.
  // Disable in-process with AI_WORKER_INLINE=false when running a separate worker service.
  if ((process.env.AI_WORKER_INLINE ?? 'true').toLowerCase() !== 'false') {
    startWorker();
  }
});

// Phase 9: graceful shutdown. Readiness flips to 503, in-flight requests finish (bounded), then the
// DB pool is closed. A second signal or the 10 s budget forces the exit.
const SHUTDOWN_BUDGET_MS = 10_000;
let stopping = false;
function shutdown(signal: string): void {
  if (stopping) process.exit(1);
  stopping = true;
  markShuttingDown();
  console.log(`[shutdown] ${signal}: stop accepting connections`);
  setTimeout(() => {
    console.error('[shutdown] budget exceeded: forcing exit');
    process.exit(1);
  }, SHUTDOWN_BUDGET_MS).unref();
  server.close(() => {
    import('./lib/prisma.js')
      .then(({ prisma }) => prisma.$disconnect())
      .catch(() => undefined)
      .finally(() => {
        console.log('[shutdown] done');
        process.exit(0);
      });
  });
  server.closeIdleConnections?.();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.on('error', (error) => {
  console.error('Failed to start ClinicOS backend:', error);
  process.exit(1);
});

```
