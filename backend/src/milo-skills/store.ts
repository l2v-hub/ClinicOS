// Milo, «skill creator»: giudizi delle persone sulle risposte e versioni delle competenze degli
// specialisti decise dall'amministratore.
//
//   giudizio (👍/👎 + correzione)  →  proposta di istruzioni (dal modello o a mano)
//   →  approvazione dell'amministratore  →  istruzioni inviate al servizio AI (`skillOverrides`)
//
// Una proposta è SOLO testo: non può cambiare strumenti, permessi o regole fisse (stanno nel file
// rilasciato con il servizio AI). Nessuna riga viene riscritta: approvare sposta lo stato della
// precedente a «superseded», ripristinare torna alle istruzioni rilasciate.

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const MILO_SKILL_IDS = ['clinico', 'sorveglianza', 'struttura', 'coordinatore'] as const;
export type MiloSkillId = (typeof MILO_SKILL_IDS)[number];
export const MAX_INSTRUCTIONS = 20;
export const MAX_INSTRUCTION_CHARS = 700;
const MAX_QUESTION = 500;
const MAX_CORRECTION = 1000;
const MAX_RATIONALE = 600;
const LOCK_KEY = 'clinicos-milo-skills';

export class MiloSkillError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'MiloSkillError';
  }
}

export interface MiloActor {
  operatorId: string;
  name?: string;
  roleId: string;
}

export const isMiloSkillId = (value: unknown): value is MiloSkillId =>
  typeof value === 'string' && (MILO_SKILL_IDS as readonly string[]).includes(value);

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const names = (value: unknown, max = 12) =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string' && /^[\w.-]{1,60}$/.test(v))
        .slice(0, max)
    : [];

/** Istruzioni valide: elenco di frasi, entro i limiti che il servizio AI applica di nuovo. */
export function parseInstructions(value: unknown): string[] {
  if (!Array.isArray(value))
    throw new MiloSkillError('Le istruzioni devono essere un elenco di frasi', 400, 'bad_request');
  const lines = value.map((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''));
  if (lines.some((line) => !line))
    throw new MiloSkillError('Ogni istruzione deve essere una frase non vuota', 400, 'bad_request');
  if (lines.length === 0 || lines.length > MAX_INSTRUCTIONS)
    throw new MiloSkillError(
      `Servono da 1 a ${MAX_INSTRUCTIONS} istruzioni`,
      400,
      'too_many_instructions',
    );
  const long = lines.find((line) => line.length > MAX_INSTRUCTION_CHARS);
  if (long)
    throw new MiloSkillError(
      `Ogni istruzione può avere al massimo ${MAX_INSTRUCTION_CHARS} caratteri`,
      400,
      'instruction_too_long',
    );
  return lines;
}

// ── Giudizi ──────────────────────────────────────────────────────────────────────────────────

export interface FeedbackInput {
  answerId: unknown;
  rating: unknown;
  question: unknown;
  correction?: unknown;
  mode?: unknown;
  intent?: unknown;
  members?: unknown;
  tools?: unknown;
  skillVersions?: unknown;
}

function skillVersionsOf(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, version] of Object.entries(value as Record<string, unknown>))
    if (isMiloSkillId(key) && typeof version === 'string') out[key] = version.slice(0, 40);
  return Object.keys(out).length ? out : null;
}

/** Un giudizio per risposta e per persona: inviarlo di nuovo lo aggiorna, non lo duplica. */
export async function recordFeedback(input: FeedbackInput, actor: MiloActor) {
  const answerId = typeof input.answerId === 'string' ? input.answerId : '';
  if (!/^[A-Za-z0-9-]{8,64}$/.test(answerId))
    throw new MiloSkillError('Risposta non riconosciuta', 400, 'bad_request');
  if (input.rating !== 'up' && input.rating !== 'down')
    throw new MiloSkillError('Giudizio non valido', 400, 'bad_request');
  const question = text(input.question, MAX_QUESTION);
  if (!question) throw new MiloSkillError('Domanda mancante', 400, 'bad_request');
  const correction = input.rating === 'down' ? text(input.correction, MAX_CORRECTION) : '';
  const data = {
    rating: input.rating,
    question,
    correction: correction || null,
    mode: text(input.mode, 20) || null,
    intent: text(input.intent, 40) || null,
    members: names(input.members),
    tools: names(input.tools, 20),
    skillVersions: skillVersionsOf(input.skillVersions) ?? Prisma.JsonNull,
    operatorName: actor.name?.slice(0, 120) ?? null,
    operatorRole: actor.roleId,
  };
  const row = await prisma.miloAnswerFeedback.upsert({
    where: { answerId_operatorId: { answerId, operatorId: actor.operatorId } },
    create: { answerId, operatorId: actor.operatorId, ...data },
    // La risposta giudicata è la stessa: cambiano solo giudizio e correzione.
    update: { rating: data.rating, correction: data.correction },
    select: { id: true, rating: true, status: true, createdAt: true },
  });
  return { id: row.id, rating: row.rating, status: row.status };
}

