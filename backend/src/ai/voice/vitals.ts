// REQ-041: vital-sign recognition + validation for spoken commands. Deterministic and pure.
// The parser NEVER silently corrects an anomalous value: an out-of-range reading is kept exactly as
// transcribed and flagged as a warning so the operator sees and confirms it.

export interface VitalSpec {
  etichetta: string;          // canonical short label stored in the cartella
  label: string;              // Italian display name
  unita: string;              // canonical unit
  /** Plausible technical range for a single numeric value (systolic for PA). */
  min: number;
  max: number;
}

// Keyed by canonical etichetta. Synonyms map to these in matchVital().
export const VITAL_SPECS: Record<string, VitalSpec> = {
  PA: { etichetta: 'PA', label: 'Pressione arteriosa', unita: 'mmHg', min: 50, max: 300 },
  FC: { etichetta: 'FC', label: 'Frequenza cardiaca', unita: 'bpm', min: 20, max: 300 },
  TC: { etichetta: 'TC', label: 'Temperatura', unita: '°C', min: 30, max: 45 },
  SpO2: { etichetta: 'SpO2', label: 'Saturazione', unita: '%', min: 0, max: 100 },
  DTX: { etichetta: 'DTX', label: 'Glicemia', unita: 'mg/dL', min: 10, max: 1000 },
  Peso: { etichetta: 'Peso', label: 'Peso', unita: 'kg', min: 0.3, max: 400 },
  FR: { etichetta: 'FR', label: 'Frequenza respiratoria', unita: 'atti/min', min: 3, max: 80 },
};

const SYNONYMS: Array<{ re: RegExp; etichetta: string }> = [
  { re: /pressione|sistolic|diastolic|\bpa\b/, etichetta: 'PA' },
  { re: /frequenza cardiaca|battit|polso|\bfc\b/, etichetta: 'FC' },
  { re: /temperatura|febbre|\btc\b/, etichetta: 'TC' },
  { re: /saturazion|ossigen|spo2|\bsao2\b/, etichetta: 'SpO2' },
  { re: /glicemi|zucchero nel sangue|\bdtx\b/, etichetta: 'DTX' },
  { re: /\bpeso\b|chilogramm|chili\b/, etichetta: 'Peso' },
  { re: /frequenza respiratoria|atti respiratori|\bfr\b/, etichetta: 'FR' },
];

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Identify which vital a normalized transcript refers to (null if none recognised). */
export function matchVital(transcript: string): VitalSpec | null {
  const q = norm(transcript);
  for (const s of SYNONYMS) if (s.re.test(q)) return VITAL_SPECS[s.etichetta];
  return null;
}

export interface ParsedVitalValue {
  valore: string;                   // canonical string stored ("130/80", "37.4", "98")
  ambiguities: string[];            // blocking problems (no value, etc.)
  warnings: string[];               // non-blocking (out-of-range, kept as-is)
}

/** Extract and validate the numeric value(s) for a vital from the spoken text. */
export function parseVitalValue(spec: VitalSpec, transcript: string): ParsedVitalValue {
  const q = norm(transcript);
  const ambiguities: string[] = [];
  const warnings: string[] = [];

  if (spec.etichetta === 'PA') {
    // "130 su 80", "130/80", "130 e 80"
    const m = /(\d{2,3})\s*(?:\/|su|e|\\)\s*(\d{2,3})/.exec(q);
    if (!m) { ambiguities.push('Valore della pressione non chiaro (atteso sistolica/diastolica)'); return { valore: '', ambiguities, warnings }; }
    const sys = parseInt(m[1], 10), dia = parseInt(m[2], 10);
    if (sys < spec.min || sys > spec.max) warnings.push(`Sistolica ${sys} fuori dall'intervallo tecnico atteso (${spec.min}-${spec.max})`);
    if (dia < 20 || dia > 200) warnings.push(`Diastolica ${dia} fuori dall'intervallo tecnico atteso (20-200)`);
    return { valore: `${sys}/${dia}`, ambiguities, warnings };
  }

  // single decimal number; accept Italian comma decimals ("37,4")
  const m = /(\d{1,3}(?:[.,]\d{1,2})?)/.exec(q);
  if (!m) { ambiguities.push(`Valore di ${spec.label.toLowerCase()} non riconosciuto`); return { valore: '', ambiguities, warnings }; }
  const num = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(num)) { ambiguities.push('Valore numerico non valido'); return { valore: '', ambiguities, warnings }; }
  if (num < spec.min || num > spec.max) warnings.push(`Valore ${m[1].replace(',', '.')} fuori dall'intervallo tecnico atteso (${spec.min}-${spec.max} ${spec.unita})`);
  return { valore: String(num), ambiguities, warnings };
}

// Recognise an explicit time in the transcript. Missing time is a BLOCKING ambiguity per REQ-041
// ("Manca l'orario del parametro"): a vital must carry an explicit moment, never a silent "now".
const TIME_RE = /\b(alle|ore)\s+(\d{1,2})(?:[:.](\d{2}))?\b|\b(\d{1,2})[:.](\d{2})\b/;

export interface ParsedTime { has: boolean; hh?: number; mm?: number }

export function parseSpokenTime(transcript: string): ParsedTime {
  const q = norm(transcript);
  const m = TIME_RE.exec(q);
  if (!m) return { has: false };
  const hh = parseInt(m[2] ?? m[4] ?? '', 10);
  const mm = parseInt(m[3] ?? m[5] ?? '0', 10);
  if (!Number.isFinite(hh) || hh > 23 || mm > 59) return { has: false };
  return { has: true, hh, mm };
}
