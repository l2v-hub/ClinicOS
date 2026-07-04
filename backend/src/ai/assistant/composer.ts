// 016 F2: composer LLM. Trasforma i risultati recuperati (dati clinici) in una risposta discorsiva
// in italiano che CITA le fonti. È il passaggio in cui i dati clinici raggiungono l'LLM: ammesso
// solo con modello EU/self-hosted (gating in service.ts). Qui vive il POST-CHECK anti-invenzione:
// la prosa è accettata SOLO se ogni fonte citata è tra quelle fornite (citedSources ⊆ sources) e
// ce n'è almeno una; altrimenti la prosa è scartata e la UI mostra la risposta strutturata (FR-006).

import type { SourceReference } from '../gateway/types.js';

export interface ComposeRuntimeResponse { answerText?: string; citedSources?: string[]; refusal?: string }
export interface ComposeAnswerDeps {
  callComposeRuntime?: (req: { question: string; results: unknown[]; sources: SourceReference[] }) => Promise<ComposeRuntimeResponse>;
}
export interface ComposeResult { answerText?: string; composed: boolean; refusal?: string }

/** Identificatori delle fonti fornite (per il post-check citedSources ⊆ sources). */
function sourceIds(sources: SourceReference[]): Set<string> {
  const ids = new Set<string>();
  for (const s of sources) {
    const rec = (s as { recordId?: string }).recordId;
    if (rec) ids.add(rec);
  }
  return ids;
}

export async function composeAnswer(
  question: string,
  results: unknown[],
  sources: SourceReference[],
  deps: ComposeAnswerDeps = {},
): Promise<ComposeResult> {
  if (!deps.callComposeRuntime) return { composed: false };
  try {
    const res = await deps.callComposeRuntime({ question, results, sources });
    if (res.refusal) return { composed: false, refusal: res.refusal };
    const text = (res.answerText ?? '').trim();
    const cited = res.citedSources ?? [];
    if (!text || cited.length === 0) return { composed: false }; // niente prosa non fondata
    const ids = sourceIds(sources);
    // POST-CHECK: ogni fonte citata deve essere tra quelle fornite → altrimenti invenzione, scarta.
    if (!cited.every((c) => ids.has(c))) return { composed: false };
    return { answerText: text, composed: true };
  } catch {
    return { composed: false }; // runtime assente/timeout/errore → risposta strutturata
  }
}
