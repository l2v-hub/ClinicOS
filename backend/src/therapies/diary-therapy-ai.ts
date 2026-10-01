// Diario → Terapia, second stage (rule approved 2026-09-29): the deterministic interpreter runs
// first; ONLY when it leaves the drug, the dose or the times empty, the AI runtime proposes the
// missing fields (text-only extraction, JSON Schema, same path as the document pipeline).
//
// Guard rails: fill only EMPTY fields (never overwrite what the rules read), validate every value,
// keep the row `da_verificare`, say which fields came from the AI and why (typo corrections,
// doubts). AI unavailable or slow → deterministic preview + warning, never an error.
// PRIVACY: the diary text travels only in the runtime request body; it is never logged.

import { UNTRUSTED_RULE, fenceUntrusted } from '../ai/untrusted-prompt.js';
import { createHash, randomUUID } from 'node:crypto';
import type { DiaryTherapyParseResult } from './diary-therapy-parse.js';
import { NON_PRESCRIPTION_INTENTS, scheduleFasciaConflicts } from './diary-therapy-parse.js';

export interface AiTherapyProposal {
  farmacoNome: string;
  dosaggio: string;
  viaSomministrazione: string;
  forma: string;
  orari: string[];
  quantita: string;
  dataInizio: string;
  /** Typo corrections made on the drug name, e.g. "techipirina → TACHIPIRINA". */
  correzioni: string[];
  /** Anything the model was not sure about. */
  dubbi: string[];
}

export type DiaryTherapyAiProposer = (
  text: string,
  entryDate: string,
) => Promise<AiTherapyProposal | null>;

export type DiaryTherapyAiField =
  | 'farmacoNome'
  | 'dosaggio'
  | 'viaSomministrazione'
  | 'forma'
  | 'orari'
  | 'quantita'
  | 'dataInizio';

export type DiaryTherapyPreviewResult = DiaryTherapyParseResult & {
  source: 'deterministic' | 'deterministic+ai';
  /** Fields filled by the AI proposal (to be verified by the operator). */
  aiFields?: DiaryTherapyAiField[];
  /** Typo corrections and doubts reported by the AI, shown verbatim to the operator. */
  aiNotes?: string[];
};

/** Does the deterministic result leave something essential empty for a prescription? */
export function needsAiFallback(parsed: DiaryTherapyParseResult): boolean {
  if (NON_PRESCRIPTION_INTENTS.has(parsed.intent)) return false;
  const r = parsed.row;
  return (
    !r.farmacoNome.trim() ||
    !r.dosaggio.trim() ||
    (parsed.intent !== 'al_bisogno' && r.orari.length === 0)
  );
}

const ROUTES = new Set([
  'OS',
  'IM',
  'EV',
  'SC',
  'SL',
  'TD',
  'INAL',
  'TOP',
  'RETT',
  'OFT',
  'NAS',
  'AUR',
  'VAG',
]);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** "8", "8.00", "08:00", "24:00" → "HH:MM"; anything else → null. */
export function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^\s*(\d{1,2})(?:[:.](\d{2}))?\s*$/.exec(value);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2] ?? '0');
  if (hh === 24 && mm === 0) hh = 0;
  if (hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Validates a raw model answer into a proposal; invalid fields become empty. */
export function parseAiProposal(raw: unknown): AiTherapyProposal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const orari = Array.isArray(o.orari)
    ? [...new Set(o.orari.map(normalizeTime).filter((t): t is string => Boolean(t)))].sort()
    : [];
  const via = clean(o.viaSomministrazione, 10).toUpperCase();
  const dataInizio = clean(o.dataInizio, 10);
  const list = (v: unknown) =>
    Array.isArray(v)
      ? v
          .map((x) => clean(x, 200))
          .filter(Boolean)
          .slice(0, 5)
      : [];
  return {
    farmacoNome: clean(o.farmacoNome, 80).toUpperCase(),
    dosaggio: clean(o.dosaggio, 40),
    viaSomministrazione: ROUTES.has(via) ? via : '',
    forma: clean(o.forma, 40),
    orari: orari.slice(0, 8),
    quantita: clean(o.quantita, 40),
    dataInizio: ISO_DAY.test(dataInizio) ? dataInizio : '',
    correzioni: list(o.correzioni),
    dubbi: list(o.dubbi),
  };
}

