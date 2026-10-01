// Phase 8 — Role Experience Profiles: configuration of the SHARED Assistant per role.
//
//   Identity → Role → Policy → Resident Scope → Shared Assistant → Role Experience Profile
//   → Shared Skills → Shared Tools
//
// A profile only orders, words and groups things (starters, shortcuts, signal presentation,
// briefing focus, density). It cannot grant: every skill / shortcut / signal it names is filtered
// per request by the ACTIVE policy (skill availability, authz.can) and the Resident Access Scope.
// Source: role-profiles.json next to this file, or COPILOT_PROFILES_FILE (same schema).

import { readFileSync } from 'node:fs';
import defaultProfilesJson from './role-profiles.json' with { type: 'json' };
import { SKILL_CATALOG } from '../skills/catalog.js';
import { EVENT_CATALOG, type EventType } from '../proactive/catalog.js';

export type ShortcutKind =
  'skill' | 'resident_round' | 'start_shift' | 'briefing' | 'proactive_tab' | 'classic';

export interface Shortcut {
  id: string;
  kind: ShortcutKind;
  label: string;
  /** kind skill */
  skillId?: string;
  /** kind resident_round: optional general skill shown first, then per-resident steps */
  intro?: string;
  steps?: string[];
  /** kind proactive_tab */
  tab?: 'da-vedere' | 'cambiato' | 'briefing';
  /** kind classic */
  screen?: string;
  /** kind classic: shown only when this capability is allowed by the active policy */
  requiresCapability?: string;
  /** Text or voice phrases that start the shortcut (same path for both channels). */
  phrases?: string[];
}

export interface RoleProfile {
  roleId: string;
  label: string;
  primaryGoals: string[];
  commonWorkflows: string[];
  density: 'minimal' | 'operational' | 'clinical' | 'aggregated' | 'technical';
  landing: 'home';
  emphasis: string;
  confirmationUx: string;
  escalation: string;
  terminology: { resident: string; focus: string };
  /** One short line for the LLM skill router (≤ 200 chars). Never capabilities. */
  assistantHint: string;
  starterOrder: string[];
  /** true: the home suggests ONLY the profile's starters (others stay reachable by asking). */
  startersFromProfileOnly: boolean;
  shortcuts: Shortcut[];
  signals: {
    preferredEventTypes: EventType[];
    defaultTab: 'da-vedere' | 'cambiato' | 'briefing';
    maxVisible: number;
  };
  briefing: { focus: string; maxFacts: number };
  sections: Array<'shortcuts' | 'continue' | 'signals' | 'starters' | 'recent'>;
}

const DENSITIES = new Set(['minimal', 'operational', 'clinical', 'aggregated', 'technical']);
const KINDS = new Set<ShortcutKind>([
  'skill',
  'resident_round',
  'start_shift',
  'briefing',
  'proactive_tab',
  'classic',
]);
const SECTIONS = new Set(['shortcuts', 'continue', 'signals', 'starters', 'recent']);
const TABS = new Set(['da-vedere', 'cambiato', 'briefing']);
/** Keys that would look like authorization: refused in any profile (preference ≠ policy). */
const FORBIDDEN_KEYS = [
  'capabilities',
  'grants',
  'allow',
  'allowed',
  'permissions',
  'scope',
  'residentScope',
  'role',
  'roles',
];

const SKILL_IDS = new Set(SKILL_CATALOG.map((s) => s.id));
const EVENT_TYPES = new Set(EVENT_CATALOG.map((e) => e.type));

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const strList = (v: unknown, max = 30, len = 120) =>
  Array.isArray(v)
    ? v
        .map((x) => str(x, len))
        .filter(Boolean)
        .slice(0, max)
    : [];

/**
 * Profile texts that reach an LLM prompt (assistantHint, briefing.focus) must stay descriptive:
 * imperative override wording is refused (it would also trip provider jailbreak filters, Phase 7).
 */
const PROMPT_TRIGGERS = /\b(ignor\w*|istruzion\w*|permess\w*|regol\w*|rivel\w*|prompt|system)\b/i;
function promptText(roleId: string, field: string, value: unknown, issues: ProfileIssues): string {
  const text = str(value, 200);
  if (text && PROMPT_TRIGGERS.test(text)) {
    issues.warnings.push(`${roleId}: ${field} rifiutato (formulazione non ammessa nei prompt)`);
    return '';
  }
  return text;
}

export interface ProfileIssues {
  warnings: string[];
}

