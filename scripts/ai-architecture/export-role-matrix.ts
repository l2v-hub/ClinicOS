// Exports .ai-architecture/phase-2-authorization/ROLE_CAPABILITY_MATRIX.json from the code baseline
// (backend/src/authz/baseline.ts) and the capability registry. Run from backend/:
//   npx tsx ../scripts/ai-architecture/export-role-matrix.ts
import { writeFileSync } from 'node:fs';
import { buildBaselinePolicy } from '../../backend/src/authz/baseline.js';
import { decide } from '../../backend/src/authz/decision.js';
import { allCapabilities, governedCapabilities } from '../../backend/src/authz/registry.js';

const policy = buildBaselinePolicy();
const roles = policy.roles.map((role) => role.id);
const matrix = governedCapabilities().map((cap) => ({
  capability_id: cap.id,
  name: cap.name,
  domain: cap.domain,
  type: cap.type,
  sensitivity: cap.sensitivity,
  legacy_admin_only: cap.legacyRoles.length > 0,
  effects: Object.fromEntries(roles.map((role) => [role, policy.grants[role][cap.id]])),
  doubtful: Object.fromEntries(
    roles
      .filter((role) => policy.review?.[`${role}:${cap.id}`])
      .map((role) => [role, policy.review![`${role}:${cap.id}`]]),
  ),
}));
const counts = Object.fromEntries(
  roles.map((role) => {
    const effects = governedCapabilities().map((cap) => policy.grants[role][cap.id]);
    const allowed = governedCapabilities().filter(
      (cap) => decide(policy, role, cap.id).allowed,
    ).length;
    return [
      role,
      {
        ALLOWED: effects.filter((e) => e === 'ALLOWED').length,
        READ_ONLY: effects.filter((e) => e === 'READ_ONLY').length,
        ALLOWED_WITH_CONFIRMATION: effects.filter((e) => e === 'ALLOWED_WITH_CONFIRMATION').length,
        DENIED: effects.filter((e) => e === 'DENIED').length,
        effectively_allowed: allowed,
      },
    ];
  }),
);
const out = {
  schema: 'clinicos.role-capability-matrix/v1',
  note: 'Baseline (policy version 0) for development/demo. Editable by Administrator; not a normative truth.',
  policy_version: 0,
  default_effect: policy.defaultEffect,
  roles: policy.roles,
  assignments: policy.assignments,
  counts,
  doubtful_total: Object.keys(policy.review ?? {}).length,
  governed_capabilities: matrix.length,
  derived_capabilities: allCapabilities()
    .filter((cap) => cap.governedBy)
    .map((cap) => ({ capability_id: cap.id, governed_by: cap.governedBy })),
  outside_role_policy: allCapabilities()
    .filter((cap) => cap.gate !== 'policy')
    .map((cap) => ({ capability_id: cap.id, gate: cap.gate })),
  matrix,
};
writeFileSync(
  '../.ai-architecture/phase-2-authorization/ROLE_CAPABILITY_MATRIX.json',
  JSON.stringify(out, null, 2) + '\n',
);
console.log(JSON.stringify(counts));
