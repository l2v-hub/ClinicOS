// Generates the Phase 3 machine-readable artifacts from the code of record:
//   .ai-architecture/phase-3-skills/SKILL_CATALOG.json   (backend/src/skills/catalog.ts)
//   .ai-architecture/phase-3-skills/ROLE_SKILL_MATRIX.json (catalog × baseline policy via decide())
// Usage (repo root): DATABASE_URL=postgresql://x@127.0.0.1:1/x npx tsx scripts/ai-architecture/build-skill-catalog.ts
// (the URL is never contacted: the registry module only requires it to be set.)

import { writeFileSync } from 'node:fs';
import { decide } from '../../backend/src/authz/decision.js';
import { baselinePolicy } from '../../backend/src/authz/policy-store.js';
import { SKILL_CATALOG } from '../../backend/src/skills/catalog.js';
import { CONFIRMATION_POLICY_VERSION } from '../../backend/src/skills/confirmation.js';

const DIR = '.ai-architecture/phase-3-skills';
const E2E = 'backend/src/skills/__tests__/skills-e2e.test.ts';
const LIVE = 'scripts/skills/agno-live-e2e.mjs (evidence/agno-live-e2e-run*.json)';

// Automated evidence per skill (test names in skills-e2e.test.ts; live = real Agno runtime).
const EVIDENCE: Record<string, string[]> = {
  'vitals.record': ['B + I', 'C', 'D', 'E', 'H', 'per-role coverage (doctor)', 'live Agno'],
  'diary.add_observation': ['F', 'per-role coverage (oss)', 'live Agno'],
  'handover.create': ['G', 'per-role coverage (oss)', 'live Agno'],
  'vitals.recent': ['A', 'per-role coverage (oss)', 'live Agno'],
  'diary.recent': ['per-role coverage (nurse)'],
  'patient.overview': ['A', 'per-role coverage (doctor)'],
  'clinical.question': ['per-role coverage (nurse)'],
  'therapy.due_administrations': ['D (OSS denied)', 'per-role coverage (nurse)', 'live Agno'],
  'handover.overview': ['per-role coverage (oss)'],
  'appointments.day': ['per-role coverage (doctor)'],
  'facility.occupancy': ['per-role coverage (supervisor, administrator)'],
  'drug.lookup': ['per-role coverage (administrator)'],
  'patient.find': ['per-role coverage (nurse)'],
  'admin.roster_contexts': ['per-role coverage (administrator)'],
  'therapy.prescribe': ['D (hand-off, human_control_required)'],
  'administration.record': [],
};

const ROLES = ['administrator', 'supervisor', 'doctor', 'nurse', 'oss'] as const;
const policy = baselinePolicy();

const skills = SKILL_CATALOG.map((skill) => {
  const evidence = EVIDENCE[skill.id] ?? [];
  const status = !skill.executable ? 'DESIGNED' : evidence.length ? 'TESTED' : 'EXECUTABLE';
  return {
    skill_id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    intended_roles: skill.intendedRoles,
    required_capabilities: skill.requiredTools,
    optional_capabilities: skill.optionalTools,
    input_context: [...skill.slots, ...(skill.optionalSlots ?? []).map((s) => `${s}?`)],
    output: skill.output,
    workflow_steps: skill.steps,
    kind: skill.kind,
    confirmation: skill.confirmation,
    ambiguity_handling: skill.ambiguity,
    failure_handling: skill.failure,
    audit: skill.audit,
    sensitivity: skill.sensitivity,
    customer_validation: skill.customerValidation ?? null,
    implementation_status: status,
    executable_by_assistant: skill.executable,
    test_status: evidence.length ? 'TESTED' : 'NOT_TESTED',
    test_evidence: evidence.map((name) => (name === 'live Agno' ? `${LIVE}` : `${E2E} › ${name}`)),
  };
});

const totals = skills.reduce<Record<string, number>>((acc, s) => {
  acc[s.implementation_status] = (acc[s.implementation_status] ?? 0) + 1;
  return acc;
}, {});

writeFileSync(
  `${DIR}/SKILL_CATALOG.json`,
  `${JSON.stringify(
    {
      schema: 'clinicos.ai-architecture.skill-catalog/v1',
      source_of_record: 'backend/src/skills/catalog.ts',
      confirmation_policy_version: CONFIRMATION_POLICY_VERSION,
      totals: { skills: skills.length, ...totals },
      skills,
    },
    null,
    2,
  )}\n`,
);

// Role → Skill: available iff EVERY required tool is allowed by decide() for the role (the same
// function the Tool Layer hook uses at runtime). Baseline only: the active policy decides live.
const matrix = ROLES.map((role) => {
  const rows = SKILL_CATALOG.map((skill) => {
    const decisions = [...skill.requiredTools, ...skill.optionalTools].map((tool) => ({
      tool,
      ...decide(policy, role, tool),
    }));
    const missingRequired = decisions
      .filter((d) => skill.requiredTools.includes(d.tool) && !d.allowed)
      .map((d) => d.tool);
    const missingOptional = decisions
      .filter((d) => skill.optionalTools.includes(d.tool) && !d.allowed)
      .map((d) => d.tool);
    const available = skill.executable && missingRequired.length === 0;
    return {
      skill_id: skill.id,
      available,
      state: !skill.executable
        ? 'HUMAN_ONLY'
        : !available
          ? 'UNAVAILABLE'
          : missingOptional.length
            ? 'PARTIAL'
            : 'AVAILABLE',
      intended: skill.intendedRoles.includes(role),
      missing_required: missingRequired,
      missing_optional: missingOptional,
      needs_customer_validation:
        Boolean(skill.customerValidation) || (available && !skill.intendedRoles.includes(role)),
    };
  });
  return { role, available: rows.filter((r) => r.available).map((r) => r.skill_id), skills: rows };
});

writeFileSync(
  `${DIR}/ROLE_SKILL_MATRIX.json`,
  `${JSON.stringify(
    {
      schema: 'clinicos.ai-architecture.role-skill-matrix/v1',
      version: 1,
      policy_basis:
        'baseline policy v0 (backend/src/authz/baseline.ts) via decide(); live availability = GET /skills',
      rule: 'skill available ⇔ executable ∧ every required tool allowed for the role by the active policy',
      roles: matrix,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify({
    totals: { skills: skills.length, ...totals },
    perRole: matrix.map((m) => [m.role, m.available.length]),
  }),
);