export async function listFeedback(
  options: { status?: string; rating?: string; limit?: number } = {},
) {
  const status = ['open', 'used', 'dismissed'].includes(options.status ?? '')
    ? options.status
    : undefined;
  const rating = options.rating === 'up' || options.rating === 'down' ? options.rating : undefined;
  const rows = await prisma.miloAnswerFeedback.findMany({
    where: { ...(status ? { status } : {}), ...(rating ? { rating } : {}) },
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, Math.max(1, options.limit ?? 100)),
  });
  const counts = await prisma.miloAnswerFeedback.groupBy({
    by: ['status', 'rating'],
    _count: { _all: true },
  });
  return {
    feedback: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      question: r.question,
      correction: r.correction,
      mode: r.mode,
      intent: r.intent,
      members: r.members,
      tools: r.tools,
      skillVersions: r.skillVersions,
      operatorName: r.operatorName,
      operatorRole: r.operatorRole,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    counts: counts.map((c) => ({ status: c.status, rating: c.rating, count: c._count._all })),
  };
}

export async function dismissFeedback(id: string) {
  const done = await prisma.miloAnswerFeedback.updateMany({
    where: { id, status: 'open' },
    data: { status: 'dismissed' },
  });
  if (!done.count) throw new MiloSkillError('Giudizio non trovato o già gestito', 404, 'not_found');
  return { id, status: 'dismissed' };
}

/** Giudizi aperti scelti dall'amministratore (o gli ultimi negativi su quello specialista). */
export async function feedbackForProposal(skillId: MiloSkillId, ids?: unknown) {
  const chosen = Array.isArray(ids)
    ? ids.filter((v): v is string => typeof v === 'string').slice(0, 20)
    : [];
  const rows = await prisma.miloAnswerFeedback.findMany({
    where: chosen.length
      ? { id: { in: chosen } }
      : {
          status: 'open',
          rating: 'down',
          ...(skillId === 'coordinatore' ? {} : { members: { has: skillId } }),
        },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, rating: true, question: true, correction: true },
  });
  return rows;
}

// ── Versioni delle competenze ────────────────────────────────────────────────────────────────

const versionDto = (r: {
  id: string;
  skillId: string;
  version: number;
  baseVersion: string;
  status: string;
  source: string;
  instructions: Prisma.JsonValue;
  rationale: string | null;
  feedbackIds: string[];
  createdByName: string | null;
  createdAt: Date;
  decidedByName: string | null;
  decidedAt: Date | null;
}) => ({
  id: r.id,
  skillId: r.skillId,
  version: r.version,
  baseVersion: r.baseVersion,
  label: `${r.baseVersion}+r${r.version}`,
  status: r.status,
  source: r.source,
  instructions: Array.isArray(r.instructions) ? (r.instructions as string[]) : [],
  rationale: r.rationale,
  feedbackIds: r.feedbackIds,
  createdByName: r.createdByName,
  createdAt: r.createdAt.toISOString(),
  decidedByName: r.decidedByName,
  decidedAt: r.decidedAt?.toISOString() ?? null,
});
export type MiloSkillVersionDto = ReturnType<typeof versionDto>;

export async function listSkillVersions(skillId?: MiloSkillId) {
  const rows = await prisma.miloSkillVersion.findMany({
    where: skillId ? { skillId } : {},
    orderBy: [{ skillId: 'asc' }, { version: 'desc' }],
    take: 200,
  });
  return rows.map(versionDto);
}

export interface ProposalInput {
  skillId: MiloSkillId;
  baseVersion: string;
  instructions: unknown;
  rationale?: unknown;
  source: 'model' | 'manual';
  feedbackIds?: string[];
}

