// Natural language → Interpretation (skill + slots).
//
// Primary: Agno (clinicos-ai-runtime `POST /v1/assistant/skill-route`, role 'agent'). The runtime
// receives ONLY the message and the skills the current identity may use (already filtered by the
// Phase 2 policy): it can never pick a skill the user is not allowed to use, and it never
// confirms anything. Its answer is validated here (skill in the list, known value keys, bounded
// strings). When the runtime is not configured, unavailable, slow or unsure, the deterministic
// interpreter below answers (same contract), and the response says which one did.
//
// PRIVACY: the message goes to the runtime only in the request body; it is never logged.

import { PARAMETER_KEYS } from '../patients/parameter-reading-input.js';
import { SKILL_CATALOG } from './catalog.js';
import { isExplicitCancellation } from './confirmation.js';
import type { Interpretation, SkillDefinition, SkillSlot } from './types.js';
import {
  classifyAiFailure,
  correlationHeaders,
  recordAiCall,
  recordFallback,
  aiMetaOf,
  runtimeErrorMeta,
} from '../lib/observability.js';
import { aiEnabled } from '../lib/ai-flags.js';

export interface InterpretInput {
  message: string;
  /** Skills available to the identity right now (Agno sees only these). */
  available: readonly SkillDefinition[];
  /**
   * Skills the identity may NOT use (id + name only, never tools): lets Agno recognise an
   * out-of-policy request so the workflow answers DENIED instead of routing to the nearest
   * allowed skill. The backend denies them anyway.
   */
  unavailable?: readonly SkillDefinition[];
  /** Workflow waiting for a slot: the message is read as the answer to that question. */
  pending: { skillId: string; slot: SkillSlot } | null;
  today: string;
  /** Phase 8: one short line from the role profile (tone / priorities). Never capabilities. */
  roleHint?: string;
}

export type Interpreter = (input: InterpretInput) => Promise<Interpretation>;

// ── Deterministic interpreter ──────────────────────────────────────────────────────────────

// Phase 6 (wrong-number defense): every number is delimited — «1200/80», «saturazione 1000»,
// «temperatura 375» are NOT shortened to 200/80, 100, 37: the value stays unextracted and the
// workflow asks for it (never a silently different, plausible clinical value).
const VALUE_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  // "120/80" or the spoken form "120 su 80" (voice transcripts); both become "120/80".
  [
    'pa',
    /(?:pressione(?:\s+arteriosa)?|\bpa\b)?\s*(?:di|a|è|:)?\s*(?<![\d.,/])(\d{2,3}\s*(?:\/|\bsu\b)\s*\d{2,3})(?!\d|[.,]\d|\s*\/\s*\d)/i,
  ],
  [
    'fr',
    /(?:frequenza\s+respiratoria|\bfr\b|atti\s+respiratori|respiri)\s*(?:di|a|:)?\s*(\d{1,2})(?!\d|[.,]\d)/i,
  ],
  ['spo2', /(?:spo2|sp02|saturazione|\bsat\b)\s*(?:di|a|al|:)?\s*(\d{2,3})(?!\d|[.,]\d)\s*%?/i],
  [
    'fc',
    /(?:frequenza(?:\s+cardiaca)?|\bfc\b|polso|battiti)\s*(?:di|a|:)?\s*(\d{2,3})(?!\d|[.,]\d)/i,
  ],
  [
    'temperatura',
    /(?:temperatura|\btemp\b|febbre|\btc\b)\s*(?:di|a|:)?\s*(\d{2}(?:[.,]\d{1,2})?)(?!\d|[.,]\d)/i,
  ],
  ['dtx', /(?:\bdtx\b|glicemia|stick glicemico)\s*(?:di|a|:)?\s*(\d{2,3})(?!\d|[.,]\d)/i],
  ['o2', /ossigeno\s*(?:terapia)?\s*:?\s*(s[iì]|no)\b/i],
  ['coscienza', /(?:coscienza|acvpu)\s*:?\s*([ACVPU])\b/],
];

const PA_PATTERN = new RegExp(VALUE_PATTERNS[0][1].source, 'gi');

