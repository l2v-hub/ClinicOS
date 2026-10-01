// Phase 8 — Role Home: the shared Assistant's landing state for one identity, composed from
// what already exists. Nothing here authorizes: skills come from skillAvailability (active
// policy), residents from describeResident (Resident Access Scope), signals from the Phase 7
// engine (its own policy + scope filter), classic screens from authz.can(). The role profile only
// orders and presents.

import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../ai/audit-store.js';
import type { AuthzContext } from '../authz/request-context.js';
import { describeResident } from '../access-scope/resident-access-scope.js';
import { SKILL_CATALOG, skillById } from '../skills/catalog.js';
import type { SkillAvailability } from '../skills/availability.js';
import type { WorkflowState } from '../skills/types.js';
import { buildInbox, type ProactiveDeps } from '../proactive/engine.js';
import { profileFor, type RoleProfile, type Shortcut } from './profiles.js';

const lastHomeAudit = new Map<string, number>();

export interface HomeWho {
  operator: { id: string; role: string };
  roleId: string;
  roleLabel: string;
  authz: AuthzContext;
}

export interface HomeDeps {
  availability: (who: HomeWho) => Promise<SkillAvailability[]>;
  listWorkflows?: (operatorId: string) => WorkflowState[];
  proactive: ProactiveDeps;
  env?: NodeJS.ProcessEnv;
}

export interface RankedStarter {
  skillId: string;
  label: string;
  reasons: string[];
}

export interface HomeShortcut {
  id: string;
  kind: Shortcut['kind'];
  label: string;
  phrases: string[];
  skillId?: string;
  starter?: string;
  intro?: { skillId: string; label: string };
  steps?: { skillId: string; label: string; needsResident: boolean }[];
  tab?: string;
  screen?: string;
}

const STARTER_LIMIT: Record<RoleProfile['density'], number> = {
  minimal: 4,
  operational: 6,
  clinical: 8,
  aggregated: 6,
  technical: 4,
};

function starterLabel(skillId: string, hasResident: boolean): string | null {
  const s = skillById(skillId);
  if (!s?.starters) return null;
  return hasResident
    ? (s.starters.withResident ?? s.starters.general ?? null)
    : (s.starters.general ?? s.starters.withResident ?? null);
}

/** Deterministic ranking over AUTHORIZED skills only (§17): profile → resident → signals → recent. */
export function rankStarters(
  profile: RoleProfile,
  available: ReadonlySet<string>,
  hasResident: boolean,
  signalSkills: ReadonlySet<string>,
  recentSkills: ReadonlySet<string>,
): RankedStarter[] {
  const out: (RankedStarter & { score: number; order: number })[] = [];
  SKILL_CATALOG.forEach((skill, order) => {
    if (!skill.executable || !available.has(skill.id) || !skill.starters) return;
    const needsResident = skill.slots.includes('patient');
    // Without a resident, a resident-only starter would just ask «per quale ospite?»: keep only
    // those with a general wording.
    const label = hasResident ? starterLabel(skill.id, true) : skill.starters.general;
    if (!label) return;
    const reasons: string[] = [];
    let score = 0;
    const idx = profile.starterOrder.indexOf(skill.id);
    if (idx < 0 && profile.startersFromProfileOnly) return;
    if (idx >= 0) {
      score += 100 - idx * 5;
      reasons.push('profilo del ruolo');
    }
    if (hasResident && needsResident) {
      score += 30;
      reasons.push('ospite attivo');
    }
    if (signalSkills.has(skill.id)) {
      score += 20;
      reasons.push('segnalato per te');
    }
    if (recentSkills.has(skill.id)) {
      score += 10;
      reasons.push('usato di recente');
    }
    out.push({ skillId: skill.id, label, reasons, score, order });
  });
  return out
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, STARTER_LIMIT[profile.density])
    .map(({ skillId, label, reasons }) => ({ skillId, label, reasons }));
}

function allowed(authz: AuthzContext, capability: string): boolean {
  try {
    return authz.can(capability).allowed;
  } catch {
    return false; // fail closed
  }
}

