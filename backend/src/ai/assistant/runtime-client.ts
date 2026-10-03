// 016 F1: client HTTP verso clinicos-ai-runtime per il planner LLM. Stesso schema di auth
// service-to-service dell'estrazione (Bearer AI_RUNTIME_SERVICE_TOKEN). Timeout esplicito:
// oltre la soglia, l'errore fa scattare il fallback deterministico in planQueryLLM.

import type { LlmPlanRequest, LlmPlanResponse } from './llm-planner.js';
import type { AssistantLlmConfig } from './config.js';
import {
  classifyAiFailure,
  correlationHeaders,
  recordAiCall,
  aiMetaOf,
  runtimeErrorMeta,
  type AiCallKind,
} from '../../lib/observability.js';

// Phase 9: one instrumented POST for every runtime call — correlation id forwarded, outcome /
// latency / request size recorded (never the content). No retry here: the callers fall back to the
// deterministic path, and a retry would double the latency budget of an interactive turn.
async function runtimePost<T>(
  kind: AiCallKind,
  url: string,
  token: string,
  payload: unknown,
  timeoutMs: number,
): Promise<T> {
  const body = JSON.stringify(payload);
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...correlationHeaders(),
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    recordAiCall(kind, classifyAiFailure(error), Date.now() - started, body.length);
    throw error;
  }
  if (!res.ok) {
    recordAiCall(
      kind,
      classifyAiFailure(null, res.status),
      Date.now() - started,
      body.length,
      await runtimeErrorMeta(res),
    );
    throw new Error(`assistant ${kind} runtime HTTP ${res.status}`);
  }
  try {
    const parsed = (await res.json()) as T;
    recordAiCall(kind, 'ok', Date.now() - started, body.length, aiMetaOf(parsed));
    return parsed;
  } catch (error) {
    recordAiCall(kind, 'malformed', Date.now() - started, body.length);
    throw error;
  }
}

export async function callPlanRuntime(
  req: LlmPlanRequest,
  cfg: AssistantLlmConfig,
): Promise<LlmPlanResponse> {
  const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
  if (!cfg.runtimeUrl || !token) throw new Error('assistant plan runtime not configured');
  return runtimePost<LlmPlanResponse>(
    'assistant_plan',
    `${cfg.runtimeUrl.replace(/\/$/, '')}/v1/assistant/plan`,
    token,
    { ...req, role: 'reasoning' },
    cfg.timeoutMs,
  );
}

import type { ComposeRuntimeResponse } from './composer.js';
import type { SourceReference } from '../gateway/types.js';

// 016 F2: client compose. Invia i risultati (dati clinici) al runtime SOLO se il modello è
// configurato (host EU/self-hosted — gating a monte). Timeout esplicito → fallback strutturato.
export async function callComposeRuntime(
  req: { question: string; results: unknown[]; sources: SourceReference[] },
  cfg: AssistantLlmConfig,
  kind: 'assistant_compose' | 'briefing' = 'assistant_compose',
): Promise<ComposeRuntimeResponse> {
  const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
  if (!cfg.runtimeUrl || !token) throw new Error('assistant compose runtime not configured');
  return runtimePost<ComposeRuntimeResponse>(
    kind,
    `${cfg.runtimeUrl.replace(/\/$/, '')}/v1/assistant/compose`,
    token,
    { ...req, language: 'it', role: 'summary' },
    cfg.timeoutMs,
  );
}
