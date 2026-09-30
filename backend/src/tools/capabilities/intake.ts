// Intake draft tools — thin adapters over intake/draft-service and ai/upload/confirm-service (the
// same symbols used by routes/intake-drafts.ts). Draft ownership mirrors the route's
// `router.param('id', requireOwnedIntakeDraft)`: same owner loader + `canAccessOwnedResource`,
// same non-enumerating 404.
//
// Not exposed in Phase 1 (catalogued only): from-import seeding, import-job link/unlink/merge,
// proposal decisions and refresh — they need an AI extraction job produced by the OCR pipeline.

import {
  canAccessOwnedResource,
  importJobIsAccessible,
  loadIntakeDraftOwner,
} from '../../ai/ownership.js';
import { AiExtractionError } from '../../ai/types.js';
import { createDraft, getDraft, listDrafts, patchDraft } from '../../intake/draft-service.js';
import { confirmDraft, type ConfirmPayload } from '../../ai/upload/confirm-service.js';
import { ToolError, toolError } from '../errors.js';
import { actorOf, type ToolContext, type ToolDefinition, type ToolErrorShape } from '../types.js';

/** Same check as `requireOwnedIntakeDraft`: missing or not owned (and not admin/manager) → 404. */
async function assertOwnedDraft(draftId: string, ctx: ToolContext): Promise<void> {
  const draft = await loadIntakeDraftOwner(draftId);
  if (!draft || !canAccessOwnedResource(actorOf(ctx), draft.createdById)) {
    throw new ToolError('not_found', 'Bozza non trovata', { domainCode: 'draft_not_found' });
  }
}

/** Mirrors `handleError` in routes/intake-drafts.ts for AiExtractionError (no numeric status). */
function mapIntakeError(error: unknown): ToolErrorShape | undefined {
  if (error instanceof AiExtractionError) {
    const code =
      error.kind === 'not_found'
        ? 'not_found'
        : error.kind === 'config'
          ? 'invalid_input'
          : 'unavailable';
    return toolError(code, error.message, { domainCode: error.kind });
  }
  return undefined;
}

const draftIdSchema = { type: 'string', minLength: 1 } as const;
const bodyObject = { type: 'object', additionalProperties: true } as const;

export const intakeTools: ToolDefinition[] = [
  {
    name: 'intake.list_drafts',
    domain: 'intake',
    kind: 'read',
    auditKind: 'read',
    description: 'Elenco delle bozze di ingresso aperte create dall’operatore corrente.',
    sensitivity: 'high',
    inputSchema: { type: 'object', additionalProperties: false },
    entryPoint: 'GET /intake/drafts',
    services: ['intake/draft-service.ts#listDrafts'],
    handler: async (_input, ctx) => listDrafts(ctx.identity.operatorId),
  },
  {
    name: 'intake.create_draft',
    domain: 'intake',
    kind: 'write',
    auditKind: 'create',
    description:
      'Crea una bozza di ingresso (manuale, o seminata da un job di importazione accessibile).',
    sensitivity: 'high',
    idempotency: 'none',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          properties: {
            source: { type: 'string', enum: ['manual', 'import'] },
            importJobId: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /intake/drafts',
    services: ['ai/ownership.ts#importJobIsAccessible', 'intake/draft-service.ts#createDraft'],
    mapError: mapIntakeError,
    handler: async (input, ctx) => {
      const { source, importJobId } = (input.body ?? {}) as Record<string, unknown>;
      const normalizedImportJobId =
        typeof importJobId === 'string' ? importJobId.trim() : undefined;
      if (
        normalizedImportJobId &&
        !(await importJobIsAccessible(normalizedImportJobId, actorOf(ctx)))
      ) {
        throw new ToolError('not_found', 'Job non trovato', { domainCode: 'job_not_found' });
      }
      return createDraft({
        createdById: ctx.identity.operatorId,
        source: source === 'import' ? 'import' : 'manual',
        importJobId: normalizedImportJobId,
      });
    },
  },
  {
    name: 'intake.get_draft',
    domain: 'intake',
    kind: 'read',
    auditKind: 'read',
    description: 'Legge una bozza di ingresso (solo proprietario o admin/manager).',
    sensitivity: 'high',
    inputSchema: {
      type: 'object',
      required: ['draftId'],
      properties: { draftId: draftIdSchema },
      additionalProperties: false,
    },
    entryPoint: 'GET /intake/drafts/:id',
    services: ['ai/ownership.ts#loadIntakeDraftOwner', 'intake/draft-service.ts#getDraft'],
    handler: async (input, ctx) => {
      const draftId = String(input.draftId);
      await assertOwnedDraft(draftId, ctx);
      const draft = await getDraft(draftId);
      if (!draft)
        throw new ToolError('not_found', 'Bozza non trovata', { domainCode: 'draft_not_found' });
      return draft;
    },
  },
  {
    name: 'intake.update_draft',
    domain: 'intake',
    kind: 'write',
    auditKind: 'update',
    description:
      'Autosalvataggio della bozza: unione superficiale delle sezioni in body dentro draft.data (chiavi server-owned ignorate, campi di importazione immutabili).',
    sensitivity: 'high',
    idempotency: 'none',
    inputSchema: {
      type: 'object',
      required: ['draftId', 'body'],
      properties: { draftId: draftIdSchema, body: bodyObject },
      additionalProperties: false,
    },
    entryPoint: 'PATCH /intake/drafts/:id',
    services: ['ai/ownership.ts#loadIntakeDraftOwner', 'intake/draft-service.ts#patchDraft'],
    mapError: mapIntakeError,
    handler: async (input, ctx) => {
      const draftId = String(input.draftId);
      await assertOwnedDraft(draftId, ctx);
      return patchDraft(draftId, input.body as Record<string, unknown>);
    },
  },
  {
    name: 'intake.confirm_draft',
    domain: 'intake',
    kind: 'action',
    auditKind: 'create',
    description:
      'Conferma transazionale della bozza: crea (o aggiorna) Paziente + Cartella, terapie, sezioni narrative e documenti. Replay idempotente; un possibile duplicato restituisce conflict con i dati del duplicato (ripetere con body.confirmDuplicate=true).',
    sensitivity: 'critical',
    idempotency: 'natural',
    inputSchema: {
      type: 'object',
      required: ['draftId', 'body'],
      properties: {
        draftId: draftIdSchema,
        body: {
          type: 'object',
          required: ['patient'],
          properties: {
            patient: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                dateOfBirth: { type: ['string', 'null'] },
                sex: { type: 'string' },
                codiceFiscale: { type: ['string', 'null'] },
              },
              additionalProperties: true,
            },
            cartella: bodyObject,
            therapies: { type: 'array' },
            confirmDuplicate: { type: 'boolean' },
            confirmAllergyConflict: { type: 'boolean' },
          },
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /intake/drafts/:id/confirm',
    services: ['ai/ownership.ts#loadIntakeDraftOwner', 'ai/upload/confirm-service.ts#confirmDraft'],
    mapError: mapIntakeError,
    handler: async (input, ctx) => {
      const draftId = String(input.draftId);
      await assertOwnedDraft(draftId, ctx);
      const result = await confirmDraft(
        draftId,
        input.body as unknown as ConfirmPayload,
        actorOf(ctx),
      );
      // The route answers 409 with the same body: the tool reports it as a conflict.
      if (result.status === 'duplicate') {
        throw new ToolError('conflict', 'Possibile paziente duplicato', {
          domainCode: 'duplicate_patient',
          details: { ...result },
        });
      }
      return result;
    },
  },
];