/** Shortcuts whose skills / screens are authorized NOW (a revoked capability hides them). */
export function availableShortcuts(
  profile: RoleProfile,
  available: ReadonlySet<string>,
  authz: AuthzContext,
  hasResident: boolean,
): HomeShortcut[] {
  const out: HomeShortcut[] = [];
  for (const s of profile.shortcuts) {
    const base = { id: s.id, kind: s.kind, label: s.label, phrases: s.phrases ?? [] };
    if (s.kind === 'skill') {
      if (!s.skillId || !available.has(s.skillId)) continue;
      const starter = starterLabel(s.skillId, hasResident);
      if (!starter) continue;
      out.push({ ...base, skillId: s.skillId, starter });
    } else if (s.kind === 'resident_round') {
      if (!allowed(authz, 'patients.list_page')) continue;
      const steps = (s.steps ?? [])
        .filter((id) => available.has(id))
        .map((id) => ({
          skillId: id,
          label: starterLabel(id, true) ?? skillById(id)!.name,
          needsResident: skillById(id)!.slots.includes('patient'),
        }));
      if (!steps.some((st) => st.needsResident)) continue;
      const intro =
        s.intro && available.has(s.intro)
          ? { skillId: s.intro, label: starterLabel(s.intro, false) ?? skillById(s.intro)!.name }
          : undefined;
      out.push({ ...base, steps, ...(intro ? { intro } : {}) });
    } else if (s.kind === 'classic') {
      if (s.requiresCapability && !allowed(authz, s.requiresCapability)) continue;
      out.push({ ...base, screen: s.screen });
    } else if (s.kind === 'proactive_tab') {
      out.push({ ...base, tab: s.tab });
    } else {
      out.push(base); // start_shift / briefing: Phase 7 engine, already role-filtered
    }
  }
  return out;
}

export interface RoleHome {
  role: { id: string; label: string; copilot: string };
  profile: Pick<
    RoleProfile,
    | 'density'
    | 'terminology'
    | 'primaryGoals'
    | 'escalation'
    | 'confirmationUx'
    | 'sections'
    | 'signals'
  > & {
    briefingFocus: string;
  };
  resident: { id: string; label: string } | null;
  starters: RankedStarter[];
  shortcuts: HomeShortcut[];
  continueWork: {
    workflowId: string;
    skillId: string;
    skillName: string;
    action: string | null;
    residentId: string | null;
    residentLabel: string | null;
    updatedAt: string;
  }[];
  recent: { skillId: string; skillName: string; at: string; residentLabel: string | null }[];
  context: {
    skillsAvailable: number;
    skillsTotal: number;
    shortcutsAvailable: number;
    shortcutsConfigured: number;
  };
}

