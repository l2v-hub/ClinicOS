// SPEC-015 T015 (US2): persistent AI audit trail on Postgres — best-effort by design.
//
// recordAuditEvent() NEVER throws and NEVER blocks the operator's action: if the database write
// fails (DB down, missing DATABASE_URL, schema drift) the error is logged and the action proceeds.
// The existing stdout audit lines (`[ai-voice]`, `[ai-gateway]`) remain the always-on fallback.
//
// PHI-safe: `fields` carries field NAMES only, never values (same policy as the stdout audit).
// Prisma is imported LAZILY so this module stays importable and unit-testable without a database;
// tests inject a spy via setAuditPersistence().

export type AiAuditKind = 'read' | 'create' | 'update' | 'refusal';
// 'ui' = operational action performed through the traditional REST/UI (issue #223), alongside the
// Agnos channels 'testo'/'voce'. The DB column is a free String, so this needs no migration.
export type AiAuditChannel = 'testo' | 'voce' | 'ui';
export type AiAuditOutcome = 'ok' | 'denied' | 'error' | 'deduped' | 'empty';

export interface AiAuditEventInput {
  requestId: string;
  operatorId: string;
  /** Role as declared by the caller's context; forensic only ('operatore' when unknown). */
  operatorRole: string;
  patientId: string | null;
  /** Catalog action name, or refused_delete | refused_clinical | refused_forbidden | unknown. */
  actionType: string;
  kind: AiAuditKind;
  channel: AiAuditChannel;
  /** Field NAMES only — never values (PHI-safe). */
  fields: string[];
  outcome: AiAuditOutcome;
  /** ISO timestamp; omitted ⇒ DB default now(). */
  createdAt?: string;
}

type AuditPersistence = (evt: AiAuditEventInput) => Promise<void>;

let warnedNoDatabase = false;

async function defaultPersist(evt: AiAuditEventInput): Promise<void> {
  if (!process.env.DATABASE_URL) {
    // No DB configured (e.g. unit tests): the stdout audit line is still emitted by the callers.
    if (!warnedNoDatabase) {
      warnedNoDatabase = true;
      console.log('[ai-audit] DATABASE_URL assente: persistenza audit su Postgres disattivata (resta il log su stdout)');
    }
    return;
  }
  const { prisma } = await import('../lib/prisma.js');
  const createdAt = evt.createdAt ? new Date(evt.createdAt) : undefined;
  await prisma.aiAuditEvent.create({
    data: {
      requestId: evt.requestId,
      operatorId: evt.operatorId,
      operatorRole: evt.operatorRole,
      patientId: evt.patientId,
      actionType: evt.actionType,
      kind: evt.kind,
      channel: evt.channel,
      fields: evt.fields.slice(0, 20),
      outcome: evt.outcome,
      ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { createdAt } : {}),
    },
  });
}

let persistence: AuditPersistence | null = null;

/** Test hook: inject a spy/stub sink. Pass null to restore the default Postgres persistence. */
export function setAuditPersistence(fn: AuditPersistence | null): void {
  persistence = fn;
}

/** Best-effort, fire-and-forget audit write. An audit failure must NEVER fail the operator's
 *  action: every error is caught and logged, nothing is ever thrown or awaited by callers. */
export function recordAuditEvent(evt: AiAuditEventInput): void {
  const logFailure = (err: unknown) =>
    console.error('[ai-audit] persistenza fallita (azione NON bloccata):', err instanceof Error ? err.message : err);
  try {
    Promise.resolve((persistence ?? defaultPersist)(evt)).catch(logFailure);
  } catch (err) {
    logFailure(err);
  }
}

// ── Issue #223: standardized minimal, PHI-safe audit for operational UI/REST actions ─────────────
//
// PHI-safety is STRUCTURAL: this API accepts only ids, an action name and field NAMES — there is no
// parameter through which a clinical value, free-text payload or secret could be passed. It records
// actor / action / entity / outcome / timestamp (AC1) and forwards to the same best-effort sink.

export interface OperationalAuditInput {
  /** Correlation id for the request (defaults to a synthetic 'op-<time>' when omitted). */
  requestId?: string;
  /** WHO performed the action. */
  actorId: string;
  actorRole?: string;
  /** WHAT: dotted "entity.verb", e.g. 'consegna.update', 'patient.update_contact'. */
  action: string;
  /** CRU classification of the action (default 'update'). */
  kind?: Exclude<AiAuditKind, 'refusal'>;
  /** Patient scope when the action is patient-related; null otherwise. */
  patientId?: string | null;
  /** Field NAMES touched — NEVER values (PHI-safe). Capped at 20 downstream. */
  fields?: string[];
  outcome?: AiAuditOutcome;
  /** ISO timestamp; omitted ⇒ DB default now(). */
  at?: string;
}

/** Best-effort, PHI-safe audit for an operational UI/REST action. Never throws, never blocks. */
export function recordOperationalAudit(input: OperationalAuditInput): void {
  recordAuditEvent({
    requestId: input.requestId ?? `op-${input.action}`,
    operatorId: input.actorId,
    operatorRole: input.actorRole ?? 'operatore',
    patientId: input.patientId ?? null,
    actionType: input.action,
    kind: input.kind ?? 'update',
    channel: 'ui',
    fields: (input.fields ?? []).slice(0, 20),
    outcome: input.outcome ?? 'ok',
    ...(input.at ? { createdAt: input.at } : {}),
  });
}
