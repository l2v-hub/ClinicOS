#!/usr/bin/env node
// Builds backend/src/authz/capability-registry.json from the catalog of record
// (.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json). The backend ships this compact
// runtime view (ids, routes, type, sensitivity, gate); `authz-registry-consistency.test.ts` fails if
// it drifts from the catalog. Usage (repo root): node scripts/ai-architecture/build-authz-registry.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG = '.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json';
const OUT = 'backend/src/authz/capability-registry.json';
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));

// Routes reachable without an operator identity (public reference data / infra) or with a service
// token (AI data gateway): the capability policy of end-user roles does not apply to them.
const PUBLIC = new Set([
  'infra.health',
  'identity.auth_status',
  'drugs.status',
  'drugs.search',
  'drugs.strengths',
  'drugs.document',
  'ai_extraction.status',
  'ai_extraction.capabilities',
  'ai_extraction.schema',
]);
// Always available to any authenticated identity (who am I / my own capabilities).
const IDENTITY = new Set(['identity.me']);

// Capabilities sharing another capability's route or acting as a channel-specific projection of a
// functional capability: they are governed by the functional one (single source of truth).
const DERIVED = {
  'agnos.action.read': 'assistant.query',
  'agnos.action.create_consegna': 'consegne.create',
  'agnos.action.create_appointment': 'appointments.create',
  'agnos.action.update_appointment': 'appointments.update',
  'agnos.action.update_narrative_section': 'narrative.save',
  'agnos.action.add_diary_note': 'diary.create',
  'agnos.action.create_vital_sign': 'parameters.create_reading',
  'agnos.action.update_patient_demographics': 'patients.update_demographics',
  'ai.read.get_patient_allergies': 'clinical_record.get',
  'ai.read.get_patient_therapies': 'therapy.list',
  'ai.read.get_patient_vital_signs': 'parameters.list_readings',
  'ai.read.get_patient_timeline': 'clinical_record.get',
  'ai.read.get_patient_appointments': 'appointments.list',
  'ai.read.search_clinical_sections': 'narrative.list',
  'ai.read.search_documents': 'documents.list',
  'ai.read.search_patients': 'patients.search',
  'ai.read.search_across_patients': 'patients.search',
  'ai.read.correlate_structured_data': 'clinical_record.get',
  'ai.read.query_appointments_today': 'appointments.list',
  'ai.read.query_staff_list': 'operators.directory_page',
  // query_data can read therapies/appointments/patients: governed by the most sensitive of them.
  'ai.read.query_data': 'therapy.list',
  'ai.read.get_facility_snapshot': 'rooms.occupancy',
  'ai.read.get_operator_queue': 'consegne.list',
  'import_pages.add_files': 'import_jobs.add_files',
  'import_pages.cancel': 'import_jobs.cancel',
  'import_pages.create_session': 'import_jobs.create',
  'import_pages.get': 'import_jobs.get',
  'import_pages.process': 'import_jobs.process',
  'import_pages.reopen': 'import_jobs.reopen',
  'import_pages.result': 'import_jobs.result',
  'import_pages.retry': 'import_jobs.retry',
  'import_pages.legacy_mutation_block': 'import_jobs.reorder',
};

function routesOf(entry) {
  const text = entry.entry_point ?? '';
  if (entry.capability_id === 'import_pages.legacy_mutation_block') return [];
  const found = [];
  const re = /\b(GET|POST|PUT|PATCH|DELETE) (\/[^\s,()]*)/g;
  let match;
  // Only the leading route list (before a "←" provenance note) describes the capability's own route.
  const head = text.split('←')[0];
  while ((match = re.exec(head))) found.push({ method: match[1], path: match[2] });
  // "PUT /x (…) and PATCH same path" → add the PATCH on the same path.
  const same = /\b(GET|POST|PUT|PATCH|DELETE) same path/.exec(head);
  if (same && found[0]) found.push({ method: same[1], path: found[0].path });
  return found;
}

const ids = new Set(catalog.capabilities.map((c) => c.capability_id));
const entries = [];
for (const c of catalog.capabilities) {
  const derivedFrom = DERIVED[c.capability_id];
  if (derivedFrom && !ids.has(derivedFrom)) {
    throw new Error(`${c.capability_id} derived from unknown capability ${derivedFrom}`);
  }
  const gate = PUBLIC.has(c.capability_id)
    ? 'public'
    : c.domain === 'internal_ai'
      ? 'service'
      : IDENTITY.has(c.capability_id)
        ? 'identity'
        : 'policy';
  entries.push({
    id: c.capability_id,
    name: c.name,
    domain: c.domain,
    type: c.type,
    sensitivity: c.sensitivity,
    exposure: c.exposure,
    technicalState: c.technical_state,
    legacyRoles: c.legacy_roles ?? [],
    gate,
    governedBy: derivedFrom ?? null,
    routes: derivedFrom ? [] : routesOf(c),
  });
}
writeFileSync(
  OUT,
  JSON.stringify(
    { schema: 'clinicos.authz-capability-registry/v1', source: CATALOG, capabilities: entries },
    null,
    2,
  ) + '\n',
);
const governed = entries.filter((e) => e.gate === 'policy' && !e.governedBy);
console.log(
  `registry: ${entries.length} capabilities, ${governed.length} policy-governed, ${entries.filter((e) => e.governedBy).length} derived, routes ${entries.reduce((n, e) => n + e.routes.length, 0)}`,
);