/** Salva una proposta: non ha alcun effetto finché non viene approvata. */
export async function saveProposal(input: ProposalInput, actor: MiloActor) {
  const instructions = parseInstructions(input.instructions);
  const baseVersion = text(input.baseVersion, 20);
  if (!/^\d+\.\d+\.\d+$/.test(baseVersion))
    throw new MiloSkillError('Versione di partenza non valida', 400, 'bad_request');
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`;
    const last = await tx.miloSkillVersion.findFirst({
      where: { skillId: input.skillId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const row = await tx.miloSkillVersion.create({
      data: {
        skillId: input.skillId,
        version: (last?.version ?? 0) + 1,
        baseVersion,
        status: 'proposed',
        source: input.source,
        instructions,
        rationale: text(input.rationale, MAX_RATIONALE) || null,
        feedbackIds: (input.feedbackIds ?? []).slice(0, 20),
        createdById: actor.operatorId,
        createdByName: actor.name?.slice(0, 120) ?? null,
      },
    });
    return versionDto(row);
  });
}

/** Approva o rifiuta una proposta. Approvare sostituisce la versione in uso di quella competenza. */
export async function decideProposal(id: string, decision: 'approve' | 'reject', actor: MiloActor) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`;
    const row = await tx.miloSkillVersion.findUnique({ where: { id } });
    if (!row) throw new MiloSkillError('Proposta non trovata', 404, 'not_found');
    if (row.status !== 'proposed')
      throw new MiloSkillError('La proposta è già stata decisa', 409, 'already_decided');
    const decided = {
      decidedById: actor.operatorId,
      decidedByName: actor.name?.slice(0, 120) ?? null,
      decidedAt: new Date(),
    };
    if (decision === 'reject')
      return versionDto(
        await tx.miloSkillVersion.update({
          where: { id },
          data: { status: 'rejected', ...decided },
        }),
      );
    // Riverifica al momento dell'approvazione: mai in uso istruzioni fuori dai limiti.
    parseInstructions(row.instructions);
    await tx.miloSkillVersion.updateMany({
      where: { skillId: row.skillId, status: 'approved' },
      data: { status: 'superseded' },
    });
    const approved = await tx.miloSkillVersion.update({
      where: { id },
      data: { status: 'approved', ...decided },
    });
    if (row.feedbackIds.length)
      await tx.miloAnswerFeedback.updateMany({
        where: { id: { in: row.feedbackIds }, status: 'open' },
        data: { status: 'used' },
      });
    return versionDto(approved);
  });
  invalidateApprovedOverrides();
  return result;
}

/** Torna alle istruzioni rilasciate con il servizio AI (la versione approvata viene archiviata). */
export async function restoreReleased(skillId: MiloSkillId) {
  const done = await prisma.miloSkillVersion.updateMany({
    where: { skillId, status: 'approved' },
    data: { status: 'superseded' },
  });
  invalidateApprovedOverrides();
  return { skillId, restored: done.count > 0 };
}

// ── Istruzioni approvate, per il servizio AI ─────────────────────────────────────────────────

export type SkillOverrides = Record<string, { version: string; instructions: string[] }>;
const TTL_MS = 15_000;
let cache: { at: number; value: SkillOverrides } | null = null;

export function invalidateApprovedOverrides(): void {
  cache = null;
}

/** Le istruzioni approvate oggi in uso, per competenza. Letta con una piccola cache. */
export async function approvedOverrides(now = Date.now()): Promise<SkillOverrides> {
  if (cache && now - cache.at < TTL_MS) return cache.value;
  const rows = await prisma.miloSkillVersion.findMany({
    where: { status: 'approved' },
    orderBy: { version: 'desc' },
    select: { skillId: true, version: true, baseVersion: true, instructions: true },
  });
  const value: SkillOverrides = {};
  for (const row of rows) {
    if (value[row.skillId] || !isMiloSkillId(row.skillId)) continue;
    try {
      value[row.skillId] = {
        version: `${row.baseVersion}+r${row.version}`,
        instructions: parseInstructions(row.instructions),
      };
    } catch {
      // Riga alterata a mano: ignorata, resta la competenza rilasciata.
    }
  }
  cache = { at: now, value };
  return value;
}