/** Validates one raw profile; unknown skills / events are dropped (logged), never trusted. */
export function normalizeProfile(roleId: string, raw: unknown, issues: ProfileIssues): RoleProfile {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  for (const key of FORBIDDEN_KEYS)
    if (key in o)
      issues.warnings.push(
        `${roleId}: chiave «${key}» ignorata (i profili non concedono permessi)`,
      );
  const skills = (list: unknown) =>
    strList(list).filter((id) => {
      if (SKILL_IDS.has(id)) return true;
      issues.warnings.push(`${roleId}: skill sconosciuta «${id}» ignorata`);
      return false;
    });
  const shortcuts: Shortcut[] = [];
  for (const s of Array.isArray(o.shortcuts) ? o.shortcuts.slice(0, 8) : []) {
    const r = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const kind = str(r.kind, 20) as ShortcutKind;
    const id = str(r.id, 40).replace(/[^a-z0-9_-]/gi, '');
    if (!id || !KINDS.has(kind)) {
      issues.warnings.push(`${roleId}: scorciatoia non valida ignorata`);
      continue;
    }
    const sc: Shortcut = {
      id,
      kind,
      label: str(r.label, 60) || id,
      phrases: strList(r.phrases, 8, 80).map((p) => p.toLowerCase()),
    };
    if (kind === 'skill') {
      sc.skillId = skills([r.skillId])[0];
      if (!sc.skillId) continue;
    }
    if (kind === 'resident_round') {
      sc.steps = skills(r.steps);
      sc.intro = r.intro ? skills([r.intro])[0] : undefined;
      if (!sc.steps.length) continue;
    }
    if (kind === 'proactive_tab')
      sc.tab = TABS.has(str(r.tab, 20)) ? (str(r.tab, 20) as Shortcut['tab']) : 'da-vedere';
    if (kind === 'classic') {
      sc.screen = str(r.screen, 40);
      sc.requiresCapability = str(r.requiresCapability, 80) || undefined;
      // A classic screen is shown only behind an explicit capability (never by default).
      if (!sc.screen || !sc.requiresCapability) {
        issues.warnings.push(`${roleId}: scorciatoia «${id}» senza requiresCapability ignorata`);
        continue;
      }
    }
    shortcuts.push(sc);
  }
  const sig = (o.signals && typeof o.signals === 'object' ? o.signals : {}) as Record<
    string,
    unknown
  >;
  const brief = (o.briefing && typeof o.briefing === 'object' ? o.briefing : {}) as Record<
    string,
    unknown
  >;
  const term = (o.terminology && typeof o.terminology === 'object' ? o.terminology : {}) as Record<
    string,
    unknown
  >;
  const density = str(o.density, 20);
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= lo && n <= hi ? n : d;
  };
  return {
    roleId,
    label: str(o.label, 60) || 'Assistente',
    primaryGoals: strList(o.primaryGoals, 8),
    commonWorkflows: strList(o.commonWorkflows, 8, 40),
    density: (DENSITIES.has(density) ? density : 'operational') as RoleProfile['density'],
    landing: 'home',
    emphasis: str(o.emphasis, 40),
    confirmationUx: str(o.confirmationUx, 40),
    escalation: str(o.escalation, 200),
    terminology: { resident: str(term.resident, 20) || 'ospite', focus: str(term.focus, 60) },
    assistantHint: promptText(roleId, 'assistantHint', o.assistantHint, issues),
    starterOrder: skills(o.starterOrder),
    startersFromProfileOnly: o.startersFromProfileOnly === true,
    shortcuts,
    signals: {
      preferredEventTypes: strList(sig.preferredEventTypes, 20, 40).filter((t): t is EventType =>
        EVENT_TYPES.has(t as EventType),
      ),
      defaultTab: TABS.has(str(sig.defaultTab, 20))
        ? (str(sig.defaultTab, 20) as RoleProfile['signals']['defaultTab'])
        : 'da-vedere',
      maxVisible: num(sig.maxVisible, 1, 50, 10),
    },
    briefing: {
      focus: promptText(roleId, 'briefing.focus', brief.focus, issues),
      maxFacts: num(brief.maxFacts, 1, 30, 30),
    },
    sections: strList(o.sections, 5, 20).filter((s): s is RoleProfile['sections'][number] =>
      SECTIONS.has(s),
    ),
  };
}

let cache: { file: string; profiles: Map<string, RoleProfile>; issues: ProfileIssues } | null =
  null;

export function loadProfiles(env: NodeJS.ProcessEnv = process.env) {
  const file = (env.COPILOT_PROFILES_FILE || '').trim() || 'builtin';
  if (cache && cache.file === file) return cache;
  const issues: ProfileIssues = { warnings: [] };
  let raw: Record<string, unknown> =
    (defaultProfilesJson as { profiles?: Record<string, unknown> }).profiles ?? {};
  if (file !== 'builtin') {
    try {
      raw =
        (JSON.parse(readFileSync(file, 'utf8')) as { profiles?: Record<string, unknown> })
          .profiles ?? {};
    } catch (error) {
      issues.warnings.push(
        `COPILOT_PROFILES_FILE non leggibile (${error instanceof Error ? error.name : 'errore'}): profili predefiniti`,
      );
    }
  }
  const profiles = new Map<string, RoleProfile>();
  for (const [roleId, value] of Object.entries(raw))
    profiles.set(roleId, normalizeProfile(roleId, value, issues));
  if (!profiles.has('default')) profiles.set('default', normalizeProfile('default', {}, issues));
  for (const w of issues.warnings) console.warn(`[copilot] ${w}`);
  cache = { file, profiles, issues };
  return cache;
}

/** Test / ops hook: reload the profile file on the next call. */
export function resetProfileCache(): void {
  cache = null;
}

/** Profile of a policy role (falls back to «default»: never to another role's profile). */
export function profileFor(roleId: string, env: NodeJS.ProcessEnv = process.env): RoleProfile {
  const { profiles } = loadProfiles(env);
  return profiles.get(roleId) ?? { ...profiles.get('default')!, roleId };
}
