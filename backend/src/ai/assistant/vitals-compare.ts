// Agnos KB: confronti parametri computati dal BACKEND (mai dall'LLM). Funzioni pure e testabili.
// entries = cartella.parametriVitali (letti dal gateway a monte, authz già applicata).

export interface VitalEntry { id?: string; etichetta?: string; valore?: string; rilevato?: string }
export interface VitalValue { num: number; num2?: number }            // num2 = diastolica per PA
export interface VitalsComparison { label: string; dayA: string; dayB: string;
  valA: VitalValue|null; valB: VitalValue|null; delta: VitalValue|null; unit: string;
  weeklyAvg: VitalValue|null; deviation: boolean }
export interface TrendDay { date: string; min: number; max: number; avg: number }
export interface VitalsTrend { label: string; days: TrendDay[]; direction: 'salita'|'stabile'|'calo'; unit: string }

const UNITS: Record<string, string> = { PA: 'mmHg', FC: 'bpm', TC: '°C', T: '°C', SPO2: '%', FR: 'atti/min' };
// Soglie scostamento (spec §3): sono DATO, mai giudizio clinico. Override via env AGNOS_DEV_<LABEL>.
const DEV_THRESHOLDS: Record<string, number> = { PA: 15, FC: 15, TC: 0.8, T: 0.8, SPO2: 3 };

const normLabel = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function parseVitalValue(valore: string): VitalValue | null {
  const two = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec((valore || '').trim());
  if (two) return { num: parseInt(two[1], 10), num2: parseInt(two[2], 10) };
  const one = /^(\d{1,3}(?:[.,]\d+)?)$/.exec((valore || '').trim());
  if (one) return { num: parseFloat(one[1].replace(',', '.')) };
  return null;
}

function ofLabel(entries: VitalEntry[], label: string): Array<{ at: string; v: VitalValue }> {
  const want = normLabel(label);
  return entries
    .filter((e) => e.rilevato && normLabel(e.etichetta ?? '') === want)
    .map((e) => ({ at: e.rilevato!, v: parseVitalValue(e.valore ?? '') }))
    .filter((x): x is { at: string; v: VitalValue } => x.v !== null)
    .sort((a, b) => a.at.localeCompare(b.at));
}

const day = (iso: string) => iso.slice(0, 10);
const lastOfDay = (pts: Array<{ at: string; v: VitalValue }>, d: string): VitalValue | null => {
  const same = pts.filter((p) => day(p.at) === d);
  return same.length ? same[same.length - 1].v : null;
};

function threshold(label: string, env: NodeJS.ProcessEnv): number {
  const key = normLabel(label);
  const fromEnv = parseFloat(env[`AGNOS_DEV_${key}`] ?? '');
  return Number.isFinite(fromEnv) ? fromEnv : (DEV_THRESHOLDS[key] ?? Number.POSITIVE_INFINITY);
}

function weeklyAvg(pts: Array<{ at: string; v: VitalValue }>, upToDay: string): VitalValue | null {
  const from = new Date(`${upToDay}T00:00:00.000Z`); from.setUTCDate(from.getUTCDate() - 6);
  const inWin = pts.filter((p) => day(p.at) >= from.toISOString().slice(0, 10) && day(p.at) <= upToDay);
  if (!inWin.length) return null;
  const avg = (sel: (v: VitalValue) => number | undefined) => {
    const nums = inWin.map((p) => sel(p.v)).filter((n): n is number => typeof n === 'number');
    return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : undefined;
  };
  const num = avg((v) => v.num); if (num === undefined) return null;
  const num2 = avg((v) => v.num2);
  return num2 === undefined ? { num } : { num, num2 };
}

export function compareVitals(entries: VitalEntry[], label: string, dayA: string, dayB: string,
  env: NodeJS.ProcessEnv = process.env): VitalsComparison | null {
  const pts = ofLabel(entries, label);
  if (!pts.length) return null;
  const valA = lastOfDay(pts, dayA); const valB = lastOfDay(pts, dayB);
  const delta = valA && valB
    ? { num: Math.round((valA.num - valB.num) * 10) / 10,
        ...(valA.num2 !== undefined && valB.num2 !== undefined ? { num2: Math.round((valA.num2 - valB.num2) * 10) / 10 } : {}) }
    : null;
  const avg = weeklyAvg(pts, dayA);
  const deviation = !!delta && (Math.abs(delta.num) > threshold(label, env) || (delta.num2 !== undefined && Math.abs(delta.num2) > threshold(label, env)));
  return { label, dayA, dayB, valA, valB, delta, unit: UNITS[normLabel(label)] ?? '', weeklyAvg: avg, deviation };
}

export function vitalsTrend(entries: VitalEntry[], label: string, today: string, giorni = 7): VitalsTrend | null {
  const pts = ofLabel(entries, label);
  if (!pts.length) return null;
  const from = new Date(`${today}T00:00:00.000Z`); from.setUTCDate(from.getUTCDate() - (giorni - 1));
  const fromDay = from.toISOString().slice(0, 10);
  const byDay = new Map<string, number[]>();
  // Nota: usa solo la componente principale — sistolica per PA
  for (const p of pts) {
    const d = day(p.at);
    if (d >= fromDay && d <= today) {
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(p.v.num);
    }
  }
  const days: TrendDay[] = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, nums]) => ({ date, min: Math.min(...nums), max: Math.max(...nums),
      avg: Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 }));
  if (!days.length) return null;
  // Direzione: pendenza della regressione lineare sulle medie giornaliere (indice → avg).
  const n = days.length; const xs = days.map((_, i) => i); const ys = days.map((d) => d.avg);
  const mx = xs.reduce((a, b) => a + b, 0) / n; const my = ys.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1);
  const direction = slope > 0.5 ? 'salita' : slope < -0.5 ? 'calo' : 'stabile';
  return { label, days, direction, unit: UNITS[normLabel(label)] ?? '' };
}
