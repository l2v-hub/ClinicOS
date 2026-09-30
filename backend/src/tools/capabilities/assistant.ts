// Assistant (Agnos read) tool — adapter over ai/assistant/service.ts#assistantQuery with the SAME
// gateway context derivation as POST /ai/assistant/query (routes/ai-assistant-public.ts
// #ctxFromOperator, reused, not copied): role clamped to non-privileged, patient scope loaded from
// ownership. The 15 gateway read tools stay behind this dispatcher (AGNOS_INTERNAL), and Agnos
// write actions (/ai/actions/*) are not exposed here.

import type { AuthedRequest } from '../../ai/auth.js';
import { assistantQuery } from '../../ai/assistant/service.js';
import { GatewayError } from '../../ai/gateway/types.js';
import {
  ctxFromOperator,
  MAX_ASSISTANT_QUESTION_LENGTH,
} from '../../routes/ai-assistant-public.js';
import { enforcementEnabled, ensureAuthorization } from '../../authz/request-context.js';
import { toolError } from '../errors.js';
import { actorOf, type ToolContext, type ToolDefinition, type ToolErrorShape } from '../types.js';

/** Minimal request view consumed by ctxFromOperator (operator + X-Request-Id header). */
function requestViewOf(ctx: ToolContext): AuthedRequest {
  const view = {
    operator: actorOf(ctx),
    header: (name: string) => (name.toLowerCase() === 'x-request-id' ? ctx.requestId : undefined),
  };
  return view as unknown as AuthedRequest;
}

// Same kind → status table as routes/ai-assistant-public.ts `fail`.
function mapGatewayError(error: unknown): ToolErrorShape | undefined {
  if (!(error instanceof GatewayError)) return undefined;
  switch (error.kind) {
    case 'unauthorized':
      return toolError('unauthenticated', error.message, { domainCode: error.kind });
    case 'forbidden':
    case 'tenant_isolation':
    case 'cross_patient_disabled':
      return toolError('forbidden', error.message, { domainCode: error.kind });
    case 'not_found':
      return toolError('not_found', error.message, { domainCode: error.kind });
    default:
      return toolError('invalid_input', error.message, { domainCode: error.kind });
  }
}

export const assistantTools: ToolDefinition[] = [
  {
    name: 'assistant.query',
    domain: 'assistant',
    kind: 'read',
    auditKind: 'read',
    description:
      'Domanda in linguaggio naturale all’assistente ClinicOS (sola lettura, SOURCE_ONLY): pianifica ed esegue i tool di lettura del gateway nello scope pazienti dell’operatore; rifiuta consigli clinici.',
    sensitivity: 'high',
    inputSchema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          required: ['question'],
          properties: {
            question: { type: 'string' },
            currentPatientId: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    },
    entryPoint: 'POST /ai/assistant/query',
    services: [
      'routes/ai-assistant-public.ts#ctxFromOperator',
      'ai/assistant/service.ts#assistantQuery',
    ],
    mapError: mapGatewayError,
    handler: async (input, ctx) => {
      const body = input.body as { question: string; currentPatientId?: string };
      const question = String(body.question ?? '').slice(0, MAX_ASSISTANT_QUESTION_LENGTH);
      const currentPatientId = body.currentPatientId ? String(body.currentPatientId) : undefined;
      // The route takes the queue-ordering hint from X-Operator-Name; here the server-side identity
      // name plays that role. It never confers permission (role clamp in ctxFromOperator).
      const operatorName = ctx.identity.name?.trim().slice(0, 120) || undefined;
      const view = requestViewOf(ctx);
      // Same policy filter of the Agnos read tools as the HTTP route (enforcement on).
      if (enforcementEnabled()) await ensureAuthorization(view);
      return assistantQuery(question, await ctxFromOperator(view), {
        currentPatientId,
        operatorName,
      });
    },
  },
];
