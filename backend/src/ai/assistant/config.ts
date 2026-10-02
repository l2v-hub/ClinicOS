import { aiEnabled } from '../../lib/ai-flags.js';

// 016 F1/F2: configurazione dell'interprete LLM delle letture. Default = deterministico
// (flag off): senza attivazione esplicita il comportamento è identico a oggi (nessuna regressione).
// Phase 9: niente nomi di modello qui — il runtime sceglie provider/modello per ruolo logico
// (REASONING per il planner, SUMMARY per il composer). AI_ENABLED=false spegne tutto.

export interface AssistantLlmConfig {
  llmEnabled: boolean; // master
  planEnabled: boolean; // F1: planner LLM
  composeEnabled: boolean; // F2: composer LLM
  timeoutMs: number;
  runtimeUrl: string; // clinicos-ai-runtime
}

const bool = (v: string | undefined) => v === 'true' || v === '1';
const int = (v: string | undefined, d: number) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : d;
};

export function loadAssistantLlmConfig(env: NodeJS.ProcessEnv = process.env): AssistantLlmConfig {
  const llmEnabled = aiEnabled(env) && bool(env.AI_ASSISTANT_LLM_ENABLED);
  return {
    llmEnabled,
    planEnabled: llmEnabled && bool(env.AI_ASSISTANT_PLAN_ENABLED),
    composeEnabled: llmEnabled && bool(env.AI_ASSISTANT_COMPOSE_ENABLED),
    timeoutMs: int(env.AI_ASSISTANT_TIMEOUT_MS, 8000),
    runtimeUrl: (env.AI_RUNTIME_URL ?? '').trim(),
  };
}
