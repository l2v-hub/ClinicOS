// Regenerates the Phase 8 catalog artefacts FROM THE CODE (profiles + skill catalog + baseline
// policy). The live result is per request on the ACTIVE policy — these files document the baseline.
//   .ai-architecture/phase-8-copilots/ROLE_EXPERIENCE_MATRIX.json
//   .ai-architecture/phase-8-copilots/ROLE_WORKFLOW_CATALOG.json
// Usage (repo root): DATABASE_URL=<any> npx tsx scripts/copilot/export-profiles.mts
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildBaselinePolicy } from '../../backend/src/authz/baseline.js';
import { decide } from '../../backend/src/authz/decision.js';
import { SKILL_CATALOG } from '../../backend/src/skills/catalog.js';
import { availabilityOf, type ToolDecisions } from '../../backend/src/skills/availability.js';
import { loadProfiles } from '../../backend/src/copilot/profiles.js';
import { availableShortcuts, rankStarters } from '../../backend/src/copilot/home.js';

const dir = '.ai-architecture/phase-8-copilots';
const doc = buildBaselinePolicy();
const { profiles, issues } = loadProfiles();
const roles = ['oss', 'nurse', 'doctor', 'supervisor', 'administrator'];
const stamp = { generatedBy: 'scripts/copilot/export-profiles.mts', generatedAt: new Date().toISOString(), policy: 'baseline (live = ACTIVE policy per request)' };

const matrix: Record<string, unknown> = {};
const workflows: Record<string, unknown> = {};
for (const role of roles) {
  const decisions: ToolDecisions = new Map();
  for (const skill of SKILL_CATALOG)
    for (const tool of [...skill.requiredTools, ...skill.optionalTools]) {
      const d = decide(doc, role, tool);
      decisions.set(tool, { allowed: d.allowed, requiresConfirmation: d.requiresConfirmation });
    }
  const available = new Set(SKILL_CATALOG.map((s) => availabilityOf(s, decisions)).filter((a) => a.available && a.skill.executable).map((a) => a.skill.id));
  const authz = { can: (cap: string) => decide(doc, role, cap) } as never;
  const profile = profiles.get(role)!;
  const shortcuts = availableShortcuts(profile, available, authz, false);
  const { starterOrder, shortcuts: configured, ...rest } = profile;
  // Same rule as the live home: a skill offered as a shortcut is not repeated among the starters.
  const forStarters = new Set([...available].filter((id) => !shortcuts.some((s) => s.skillId === id)));
  matrix[role] = {
    profile: { ...rest, starterOrder },
    skillsAvailable: [...available],
    startersNoResident: rankStarters(profile, forStarters, false, new Set(), new Set()).map((s) => s.label),
    startersWithResident: rankStarters(profile, forStarters, true, new Set(), new Set()).map((s) => s.label),
    shortcutsConfigured: configured.map((s) => s.id),
    shortcutsAvailable: shortcuts.map((s) => s.id),
  };
  workflows[role] = shortcuts.map((s) => ({
    id: s.id,
    kind: s.kind,
    label: s.label,
    voiceAndTextPhrases: s.phrases,
    reusesSkills: [s.skillId, s.intro?.skillId, ...(s.steps ?? []).map((x) => x.skillId)].filter(Boolean),
    screen: s.screen ?? null,
    confirmation: 'every write step = existing skill preview + «Conferma» (never bypassed)',
  }));
}
const version = createHash('sha256').update(JSON.stringify(matrix)).digest('hex').slice(0, 12);
writeFileSync(`${dir}/ROLE_EXPERIENCE_MATRIX.json`, `${JSON.stringify({ schema: 'clinicos.phase8.role-experience-matrix/v1', ...stamp, version, profileWarnings: issues.warnings, roles: matrix }, null, 2)}\n`);
writeFileSync(
  `${dir}/ROLE_WORKFLOW_CATALOG.json`,
  `${JSON.stringify(
    {
      schema: 'clinicos.phase8.role-workflow-catalog/v1',
      ...stamp,
      composites: {
        start_shift: ['load role profile', 'load scoped signals (Phase 7 inbox)', 'open the shift briefing (facts + optional AI)', 'pending activities + handovers as signals', 'suggest first actions (ranked starters)'],
        resident_round: ['list residents in scope (patients.list_page)', 'select resident (POST /skills/context, scope check)', 'role steps = existing skill starters (normal converse)', 'writes: preview + «Conferma»', 'next / close → resident context changes (pending sensitive workflow cancelled)'],
      },
      roles: workflows,
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify({ version, warnings: issues.warnings.length }));
