// 016 F1/F2: configurazione dell'interprete LLM delle letture. Default = deterministico
// (flag off): senza attivazione esplicita il comportamento è identico a oggi (nessuna regressione).

export interface AssistantLlmConfig {
  llmEnabled: boolean;      // master
  planEnabled: boolean;     // F1: planner LLM
  composeEnabled: boolean;  // F2: composer LLM
  planModel: string;        // provider:model_id
  composeModel: string;     // provider:model_id (solo host EU/self-hosted approvato)
  timeoutMs: number;
  runtimeUrl: string;       // clinicos-ai-runtime
}

const bool = (v: string | undefined) => v === 'true' || v === '1';
const int = (v: string | undefined, d: number) => { const n = parseInt(v ?? '', 10); return Number.isFinite(n) ? n : d; };

export function loadAssistantLlmConfig(env: NodeJS.ProcessEnv = process.env): AssistantLlmConfig {
  const llmEnabled = bool(env.AI_ASSISTANT_LLM_ENABLED);
  return {
    llmEnabled,
    planEnabled: llmEnabled && bool(env.AI_ASSISTANT_PLAN_ENABLED),
    composeEnabled: llmEnabled && bool(env.AI_ASSISTANT_COMPOSE_ENABLED),
    planModel: (env.AI_ASSISTANT_PLAN_MODEL ?? '').trim(),
    composeModel: (env.AI_ASSISTANT_COMPOSE_MODEL ?? '').trim(),
    timeoutMs: int(env.AI_ASSISTANT_TIMEOUT_MS, 8000),
    runtimeUrl: (env.AI_RUNTIME_URL ?? '').trim(),
  };
}
