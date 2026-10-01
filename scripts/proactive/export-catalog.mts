// Regenerates the Phase 7 catalog artefacts FROM THE CODE (single source of truth):
//   .ai-architecture/phase-7-proactive/EVENT_CATALOG.json
//   .ai-architecture/phase-7-proactive/SIGNAL_CATALOG.json
//   .ai-architecture/phase-7-proactive/ROLE_SIGNAL_MATRIX.json  (baseline policy; the live matrix
//     follows the ACTIVE policy edited in «Ruoli e permessi» — no code change needed)
// Usage (repo root): DATABASE_URL=<any> npx tsx scripts/proactive/export-catalog.mts [evidenceJson]
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildBaselinePolicy } from '../../backend/src/authz/baseline.js';
import { decide } from '../../backend/src/authz/decision.js';
import { CARE_FEED_CAPABILITY, EVENT_CATALOG, SIGNAL_TYPES } from '../../backend/src/proactive/catalog.js';
import { eligibility } from '../../backend/src/proactive/engine.js';

const dir = '.ai-architecture/phase-7-proactive';
const evidence = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : null;
const doc = buildBaselinePolicy();

const events = EVENT_CATALOG.map((d) => ({
  event_id: d.type,
  domain: d.domain,
  source: d.source,
  timestamp: d.type === 'administration.due' ? 'slot time (facility time)' : d.type === 'handover.open' || d.type === 'note.received' || d.type === 'workflow.pending' ? 'creation time of the still-open item' : 'createdAt / confirmedAt / appliedAt of the source row',
  resident_reference: d.audience === 'technical' ? 'none' : d.audience === 'personal' ? 'optional (disclosed only if in the reader scope)' : 'Patient id (Resident Access Scope applied in the query)',
  actor_origin: 'author operator id/name from the source row, or «Sistema» / «Piano terapeutico»',
  structured_payload: 'ids, enums, counts, short labels — never free clinical text (except an author title shown as data, never sent to the LLM)',
  sensitivity: d.sensitivity,
  audience: d.audience,
  required_capabilities: d.audience === 'care' ? [...new Set([...d.capabilities, CARE_FEED_CAPABILITY])] : d.capabilities,
  eligible_roles_baseline: ['oss', 'nurse', 'doctor', 'supervisor', 'administrator'].filter((role) =>
    eligibility({ can: (cap: string) => decide(doc, role, cap) } as never, {}).allowed.includes(d.type),
  ),
  scope_requirements:
    d.type === 'handover.open'
      ? 'existing consegne feed rule (creator / assignee; facility for supervisors)'
      : d.type === 'note.received'
        ? 'existing notes mailbox rule; resident shown only if in scope'
        : d.type === 'administration.due'
          ? 'therapySlotPatientAccess (same as GET /therapy-slots)'
          : d.audience === 'care'
            ? 'residentScopeWhere(operator) inside the SQL query'
            : 'none (no resident data)',
  potential_signals: [d.signal, ...(d.type === 'administration.due' ? ['OVERDUE_ACTIVITY'] : []), ...(d.type === 'administration.recorded' ? ['FOLLOW_UP'] : [])],
  priority_source: d.priority,
  proposed_skill: d.skillId,
  classic_screen: d.classicScreen ?? null,
  implementation_status: d.status,
  test_evidence: 'backend/src/proactive/__tests__/proactive-e2e.test.ts; scripts/proactive/proactive-browser-e2e.mjs',
}));

const signals = SIGNAL_TYPES.map((s) => ({
  ...s,
  from_events: EVENT_CATALOG.filter((d) => d.signal === s.type || (s.type === 'OVERDUE_ACTIVITY' && d.type === 'administration.due') || (s.type === 'FOLLOW_UP' && d.type === 'administration.recorded')).map((d) => d.type),
  clinical_alert: false,
}));

const roles = doc.roles.filter((r) => !r.legacy).map((r) => r.id);
const matrix = Object.fromEntries(
  roles.map((role) => {
    const e = eligibility({ can: (cap: string) => decide(doc, role, cap) } as never, {});
    return [role, { allowed: e.allowed, denied: Object.fromEntries(e.denied.map((d) => [d.type, d.missing])) }];
  }),
);
const version = createHash('sha256').update(JSON.stringify({ matrix, events: EVENT_CATALOG })).digest('hex').slice(0, 12);

const stamp = { generatedBy: 'scripts/proactive/export-catalog.mts', generatedAt: new Date().toISOString() };
writeFileSync(`${dir}/EVENT_CATALOG.json`, `${JSON.stringify({ schema: 'clinicos.phase7.event-catalog/v1', ...stamp, total: events.length, integrated: events.length, events }, null, 2)}\n`);
writeFileSync(`${dir}/SIGNAL_CATALOG.json`, `${JSON.stringify({ schema: 'clinicos.phase7.signal-catalog/v1', ...stamp, rule: 'Signals are deterministic projections of events; an AI summary is never a signal and never a clinical alert.', signals }, null, 2)}\n`);
writeFileSync(
  `${dir}/ROLE_SIGNAL_MATRIX.json`,
  `${JSON.stringify({ schema: 'clinicos.phase7.role-signal-matrix/v1', ...stamp, version, policy: 'baseline (version 0); live matrix = ACTIVE policy evaluated per request', configurable_by: ['«Ruoli e permessi» (capability grants)', 'PROACTIVE_DISABLED_EVENTS', 'PROACTIVE_* time thresholds'], careFeedCapability: CARE_FEED_CAPABILITY, roles: matrix, ...(evidence ? { evidence } : {}) }, null, 2)}\n`,
);
console.log(JSON.stringify({ version, events: events.length, signals: signals.length, roles: Object.keys(matrix) }));
