// Milo fase 2: risposta del team di agenti (servizio AI, Agno Team) per una domanda di lettura.
//
// Flusso: il backend crea la delega (agent-grants.ts) → chiama il servizio AI con la domanda, lo
// schema degli strumenti CONSENTITI al ruolo e il codice di delega → il team legge i dati tornando
// al backend (/internal/ai/tools/:tool) → il backend verifica la risposta:
//   - ogni fonte citata deve essere fra quelle che il backend ha davvero restituito alla delega;
//   - nessuna dichiarazione di azioni eseguite né eco di istruzioni (stesso controllo del compositore);
//   - almeno una lettura riuscita e almeno una fonte citata.
// Qualunque errore, tempo scaduto o controllo fallito ⇒ null: chi chiama usa il percorso classico.

import type { SourceReference, UserContext } from '../gateway/types.js';
import { createAgentGrant, revokeAgentGrant, type AgentGrant } from './agent-grants.js';
import { claimsActionOrOverride } from './composer.js';
import { READ_TOOL_SCHEMA } from './read-tools.js';
import type { AssistantLlmConfig } from './config.js';

export interface TeamRuntimeRequest {
  question: string;
  grant: string;
  toolSchema: Array<{ name: string; args: Record<string, string> }>;
  today: string;
  currentPatient?: { id: string; label?: string };
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  maxToolCalls: number;
  timeoutSeconds: number;
}
export interface TeamRuntimeResponse {
  answerText?: string;
  citedSources?: SourceReference[];
  members?: string[];
  toolCalls?: Array<{ tool: string; ok: boolean }>;
  model?: string;
}
export interface TeamAnswer {
  answerText: string;
  sources: SourceReference[];
  citedSources: SourceReference[];
  results: unknown[];
  /** Letture del team, strumento per strumento: alimentano i blocchi visivi (fase 3). */
  reads: Array<{ tool: string; data: unknown[] }>;
  members: string[];
  tools: string[];
  model?: string;
}
export interface TeamDeps {
  callTeamRuntime: (req: TeamRuntimeRequest) => Promise<TeamRuntimeResponse>;
}

const sameSource = (a: SourceReference, b: SourceReference) =>
  a.sourceType === b.sourceType &&
  a.recordId === b.recordId &&
  (a.patientId ?? '') === (b.patientId ?? '');

/** Strumenti che il ruolo può usare: il team riceve solo questi (deny-by-default). */
export function allowedToolSchema(ctx: UserContext) {
  return READ_TOOL_SCHEMA.filter((t) => !ctx.readToolAllowed || ctx.readToolAllowed(t.name));
}

/** Diagnostica del team sempre visibile nei log (nessun contenuto: motivi, conteggi, tempi). */
function teamLog(fields: Record<string, unknown>) {
  console.warn(`[ai-team] ${JSON.stringify(fields)}`);
}

export type TeamRejection = 'no_text' | 'no_reads' | 'no_citations' | 'ungrounded' | 'action_claim';

/** Motivo per cui una risposta del team non può essere mostrata (null = accettabile). */
export function teamRejection(res: TeamRuntimeResponse, grant: AgentGrant): TeamRejection | null {
  const text = (res.answerText ?? '').trim();
  const cited = Array.isArray(res.citedSources) ? res.citedSources : [];
  if (!text) return 'no_text';
  if (grant.sources.length === 0) return 'no_reads';
  if (cited.length === 0) return 'no_citations';
  // Ogni fonte citata deve essere una fonte consegnata dal backend: nessuna fonte inventata.
  if (cited.some((c) => !grant.sources.some((s) => sameSource(s, c)))) return 'ungrounded';
  if (claimsActionOrOverride(text)) return 'action_claim';
  return null;
}

/** Verifica della risposta del team contro ciò che il backend ha restituito alla delega. */
export function acceptTeamAnswer(
  res: TeamRuntimeResponse,
  grant: AgentGrant,
): Omit<TeamAnswer, 'members' | 'model'> | null {
  if (teamRejection(res, grant)) return null;
  const text = (res.answerText ?? '').trim();
  const cited = Array.isArray(res.citedSources) ? res.citedSources : [];
  const grounded = cited.map((c) => grant.sources.find((s) => sameSource(s, c)));
  return {
    answerText: text,
    citedSources: grounded as SourceReference[],
    sources: grant.sources,
    results: grant.results.flatMap((r) => r.data),
    tools: grant.results.map((r) => r.tool),
    reads: grant.results.map((r) => ({ tool: r.tool, data: r.data })),
  };
}

export async function teamAnswer(
  question: string,
  ctx: UserContext,
  opts: {
    today: string;
    currentPatientId?: string;
    currentPatientLabel?: string;
    operatorName?: string;
    history?: TeamRuntimeRequest['history'];
    cfg: AssistantLlmConfig;
  },
  deps: TeamDeps,
): Promise<TeamAnswer | null> {
  const toolSchema = allowedToolSchema(ctx);
  if (!toolSchema.length) return null;
  const grant = createAgentGrant(ctx, {
    currentPatientId: opts.currentPatientId,
    operatorName: opts.operatorName,
    ttlMs: (opts.cfg.teamTimeoutMs ?? 60_000) + 30_000,
  });
  const startedAt = Date.now();
  try {
    const res = await deps.callTeamRuntime({
      question,
      grant: grant.id,
      toolSchema,
      today: opts.today,
      ...(opts.currentPatientId
        ? { currentPatient: { id: opts.currentPatientId, label: opts.currentPatientLabel } }
        : {}),
      history: (opts.history ?? []).slice(-6),
      maxToolCalls: grant.maxCalls,
      timeoutSeconds: Math.round((opts.cfg.teamTimeoutMs ?? 60_000) / 1000),
    });
    const rejected = teamRejection(res, grant);
    // Diagnostica senza contenuti: motivo, letture, fonti, durata.
    teamLog({
      outcome: rejected ? 'rejected' : 'accepted',
      reason: rejected ?? undefined,
      reads: grant.results.length,
      sources: grant.sources.length,
      cited: Array.isArray(res.citedSources) ? res.citedSources.length : 0,
      members: (res.members ?? []).join(','),
      ms: Date.now() - startedAt,
    });
    if (rejected) return null;
    const accepted = acceptTeamAnswer(res, grant)!;
    return { ...accepted, members: res.members ?? [], model: res.model };
  } catch (error) {
    teamLog({
      outcome: 'error',
      error: error instanceof Error ? error.name : 'error',
      reads: grant.results.length,
      ms: Date.now() - startedAt,
    });
    return null; // servizio AI assente, errore o tempo scaduto → percorso classico
  } finally {
    revokeAgentGrant(grant);
  }
}
