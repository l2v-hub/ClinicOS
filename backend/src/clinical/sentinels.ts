// Milo fase 5: sentinelle cliniche. Regole DETERMINISTICHE da protocolli riconosciuti, valutate sulle
// misure nuove; producono un promemoria informativo con il perché, mai una diagnosi né un ordine.
// La valutazione resta del professionista.
//
// NEWS2 (Royal College of Physicians, 2017, scala SpO₂ 1):
//   - totale ≥ 7                       → risposta di emergenza          → priorità urgente
//   - totale 5–6                       → valutazione medica urgente     → priorità alta
//   - un singolo parametro a 3          → valutazione medica a breve     → priorità alta
// Solo su rilevazioni COMPLETE (sette parametri): un NEWS2 parziale non è un NEWS2.
//
// Configurazione per struttura (variabili d'ambiente del backend):
//   SENTINEL_NEWS2_ENABLED=false     spegne la sentinella (default: accesa);
//   SENTINEL_NEWS2_ALERT_FROM=3..5   soglia del totale da cui avvisare (default 5, quella del
//                                    protocollo). Si può solo ANTICIPARE l'avviso, mai ritardarlo
//                                    oltre il protocollo: valori fuori 3..5 tornano a 5.

import { news2, NEWS2_LABELS, NEWS2_SOURCE, type News2Parameter } from './scores/news2.js';
import type { ParameterValues } from '../patients/parameter-reading-input.js';

export interface SentinelConfig {
  news2Enabled: boolean;
  news2AlertFrom: number;
}

export function sentinelConfig(env: NodeJS.ProcessEnv = process.env): SentinelConfig {
  const from = Number.parseInt(env.SENTINEL_NEWS2_ALERT_FROM ?? '', 10);
  return {
    news2Enabled: (env.SENTINEL_NEWS2_ENABLED ?? '').trim().toLowerCase() !== 'false',
    news2AlertFrom: Number.isInteger(from) && from >= 3 && from <= 5 ? from : 5,
  };
}

export interface News2Sentinel {
  rule: 'news2';
  total: number;
  risk: string;
  priority: 'urgente' | 'alta';
  /** Parametri che contribuiscono al punteggio, con i punti (es. «FR 2 · SpO₂ 2»). */
  why: string;
  /** Risposta prevista dal protocollo: promemoria informativo. */
  response: string;
  source: string;
}

/** Sentinella NEWS2 su una rilevazione; null se non scatta o se la rilevazione è incompleta. */
export function news2Sentinel(
  values: ParameterValues | Record<string, unknown> | null | undefined,
  cfg: SentinelConfig = sentinelConfig(),
): News2Sentinel | null {
  if (!cfg.news2Enabled || !values || typeof values !== 'object') return null;
  const result = news2(values as ParameterValues);
  if (!result.complete || !result.risk) return null;
  const parts = (Object.entries(result.parts) as Array<[News2Parameter, number | null]>).filter(
    ([, points]) => (points ?? 0) > 0,
  );
  const singleThree = parts.some(([, points]) => points === 3);
  const priority =
    result.total >= 7
      ? 'urgente'
      : result.total >= cfg.news2AlertFrom || singleThree
        ? 'alta'
        : null;
  if (!priority) return null;
  return {
    rule: 'news2',
    total: result.total,
    risk: result.risk,
    priority,
    why: parts.map(([key, points]) => `${NEWS2_LABELS[key]} ${points}`).join(' · '),
    response: result.response ?? '',
    source: `${NEWS2_SOURCE.name} — ${NEWS2_SOURCE.version}`,
  };
}
