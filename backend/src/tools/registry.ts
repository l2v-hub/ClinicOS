// Tool registry + invocation pipeline.
//
//   identity → authorization hook → input schema → patient scope → handler (existing service)
//            → audit hook → uniform ToolResult envelope
//
// The pipeline adds NO business rule of its own: the patient-scope step is the exact check of the
// `requirePatientScope` route middleware, re-used so a tool cannot reach a patient the equivalent
// route would hide.

import { randomUUID } from 'node:crypto';
import { Ajv, type ValidateFunction } from 'ajv';
import { prisma } from '../lib/prisma.js';
import { patientIsInOperatorScope } from '../patients/patient-scope.js';
import { ToolError, toToolErrorShape, toolError } from './errors.js';
import { currentAuthorizationHook, emitToolAudit, type ToolAuditOutcome } from './hooks.js';
import {
  actorOf,
  type ToolContext,
  type ToolDefinition,
  type ToolDescriptor,
  type ToolErrorShape,
  type ToolResult,
} from './types.js';

const MAX_REQUEST_ID = 128;

export interface InvokeContext {
  identity?: ToolContext['identity'] | null;
  origin?: ToolContext['origin'];
  requestId?: string;
  /** Explicit user confirmation, required when the policy effect is ALLOWED_WITH_CONFIRMATION. */
  confirmed?: boolean;
}

export interface ToolRegistry {
  list(): ToolDefinition[];
  get(name: string): ToolDefinition | undefined;
  describe(tool: ToolDefinition, options?: { requiresConfirmation?: boolean }): ToolDescriptor;
  invoke<O = unknown>(name: string, input: unknown, ctx: InvokeContext): Promise<ToolResult<O>>;
}

function inputFieldNames(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return [];
  const names: string[] = [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if ((key === 'body' || key === 'query') && value && typeof value === 'object') {
      for (const nested of Object.keys(value as Record<string, unknown>)) {
        names.push(`${key}.${nested}`);
      }
    } else {
      names.push(key);
    }
  }
  return names.slice(0, 20);
}

function patientIdOf(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null;
  const value = (input as Record<string, unknown>).patientId;
  return typeof value === 'string' && value ? value : null;
}

export function createToolRegistry(definitions: readonly ToolDefinition[]): ToolRegistry {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const tools = new Map<string, ToolDefinition>();
  const validators = new Map<string, ValidateFunction>();

  for (const definition of definitions) {
    if (tools.has(definition.name)) throw new Error(`Tool duplicato: ${definition.name}`);
    if (definition.patientScoped) {
      const required = (definition.inputSchema.required as string[] | undefined) ?? [];
      if (!required.includes('patientId')) {
        throw new Error(`Tool ${definition.name}: patientScoped richiede patientId obbligatorio`);
      }
    }
    tools.set(definition.name, definition);
    validators.set(definition.name, ajv.compile(definition.inputSchema));
  }

  function describe(
    tool: ToolDefinition,
    options: { requiresConfirmation?: boolean } = {},
  ): ToolDescriptor {
    return {
      ...(options.requiresConfirmation ? { requiresConfirmation: true } : {}),
      name: tool.name,
      domain: tool.domain,
      kind: tool.kind,
      description: tool.description,
      sensitivity: tool.sensitivity,
      patientScoped: Boolean(tool.patientScoped),
      idempotency: tool.idempotency ?? 'none',
      inputSchema: tool.inputSchema,
    };
  }

  async function invoke<O>(
    name: string,
    rawInput: unknown,
    invokeCtx: InvokeContext,
  ): Promise<ToolResult<O>> {
    const requestedId =
      typeof invokeCtx.requestId === 'string'
        ? invokeCtx.requestId.trim().slice(0, MAX_REQUEST_ID)
        : '';
    const requestId = requestedId || `tool-${randomUUID()}`;
    const fail = (error: ToolErrorShape): ToolResult<O> => ({
      ok: false,
      tool: name,
      requestId,
      error,
    });

    const tool = tools.get(name);
    if (!tool)
      return fail(
        toolError('not_found', 'Strumento non disponibile', { domainCode: 'tool_not_found' }),
      );

    const identity = invokeCtx.identity;
    if (!identity || !identity.operatorId || !identity.role) {
      return fail(
        toolError('unauthenticated', 'Autenticazione richiesta', {
          domainCode: 'operator_missing',
        }),
      );
    }
    const ctx: ToolContext = { identity, origin: invokeCtx.origin ?? 'tool', requestId };
    const input = (rawInput ?? {}) as Record<string, unknown>;
    // Role attributed in the audit trail: the policy role that decided (historical attribution).
    let auditRole = identity.appRole ?? identity.role;
    const audit = (outcome: ToolAuditOutcome, errorCode?: string) =>
      emitToolAudit({
        tool: tool.name,
        auditKind: tool.auditKind,
        requestId,
        operatorId: identity.operatorId,
        operatorRole: auditRole,
        origin: ctx.origin,
        patientId: patientIdOf(input),
        fields: inputFieldNames(input),
        outcome,
        ...(errorCode ? { errorCode } : {}),
      });

    let decision;
    try {
      decision = await currentAuthorizationHook()(tool, ctx, input);
    } catch {
      decision = {
        allowed: false,
        code: 'authorization_unavailable',
        reason: 'Autorizzazione non disponibile',
      };
    }
    if (decision.roleId) auditRole = decision.roleId;
    if (!decision.allowed) {
      audit('denied', decision.code);
      return fail(
        toolError('forbidden', decision.reason ?? 'Operazione non autorizzata', {
          domainCode: decision.code ?? 'forbidden',
        }),
      );
    }
    if (decision.requiresConfirmation && invokeCtx.confirmed !== true) {
      audit('denied', 'confirmation_required');
      return fail(
        toolError('confirmation_required', 'Operazione da confermare esplicitamente', {
          domainCode: 'confirmation_required',
        }),
      );
    }

    const validate = validators.get(tool.name)!;
    if (!validate(input)) {
      audit('error', 'invalid_input');
      return fail(
        toolError('invalid_input', 'Input dello strumento non valido', {
          details: {
            errors: (validate.errors ?? []).slice(0, 10).map((e) => ({
              path: e.instancePath || '/',
              message: e.message ?? 'non valido',
            })),
          },
        }),
      );
    }

    if (tool.patientScoped) {
      let allowed: boolean;
      try {
        allowed = await patientIsInOperatorScope(String(input.patientId), actorOf(ctx), prisma);
      } catch {
        audit('error', 'scope_unavailable');
        return fail(
          toolError('unavailable', 'Verifica accesso non disponibile', {
            domainCode: 'scope_unavailable',
          }),
        );
      }
      if (!allowed) {
        audit('denied', 'patient_not_found');
        return fail(
          toolError('not_found', 'Paziente non trovato', { domainCode: 'patient_not_found' }),
        );
      }
    }

    try {
      const data = (await tool.handler(input, ctx)) as O;
      audit('ok');
      return { ok: true, tool: tool.name, requestId, data };
    } catch (error) {
      const shape = tool.mapError?.(error) ?? toToolErrorShape(error);
      if (shape.code === 'internal' && !(error instanceof ToolError)) {
        console.error(
          `[tool] ${tool.name} errore interno:`,
          error instanceof Error ? error.name : 'unknown',
        );
      }
      audit(shape.status === 403 ? 'denied' : 'error', shape.domainCode ?? shape.code);
      return fail(shape);
    }
  }

  return {
    list: () => [...tools.values()],
    get: (name) => tools.get(name),
    describe,
    invoke,
  };
}
