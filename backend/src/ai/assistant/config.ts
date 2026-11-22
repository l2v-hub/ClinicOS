import { aiEnabled } from '../../lib/ai-flags.js';

// 016 F1/F2: configurazione dell'interprete LLM delle letture. Default = deterministico
// (flag off): senza attivazione esplicita il comportamento è identico a oggi (nessuna regressione).
// Phase 9: niente nomi di modello qui — il runtime sceglie provider/modello per ruolo logico
// (REASONING per il planner, SUMMARY per il composer). AI_ENABLED=false spegne tutto.

export interface AssistantLlmConfig {
  llmEnabled: boolean; // master
  planEnabled: boolean; // F1: planner LLM
  composeEnabled: boolean; // F2: composer LLM
  /** Milo fase 2: team di agenti nel servizio AI (letture in ciclo, risposta con fonti). */
  teamEnabled: boolean;
  teamTimeoutMs: number;
  timeoutMs: number;
  runtimeUrl: string; // clinicos-ai-runtime
}

const bool = (v: string | undefined) => v === 'true' || v === '1';
const int = (v: string | undefined, d: number) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : d;
};

/**
 * Milo fase 2: i dati clinici raggiungono il modello solo nel compositore e nel team. La struttura
 * decide se è ammesso (fornitore, regione e contratto approvati): AI_CLINICAL_DATA_TO_MODEL=deny
 * spegne entrambi, qualunque altro flag sia attivo; il pianificatore (sola domanda) resta. Valore
 * assente = comportamento precedente (ammesso), finché la struttura non conferma la regione.
 */
export function clinicalDataToModelAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AI_CLINICAL_DATA_TO_MODEL ?? '').trim().toLowerCase() !== 'deny';
}

export function loadAssistantLlmConfig(env: NodeJS.ProcessEnv = process.env): AssistantLlmConfig {
  const llmEnabled = aiEnabled(env) && bool(env.AI_ASSISTANT_LLM_ENABLED);
  const clinicalData = clinicalDataToModelAllowed(env);
  return {
    llmEnabled,
    planEnabled: llmEnabled && bool(env.AI_ASSISTANT_PLAN_ENABLED),
    composeEnabled: llmEnabled && clinicalData && bool(env.AI_ASSISTANT_COMPOSE_ENABLED),
    teamEnabled: llmEnabled && clinicalData && bool(env.AI_ASSISTANT_TEAM_ENABLED),
    teamTimeoutMs: Math.min(
      110_000,
      Math.max(5_000, int(env.AI_ASSISTANT_TEAM_TIMEOUT_MS, 60_000)),
    ),
    timeoutMs: int(env.AI_ASSISTANT_TIMEOUT_MS, 8000),
    runtimeUrl: (env.AI_RUNTIME_URL ?? '').trim(),
  };
}
