// Milo, caso «come va il paziente… cosa devo controllare»: punti di attenzione calcolati dal SISTEMA
// con il protocollo NEWS2 (RCP 2017), mai dal modello. Sono promemoria informativi: dicono quali
// parametri pesano sul punteggio, come è cambiato nel periodo e quali misure mancano. Nessuna
// diagnosi, nessuna indicazione di terapia: la valutazione resta del professionista.

import {
  news2,
  NEWS2_LABELS,
  NEWS2_PARAMETERS,
  NEWS2_SOURCE,
  type News2Parameter,
  type News2Result,
} from '../../clinical/scores/news2.js';
import type { ParameterValues } from '../../patients/parameter-reading-input.js';
import { facilityDay, type UnifiedReading } from './clinical-series.js';

export type AttentionTone = 'alarm' | 'warning' | 'info';
export interface AttentionPoint {
  key: string;
  label: string;
  /** Sintesi breve (es. «2 punti», «da 0 a 6»). */
  value: string;
  detail: string;
  tone: AttentionTone;
}
export interface AttentionSummary {
  points: AttentionPoint[];
  source: string;
  disclaimer: string;
}

const RISK_LABEL: Record<string, string> = {
  nessuno: 'nessun rischio',
  basso: 'rischio basso',
  'basso-singolo': 'un parametro a 3',
  medio: 'rischio medio',
  alto: 'rischio alto',
};
const UNIT: Partial<Record<News2Parameter, string>> = {
  fr: 'atti/min',
  spo2: '%',
  pa: 'mmHg',
  fc: 'bpm',
  temperatura: '°C',
};
const NAME: Record<News2Parameter, string> = {
  fr: 'Frequenza respiratoria',
  spo2: 'Saturazione',
  o2: 'Ossigeno supplementare',
  pa: 'Pressione',
  fc: 'Frequenza cardiaca',
  coscienza: 'Coscienza',
  temperatura: 'Temperatura',
};
const dayLabel = (iso: string) => {
  const [, m, d] = facilityDay(iso).split('-');
  return `${d}/${m}`;
};
const shown = (key: News2Parameter, raw: string | undefined) =>
  key === 'o2' ? (raw === 'si' ? 'sì' : 'no') : `${raw ?? '—'}${UNIT[key] ? ` ${UNIT[key]}` : ''}`;

interface Scored {
  reading: UnifiedReading;
  result: News2Result;
}

/** Punti da controllare sulle rilevazioni di un periodo (in qualunque ordine). */
export function attentionPoints(readings: UnifiedReading[]): AttentionSummary {
  const ordered = [...readings]
    .filter((r) => r.source === 'parametri')
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const scored: Scored[] = ordered.map((reading) => ({
    reading,
    result: news2(reading.values as ParameterValues),
  }));
  const complete = scored.filter((s) => s.result.complete);
  const points: AttentionPoint[] = [];
  const first = complete[0];
  const last = complete[complete.length - 1];

  if (last) {
    const risk = last.result.risk ?? 'nessuno';
    if (risk !== 'nessuno')
      points.push({
        key: 'news2',
        label: 'NEWS2 dell’ultima rilevazione completa',
        value: `${last.result.total} — ${RISK_LABEL[risk] ?? risk}`,
        detail: `Rilevazione del ${dayLabel(last.reading.measuredAt)}. Risposta prevista dal protocollo: ${last.result.response ?? '—'}.`,
        tone: risk === 'alto' ? 'alarm' : risk === 'basso' ? 'info' : 'warning',
      });
    if (first && first !== last && first.result.total !== last.result.total)
      points.push({
        key: 'news2_trend',
        label: 'Andamento del NEWS2 nel periodo',
        value: `da ${first.result.total} a ${last.result.total}`,
        detail: `Da ${first.result.total} (${dayLabel(first.reading.measuredAt)}) a ${last.result.total} (${dayLabel(last.reading.measuredAt)}) sulle rilevazioni complete.`,
        tone: last.result.total > first.result.total ? 'warning' : 'info',
      });
    for (const key of NEWS2_PARAMETERS) {
      const now = last.result.parts[key] ?? 0;
      if (now <= 0) continue;
      const before = first && first !== last ? (first.result.parts[key] ?? 0) : null;
      const change =
        before === null || before === now
          ? ''
          : ` Era ${before} ${before === 1 ? 'punto' : 'punti'} il ${dayLabel(first!.reading.measuredAt)}.`;
      points.push({
        key: `param_${key}`,
        label: NAME[key],
        value: `${now} ${now === 1 ? 'punto' : 'punti'}`,
        detail: `${NEWS2_LABELS[key]} ${shown(key, last.reading.values[key])}: ${now} ${now === 1 ? 'punto' : 'punti'} NEWS2.${change}`,
        tone: now >= 3 ? 'alarm' : 'warning',
      });
    }
  }

  const latest = scored[scored.length - 1];
  if (latest && !latest.result.complete)
    points.push({
      key: 'incomplete',
      label: 'Ultima rilevazione incompleta',
      value: `${latest.result.missing.length} mancanti`,
      detail: `Rilevazione del ${dayLabel(latest.reading.measuredAt)}: mancano ${latest.result.missing.map((k) => NEWS2_LABELS[k]).join(', ')}. Su quella rilevazione il NEWS2 non è calcolabile.`,
      tone: 'info',
    });
  if (!complete.length && scored.length) {
    const never = NEWS2_PARAMETERS.filter((k) => scored.every((s) => s.result.missing.includes(k)));
    points.push({
      key: 'no_complete',
      label: 'Nessuna rilevazione completa nel periodo',
      value: 'NEWS2 non calcolabile',
      detail: never.length
        ? `Mai rilevati nel periodo: ${never.map((k) => NEWS2_LABELS[k]).join(', ')}.`
        : 'Ogni rilevazione manca di almeno uno dei sette parametri.',
      tone: 'info',
    });
  }
  if (!scored.length)
    points.push({
      key: 'no_readings',
      label: 'Nessuna rilevazione nel periodo',
      value: '—',
      detail: 'Nel periodo non risultano rilevazioni nella pagina Parametri.',
      tone: 'info',
    });

  return {
    points,
    source: `${NEWS2_SOURCE.name} — ${NEWS2_SOURCE.version}`,
    disclaimer:
      'Promemoria calcolati dal sistema sul protocollo: non sono una diagnosi, la valutazione resta del professionista.',
  };
}