/**
 * First acceptable blood-pressure pair. Without «pressione»/«PA» in the match: a bare «30/09» is a
 * date (first number < 70), and the spoken «95 su 100» is NOT a pressure (saturation, Barthel
 * «90 su 100» …) — «su» counts only next to «pressione»/«PA». A rejected pair never hides a later,
 * explicit one.
 */
function bloodPressureMatch(text: string): RegExpExecArray | null {
  PA_PATTERN.lastIndex = 0;
  for (let match = PA_PATTERN.exec(text); match; match = PA_PATTERN.exec(text)) {
    const named = /pressione|\bpa\b/i.test(match[0]);
    const spoken = /\bsu\b/i.test(match[1]);
    if (named || (!spoken && Number(match[1].split('/')[0]) >= 70)) return match;
  }
  return null;
}

export function extractValues(message: string): Record<string, string> {
  const values: Record<string, string> = {};
  // "frequenza respiratoria" must not be read as cardiac frequency: consume matches in order.
  let rest = message;
  for (const [key, pattern] of VALUE_PATTERNS) {
    const match = key === 'pa' ? bloodPressureMatch(rest) : pattern.exec(rest);
    if (!match) continue;
    // A bare "120/80" counts as blood pressure only through the 'pa' pattern.
    let value = match[1].replace(/\s*su\s*/i, '/').replace(/\s+/g, '');
    if (key === 'o2') value = /^s/i.test(value) ? 'si' : 'no';
    values[key] = value;
    rest =
      rest.slice(0, match.index) +
      ' '.repeat(match[0].length) +
      rest.slice(match.index + match[0].length);
  }
  return values;
}