export async function buildRoleHome(
  who: HomeWho,
  deps: HomeDeps,
  residentId: string | null,
): Promise<RoleHome> {
  const env = deps.env ?? process.env;
  const profile = profileFor(who.roleId, env);
  const now = deps.proactive.now?.() ?? new Date();
  const [availability, resident, inbox, recentRows] = await Promise.all([
    deps.availability(who),
    residentId ? describeResident(who.operator, residentId) : Promise.resolve(null),
    buildInbox({ operator: who.operator, roleId: who.roleId, authz: who.authz }, deps.proactive, {
      audit: false,
    }),
    prisma.aiAuditEvent.findMany({
      where: {
        operatorId: who.operator.id,
        actionType: { startsWith: 'skill:', endsWith: ':execute' },
        outcome: 'ok',
        createdAt: { gte: new Date(now.getTime() - 12 * 3_600_000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { actionType: true, createdAt: true, patientId: true },
    }),
  ]);
  const available = new Set(
    availability.filter((a) => a.available && a.skill.executable).map((a) => a.skill.id),
  );

  const signalSkills = new Set(
    inbox.signals
      .filter((s) => s.status !== 'preso_visione' && s.action?.kind === 'skill')
      .slice(0, 10)
      .map((s) => (s.action as { skillId: string }).skillId),
  );

  // Recent own executions — residents re-checked against the CURRENT scope.
  const recent: RoleHome['recent'] = [];
  const seen = new Set<string>();
  for (const row of recentRows) {
    const skillId = row.actionType.split(':')[1] ?? '';
    const skill = skillById(skillId);
    if (!skill || seen.has(skillId) || !available.has(skillId)) continue;
    seen.add(skillId);
    const r = row.patientId ? await describeResident(who.operator, row.patientId) : null;
    recent.push({
      skillId,
      skillName: skill.name,
      at: row.createdAt.toISOString(),
      residentLabel: r?.label ?? null,
    });
    if (recent.length >= 5) break;
  }

  // «Continua da dove avevi lasciato»: own previews still valid for the CURRENT role and scope,
  // not older than COPILOT_RESUME_MAX_MIN (the store TTL also expires them).
  const maxMin = Number.parseInt(env.COPILOT_RESUME_MAX_MIN ?? '', 10);
  const maxAgeMs = (Number.isFinite(maxMin) && maxMin > 0 ? maxMin : 30) * 60_000;
  const continueWork: RoleHome['continueWork'] = [];
  for (const w of deps.listWorkflows?.(who.operator.id) ?? []) {
    if (w.status !== 'NEEDS_CONFIRMATION' || !w.preview || !available.has(w.skillId)) continue;
    if (now.getTime() - Date.parse(w.updatedAt) > maxAgeMs) continue;
    const r = w.slots.patient?.id ? await describeResident(who.operator, w.slots.patient.id) : null;
    if (w.slots.patient?.id && !r) continue; // resident no longer in scope
    continueWork.push({
      workflowId: w.id,
      skillId: w.skillId,
      skillName: skillById(w.skillId)?.name ?? w.skillId,
      action: w.preview.action ?? null,
      residentId: r?.id ?? null,
      residentLabel: r?.label ?? null,
      updatedAt: w.updatedAt,
    });
  }

  const shortcuts = availableShortcuts(profile, available, who.authz, Boolean(resident));
  // A skill already offered as a shortcut is not repeated among the starters.
  const shortcutSkills = new Set(shortcuts.map((s) => s.skillId).filter(Boolean));
  const starters = rankStarters(
    profile,
    new Set([...available].filter((id) => !shortcutSkills.has(id))),
    Boolean(resident),
    signalSkills,
    new Set(recent.map((r) => r.skillId)),
  );
  const home: RoleHome = {
    role: { id: who.roleId, label: who.roleLabel, copilot: profile.label },
    profile: {
      density: profile.density,
      terminology: profile.terminology,
      primaryGoals: profile.primaryGoals,
      escalation: profile.escalation,
      confirmationUx: profile.confirmationUx,
      sections: profile.sections,
      signals: profile.signals,
      briefingFocus: profile.briefing.focus,
    },
    resident,
    starters,
    shortcuts,
    continueWork: continueWork.slice(0, 5),
    recent,
    context: {
      skillsAvailable: available.size,
      skillsTotal: SKILL_CATALOG.length,
      shortcutsAvailable: shortcuts.length,
      shortcutsConfigured: profile.shortcuts.length,
    },
  };
  // Audit the home at most once per minute per operator and role (it is reloaded after every turn).
  const auditKey = `${who.operator.id}:${who.roleId}`;
  const last = lastHomeAudit.get(auditKey) ?? 0;
  if (now.getTime() - last >= 60_000 || now.getTime() < last) {
    lastHomeAudit.set(auditKey, now.getTime());
    if (lastHomeAudit.size > 5000) lastHomeAudit.delete(lastHomeAudit.keys().next().value!);
  recordAuditEvent({
    requestId: `copilot-${randomUUID()}`,
    operatorId: who.operator.id,
    operatorRole: who.roleId,
    patientId: resident?.id ?? null,
    actionType: 'copilot:home',
    kind: 'read',
    channel: 'ai_assistant',
    fields: [
      `profile:${profile.roleId}`,
      `starters:${starters.length}`,
      `shortcuts:${shortcuts.length}`,
      `continue:${home.continueWork.length}`,
    ],
    outcome: 'ok',
  });
  }
  return home;
}
