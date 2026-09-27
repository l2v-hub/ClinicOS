// NEWS2 (National Early Warning Score 2, Royal College of Physicians 2017) calcolato da UNA
// rilevazione: i sette parametri devono essere misurati insieme. Scala SpO₂ 1: la scala 2
// (pazienti con target 88–92%, es. BPCO) è una scelta del medico e non è gestita qui.
// Le soglie sono quelle pubblicate dall'RCP; l'adozione clinica va validata dal direttore sanitario.
import type { ParameterValues } from './patientParameterReadings';

export const NEWS2_PARAMETERS = [
  'fr',
  'spo2',
  'o2',
  'pa',
  'fc',
  'coscienza',
  'temperatura',
] as const;
export type News2Parameter = (typeof NEWS2_PARAMETERS)[number];

export const NEWS2_LABELS: Record<News2Parameter, string> = {
  fr: 'FR',
  spo2: 'SpO₂',
  o2: 'O₂',
  pa: 'PA',
  fc: 'FC',
  coscienza: 'Coscienza',
  temperatura: 'TC',
};

export type News2Risk = 'nessuno' | 'basso' | 'basso-singolo' | 'medio' | 'alto';

export interface News2Result {
  /** Punteggio per parametro; null se il parametro manca o non è leggibile. */
  parts: Record<News2Parameter, number | null>;
  /** Parametri mancanti: se ce n'è anche uno, il totale NON è un NEWS2 valido. */
  missing: News2Parameter[];
  complete: boolean;
  /** Somma dei soli parametri presenti; significativa come NEWS2 solo se complete. */
  total: number;
  risk: News2Risk | null;
  response: string | null;
}

// Solo numeri decimali semplici e fisiologicamente plausibili: un refuso ("368" per 36,8) o una
// forma strana ("0x1F", "1e1", "-5") rende il parametro illeggibile, quindi la rilevazione è
// incompleta e non mostra un punteggio, invece di produrne uno falso.
const PLAUSIBLE: Record<'fr' | 'spo2' | 'pas' | 'fc' | 't', [number, number]> = {
  fr: [1, 80],
  spo2: [50, 100],
  pas: [40, 300],
  fc: [20, 300],
  t: [30, 45],
};
const num = (text: string | undefined, range: [number, number]): number | null => {
  const clean = text?.trim();
  if (!clean || !/^\d{1,3}(?:[.,]\d{1,2})?$/.test(clean)) return null;
  const value = Number(clean.replace(',', '.'));
  return value >= range[0] && value <= range[1] ? value : null;
};

export function news2Parts(values: ParameterValues): Record<News2Parameter, number | null> {
  const fr = num(values.fr, PLAUSIBLE.fr);
  const spo2 = num(values.spo2, PLAUSIBLE.spo2);
  const pasText = values.pa?.trim().match(/^(\d{2,3})\s*\/\s*\d{2,3}$/)?.[1];
  const pas = num(pasText, PLAUSIBLE.pas);
  const fc = num(values.fc, PLAUSIBLE.fc);
  const t = num(values.temperatura, PLAUSIBLE.t);
  const o2 = values.o2 === 'si' ? 2 : values.o2 === 'no' ? 0 : null;
  const coscienza = values.coscienza ? (values.coscienza === 'A' ? 0 : 3) : null;
  return {
    fr: fr === null ? null : fr <= 8 ? 3 : fr <= 11 ? 1 : fr <= 20 ? 0 : fr <= 24 ? 2 : 3,
    spo2: spo2 === null ? null : spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0,
    o2,
    pa: pas === null ? null : pas <= 90 ? 3 : pas <= 100 ? 2 : pas <= 110 ? 1 : pas <= 219 ? 0 : 3,
    fc:
      fc === null
        ? null
        : fc <= 40
          ? 3
          : fc <= 50
            ? 1
            : fc <= 90
              ? 0
              : fc <= 110
                ? 1
                : fc <= 130
                  ? 2
                  : 3,
    coscienza,
    temperatura: t === null ? null : t <= 35 ? 3 : t <= 36 ? 1 : t <= 38 ? 0 : t <= 39 ? 1 : 2,
  };
}

export const NEWS2_RESPONSE: Record<News2Risk, string> = {
  nessuno: 'Monitoraggio ogni 12 ore',
  basso: 'Monitoraggio ogni 4–6 ore',
  'basso-singolo': 'Valutazione medica a breve (un parametro a 3)',
  medio: 'Valutazione medica urgente',
  alto: 'Risposta di emergenza',
};

export function news2(values: ParameterValues): News2Result {
  const parts = news2Parts(values);
  const missing = NEWS2_PARAMETERS.filter((key) => parts[key] === null);
  const total = NEWS2_PARAMETERS.reduce((sum, key) => sum + (parts[key] ?? 0), 0);
  const complete = missing.length === 0;
  if (!complete) return { parts, missing, complete, total, risk: null, response: null };
  const single3 = NEWS2_PARAMETERS.some((key) => parts[key] === 3);
  const risk: News2Risk =
    total >= 7
      ? 'alto'
      : total >= 5
        ? 'medio'
        : single3
          ? 'basso-singolo'
          : total >= 1
            ? 'basso'
            : 'nessuno';
  return {
    parts,
    missing,
    complete,
    total,
    risk,
    response: NEWS2_RESPONSE[risk],
  };
}
