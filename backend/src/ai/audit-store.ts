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
export type AiAuditChannel = 'testo' | 'voce';
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