const CURRENT_PATIENT =
  /\b(quest[oa] (ospite|paziente|residente|signor[ae]?)|l['’]ospite corrente|il paziente corrente|lui|lei)\b/i;

// "per Mario Rossi", "di Rossi", "alla signora Bianchi", "ospite Verdi".
const PATIENT_REF =
  /\b(?:per|di|a|al|alla|allo|del|della|dello|ospite|paziente|residente)\s+(?:(?:il|la|lo)\s+)?(?:(?:sig\.?(?:nor[ae])?|signor[ae]?|ospite|paziente)\s+)?((?:[A-ZÀ-Ý][\p{L}'’-]+)(?:\s+[A-ZÀ-Ý][\p{L}'’-]+){0,2})/u;

export function extractPatientQuery(message: string): string | undefined {
  const match = PATIENT_REF.exec(message);
  return match ? match[1].trim() : undefined;
}

function extractText(message: string): string | undefined {
  const quoted = /["“«](.+?)["”»]/s.exec(message);
  if (quoted) return quoted[1].trim();
  const afterColon = /:\s*(.{3,})$/s.exec(message);
  return afterColon ? afterColon[1].trim() : undefined;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function extractDate(message: string, today: string): string | undefined {
  const base = new Date(`${today}T12:00:00.000Z`);
  if (/\bdomani\b/i.test(message)) return isoDay(new Date(base.getTime() + 86_400_000));
  if (/\bieri\b/i.test(message)) return isoDay(new Date(base.getTime() - 86_400_000));
  if (/\boggi\b/i.test(message)) return today;
  const match = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?\b/.exec(message);
  if (!match) return undefined;
  const year = match[3] ?? today.slice(0, 4);
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

const PRESCRIPTION_LEAD =
  /^\s*(?:prepara(?:mi)?\s+(?:una\s+)?(?:nuova\s+)?prescrizione|prescriv\w*|nuova\s+terapia|imposta\s+(?:una\s+)?terapia)\s*(?::|di|con)?\s*/i;

/** Prescription text = the message without the lead verb and the resident reference. */
export function extractPrescriptionText(message: string): string | undefined {
  const quoted = extractText(message);
  if (quoted) return quoted;
  let text = message.replace(PRESCRIPTION_LEAD, '');
  const ref = PATIENT_REF.exec(text);
  if (ref) text = text.slice(0, ref.index) + text.slice(ref.index + ref[0].length);
  text = text.replace(CURRENT_PATIENT, '').replace(/\s+(?:per|a|al|alla)\s*$/i, '');
  text = text.replace(/\s{2,}/g, ' ').trim();
  return /[a-zà-ù]{3,}/i.test(text) ? text : undefined;
}

function extractQuery(message: string, skillId: string | null): string | undefined {
  if (skillId === 'drug.lookup') {
    const match =
      /\b(?:farmac[oi]|medicinal[ei])\s+(?:chiamat[oi]\s+)?([\p{L}\d-]{3,}(?:\s+[\p{L}\d-]+)?)/iu.exec(
        message,
      );
    return match?.[1];
  }
  if (skillId === 'patient.find') return extractPatientQuery(message);
  if (skillId === 'clinical.question') return message.trim();
  return undefined;
}

export const deterministicInterpreter: Interpreter = async ({ message, pending, today }) => {
  const text = message.trim();
  const base: Interpretation = { source: 'deterministic', skillId: null };
  if (isExplicitCancellation(text)) return { ...base, cancel: true };
  if (pending) {
    // The message answers the question the workflow asked.
    const answer: Interpretation = { ...base, skillId: pending.skillId };
    if (pending.slot === 'patient') {
      if (CURRENT_PATIENT.test(text)) answer.currentPatient = true;
      else answer.patientQuery = extractPatientQuery(text) ?? text;
    }
    if (pending.slot === 'values') answer.values = extractValues(text);
    if (pending.slot === 'text') answer.text = extractText(text) ?? text;
    if (pending.slot === 'query') answer.query = text;
    if (pending.slot === 'date') answer.date = extractDate(text, today);
    return answer;
  }
  // Full catalog on purpose: a skill the identity may NOT use is still recognised, so the
  // workflow can answer DENIED (backend decision) instead of pretending not to understand.
  const skill = SKILL_CATALOG.find((candidate) => candidate.keywords.some((re) => re.test(text)));
  const skillId = skill?.id ?? null;
  const values = extractValues(text);
  return {
    ...base,
    skillId,
    ...(CURRENT_PATIENT.test(text) ? { currentPatient: true } : {}),
    ...(extractPatientQuery(text) ? { patientQuery: extractPatientQuery(text) } : {}),
    ...(Object.keys(values).length ? { values } : {}),
    ...(skillId === 'therapy.prescribe'
      ? extractPrescriptionText(text)
        ? { text: extractPrescriptionText(text) }
        : {}
      : extractText(text)
        ? { text: extractText(text) }
        : {}),
    ...(extractDate(text, today) ? { date: extractDate(text, today) } : {}),
    ...(extractQuery(text, skillId) ? { query: extractQuery(text, skillId) } : {}),
  };
};

// ── Agno interpreter (clinicos-ai-runtime) ─────────────────────────────────────────────────

const MAX_TEXT = 4000;

function bounded(value: unknown, max = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

/** Validates the runtime answer: unknown skills/keys are dropped, never trusted. */
export function sanitizeAgnoRoute(
  raw: unknown,
  allowedSkillIds: ReadonlySet<string>,
): Interpretation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const skillId =
    typeof o.skillId === 'string' && allowedSkillIds.has(o.skillId) ? o.skillId : null;
  const values: Record<string, string> = {};
  if (o.values && typeof o.values === 'object' && !Array.isArray(o.values)) {
    for (const [key, value] of Object.entries(o.values as Record<string, unknown>)) {
      const text = bounded(typeof value === 'number' ? String(value) : value, 32);
      if (text && (PARAMETER_KEYS as readonly string[]).includes(key) && key !== 'note') {
        values[key] = text;
      }
    }
  }
  const date = bounded(o.date, 10);
  const interpretation: Interpretation = {
    source: 'agno',
    skillId,
    ...(bounded(o.patientQuery, 120) ? { patientQuery: bounded(o.patientQuery, 120) } : {}),
    ...(o.currentPatient === true ? { currentPatient: true } : {}),
    ...(Object.keys(values).length ? { values } : {}),
    ...(bounded(o.text, MAX_TEXT) ? { text: bounded(o.text, MAX_TEXT) } : {}),
    ...(date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date } : {}),
    ...(bounded(o.query, 200) ? { query: bounded(o.query, 200) } : {}),
  };
  const useful =
    interpretation.skillId ||
    interpretation.patientQuery ||
    interpretation.currentPatient ||
    interpretation.values ||
    interpretation.text ||
    interpretation.query ||
    interpretation.date;
  return useful ? interpretation : null;
}

export function agnoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!aiEnabled(env)) return false;
  const mode = (env.SKILLS_INTERPRETER || '').trim().toLowerCase();
  if (mode === 'deterministic') return false;
  return Boolean(env.AI_RUNTIME_URL && env.AI_RUNTIME_SERVICE_TOKEN);
}

// Phase 9 timeout budget: the skill router answers in ~1–3 s; 20 s caps a stuck runtime, after which
// the deterministic interpreter answers. Configurable (SKILLS_AGNO_TIMEOUT_MS, 1–60 s).
function agnoTimeoutMs(env: NodeJS.ProcessEnv): number {
  const configured = Number(env.SKILLS_AGNO_TIMEOUT_MS);
  return Number.isInteger(configured) && configured >= 1_000 && configured <= 60_000
    ? configured
    : 20_000;
}

export function createAgnoInterpreter(
  fallback: Interpreter = deterministicInterpreter,
  env: NodeJS.ProcessEnv = process.env,
): Interpreter {
  return async (input) => {
    // A pending question answered with a plain value does not need the LLM.
    if (!agnoEnabled(env)) return fallback(input);
    if (isExplicitCancellation(input.message)) return fallback(input);
    const allowed = new Set(
      [...input.available, ...(input.unavailable ?? [])].map((skill) => skill.id),
    );
    const started = Date.now();
    // Each call is recorded once: a throw after the outcome was recorded (e.g. in the fallback)
    // must not count a second, different outcome.
    let recorded = false;
    try {
      const body = JSON.stringify({
        message: input.message.slice(0, MAX_TEXT),
        today: input.today,
        pending: input.pending,
        skills: input.available.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          slots: [...skill.slots, ...(skill.optionalSlots ?? [])],
        })),
        forbiddenSkills: (input.unavailable ?? []).map((skill) => ({
          id: skill.id,
          name: skill.name,
        })),
        valueKeys: PARAMETER_KEYS.filter((key) => key !== 'note'),
        ...(input.roleHint ? { roleHint: input.roleHint.slice(0, 200) } : {}),
      });
      const response = await fetch(
        `${String(env.AI_RUNTIME_URL).replace(/\/$/, '')}/v1/assistant/skill-route`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.AI_RUNTIME_SERVICE_TOKEN}`,
            ...correlationHeaders(),
          },
          body,
          signal: AbortSignal.timeout(agnoTimeoutMs(env)),
        },
      );
      if (!response.ok) {
        recorded = true;
        recordAiCall(
          'skill_route',
          classifyAiFailure(null, response.status),
          Date.now() - started,
          body.length,
          await runtimeErrorMeta(response),
        );
        recordFallback('skill_interpreter', `http_${response.status}`);
        return fallback(input);
      }
      const payload = (await response.json()) as { route?: unknown; ai?: unknown } | null;
      const route = sanitizeAgnoRoute(payload?.route, allowed);
      // An object route with nothing usable is a valid «no match» answer, not malformed output.
      const wellFormed = Boolean(payload?.route) && typeof payload?.route === 'object';
      recorded = true;
      recordAiCall(
        'skill_route',
        wellFormed ? 'ok' : 'malformed',
        Date.now() - started,
        body.length,
        aiMetaOf(payload),
      );
      if (!route) {
        recordFallback('skill_interpreter', wellFormed ? 'no_route' : 'malformed');
        return fallback(input);
      }
      // Answering a pending question: keep the workflow's skill.
      if (input.pending) return { ...route, skillId: input.pending.skillId };
      if (!route.skillId) {
        // Agno found no AVAILABLE skill: the deterministic pass may still recognise a skill the
        // identity is not allowed to use, so the workflow can answer DENIED explicitly.
        const deterministic = await fallback(input);
        return deterministic.skillId ? deterministic : route;
      }
      return route;
    } catch (error) {
      if (!recorded) {
        const outcome = classifyAiFailure(error);
        recordAiCall('skill_route', outcome, Date.now() - started);
        recordFallback('skill_interpreter', outcome);
      }
      return fallback(input);
    }
  };
}
