// 016 F1: client HTTP verso clinicos-ai-runtime per il planner LLM. Stesso schema di auth
// service-to-service dell'estrazione (Bearer AI_RUNTIME_SERVICE_TOKEN). Timeout esplicito:
// oltre la soglia, l'errore fa scattare il fallback deterministico in planQueryLLM.

import type { LlmPlanRequest, LlmPlanResponse } from './llm-planner.js';
import type { AssistantLlmConfig } from './config.js';

export async function callPlanRuntime(req: LlmPlanRequest, cfg: AssistantLlmConfig): Promise<LlmPlanResponse> {
  const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
  if (!cfg.runtimeUrl || !token || !cfg.planModel) throw new Error('assistant plan runtime not configured');
  const res = await fetch(`${cfg.runtimeUrl.replace(/\/$/, '')}/v1/assistant/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ...req, model: cfg.planModel }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  if (!res.ok) throw new Error(`assistant plan runtime HTTP ${res.status}`);
  return res.json() as Promise<LlmPlanResponse>;
}

import type { ComposeRuntimeResponse } from './composer.js';
import type { SourceReference } from '../gateway/types.js';

// 016 F2: client compose. Invia i risultati (dati clinici) al runtime SOLO se il modello è
// configurato (host EU/self-hosted — gating a monte). Timeout esplicito → fallback strutturato.
export async function callComposeRuntime(
  req: { question: string; results: unknown[]; sources: SourceReference[] },
  cfg: AssistantLlmConfig,
): Promise<ComposeRuntimeResponse> {
  const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
  if (!cfg.runtimeUrl || !token || !cfg.composeModel) throw new Error('assistant compose runtime not configured');
  const res = await fetch(`${cfg.runtimeUrl.replace(/\/$/, '')}/v1/assistant/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ...req, language: 'it', model: cfg.composeModel }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  if (!res.ok) throw new Error(`assistant compose runtime HTTP ${res.status}`);
  return res.json() as Promise<ComposeRuntimeResponse>;
}