/** Fills ONLY the empty fields of the deterministic result with the (validated) AI proposal. */
export function mergeAiProposal(
  parsed: DiaryTherapyParseResult,
  proposal: AiTherapyProposal,
): DiaryTherapyPreviewResult {
  const row = { ...parsed.row };
  const aiFields: DiaryTherapyAiField[] = [];
  const fill = (field: Exclude<DiaryTherapyAiField, 'orari'>, value: string) => {
    if (!row[field].trim() && value) {
      row[field] = value;
      aiFields.push(field);
    }
  };
  fill('farmacoNome', proposal.farmacoNome);
  fill('dosaggio', proposal.dosaggio);
  fill('viaSomministrazione', proposal.viaSomministrazione);
  fill('forma', proposal.forma);
  fill('quantita', proposal.quantita);
  fill('dataInizio', proposal.dataInizio);
  if (row.orari.length === 0 && proposal.orari.length && parsed.intent !== 'al_bisogno') {
    row.orari = proposal.orari;
    aiFields.push('orari');
  }
  if (aiFields.length === 0) {
    return {
      ...parsed,
      source: 'deterministic',
      aiNotes: [...proposal.correzioni, ...proposal.dubbi],
    };
  }
  row.stato = 'da_verificare';
  return {
    ...parsed,
    row,
    fasciaConflicts: scheduleFasciaConflicts(row.orari),
    warnings: [...parsed.warnings.filter((w) => w !== 'testo_non_classificato'), 'proposta_ai'],
    source: 'deterministic+ai',
    aiFields,
    aiNotes: [...proposal.correzioni, ...proposal.dubbi],
  };
}

// ── Runtime proposer (production) ─────────────────────────────────────────────────────────────

const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'farmacoNome',
    'dosaggio',
    'viaSomministrazione',
    'forma',
    'orari',
    'quantita',
    'dataInizio',
    'correzioni',
    'dubbi',
  ],
  properties: {
    farmacoNome: {
      type: 'string',
      description: 'Nome del farmaco (commerciale o principio attivo), in maiuscolo; "" se assente',
    },
    dosaggio: { type: 'string', description: 'Dosaggio con unità, es. "1000 mg"; "" se assente' },
    viaSomministrazione: {
      type: 'string',
      description:
        'Codice via: OS, IM, EV, SC, SL, TD, INAL, TOP, RETT, OFT, NAS; "" se non scritta',
    },
    forma: {
      type: 'string',
      description: 'Forma farmaceutica se scritta (compresse, sciroppo...); "" altrimenti',
    },
    orari: { type: 'array', items: { type: 'string' }, description: 'Orari HH:MM nelle 24 ore' },
    quantita: {
      type: 'string',
      description: 'Quantità per somministrazione se scritta (es. "1 cp"); "" altrimenti',
    },
    dataInizio: { type: 'string', description: 'YYYY-MM-DD solo se scritta; "" altrimenti' },
    correzioni: {
      type: 'array',
      items: { type: 'string' },
      description: 'Refusi corretti, es. "techipirina → TACHIPIRINA"',
    },
    dubbi: {
      type: 'array',
      items: { type: 'string' },
      description: 'Punti incerti da far verificare',
    },
  },
};

export function diaryTherapyAiPrompt(text: string, entryDate: string): string {
  return [
    'Sei un assistente di una struttura sanitaria. Dal testo di una voce di diario estrai UNA sola prescrizione di terapia e rispondi in JSON secondo lo schema.',
    'Regole:',
    '- Non inventare: se un dato non è scritto lascia "" (o [] per gli orari).',
    '- Puoi correggere solo refusi evidenti del nome del farmaco (es. "techipirina" → "TACHIPIRINA") e devi dichiararlo in "correzioni".',
    '- "ogni N ore dalle HH" → calcola gli orari nelle 24 ore partendo da HH (es. ogni 8 ore dalle 8 → 08:00, 16:00, 00:00).',
    '- Orari nel formato HH:MM. Dosaggio con unità separata da spazio (es. "1000 mg").',
    '- Non dedurre la via se non è scritta.',
    `Data della voce di diario: ${entryDate}.`,
    UNTRUSTED_RULE,
    'Testo della voce di diario:',
    fenceUntrusted('diario', text),
  ].join('\n');
}

export function diaryTherapyAiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if ((env.DIARY_THERAPY_AI || '').trim().toLowerCase() === 'off') return false;
  return Boolean(env.AI_RUNTIME_URL && env.AI_RUNTIME_SERVICE_TOKEN);
}

const AI_TIMEOUT_MS = 45_000;

/** Text-only extraction unit on the AI runtime (same contract as the document pipeline). */
export const runtimeDiaryTherapyProposer: DiaryTherapyAiProposer = async (text, entryDate) => {
  const { executeRuntimeUnit } = await import('../ai/upload/pages/runtime.js');
  const prompt = diaryTherapyAiPrompt(text, entryDate);
  const work = executeRuntimeUnit(
    {
      externalId: `diary-therapy-${randomUUID()}`,
      inputHash: createHash('sha256').update(prompt).digest('hex'),
      mode: 'extraction',
      files: [],
      schema: PROPOSAL_SCHEMA,
      prompt,
      runtimeJobId: null,
      runtimeAttempt: 0,
    },
    async () => {},
    async () => {},
    700,
  );
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS));
  const result = await Promise.race([work, timeout]);
  work.catch(() => {}); // a late failure after the timeout must not become unhandled
  return result ? parseAiProposal(result.data) : null;
};
