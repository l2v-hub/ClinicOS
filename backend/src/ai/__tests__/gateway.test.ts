import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUserContext, assertTenant, isPatientAllowed, assertPatientAllowed, canCrossPatientSearch,
  checkServiceToken, defaultTenant,
} from '../gateway/context.js';
import { GatewayError } from '../gateway/types.js';
import { filterVitals, vitalNumericValue, matchAllergy, matchTherapy, textIncludes } from '../gateway/filters.js';
import { narrativeSource, vitalSource } from '../gateway/sources.js';

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

// ── context ──
test('parseUserContext: missing user id → unauthorized', () => {
  assert.throws(() => parseUserContext({}), (e) => e instanceof GatewayError && e.kind === 'unauthorized');
});

test('parseUserContext: header absent → operator scope (permitted=null); present → allow-list', () => {
  const a = parseUserContext({ 'X-AI-User-Id': 'u1' });
  assert.equal(a.permittedPatientIds, null);
  const b = parseUserContext({ 'X-AI-User-Id': 'u1', 'X-AI-Permitted-Patients': 'p1,p2' });
  assert.deepEqual(b.permittedPatientIds, ['p1', 'p2']);
});

test('assertTenant: a different tenant is rejected (isolation)', () => {
  const ctx = parseUserContext({ 'X-AI-User-Id': 'u1', 'X-AI-Tenant-Id': 'other-clinic' });
  assert.throws(() => assertTenant(ctx), (e) => e instanceof GatewayError && e.kind === 'tenant_isolation');
  const ok = parseUserContext({ 'X-AI-User-Id': 'u1', 'X-AI-Tenant-Id': defaultTenant() });
  assert.doesNotThrow(() => assertTenant(ok));
});

test('patient allow-list is enforced', () => {
  const scoped = parseUserContext({ 'X-AI-User-Id': 'u1', 'X-AI-Permitted-Patients': 'p1' });
  assert.equal(isPatientAllowed(scoped, 'p1'), true);
  assert.equal(isPatientAllowed(scoped, 'p2'), false);
  assert.throws(() => assertPatientAllowed(scoped, 'p2'), (e) => e instanceof GatewayError && e.kind === 'forbidden');
  const operator = parseUserContext({ 'X-AI-User-Id': 'u1' });
  assert.equal(isPatientAllowed(operator, 'anything'), true);
});

test('cross-patient search is off unless enabled AND privileged', () => {
  const mgr = parseUserContext({ 'X-AI-User-Id': 'u1', 'X-AI-Roles': 'manager' });
  assert.equal(canCrossPatientSearch(mgr, env({ AI_CROSS_PATIENT_SEARCH_ENABLED: 'false' })), false);
  assert.equal(canCrossPatientSearch(mgr, env({ AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' })), true);
  const op = parseUserContext({ 'X-AI-User-Id': 'u1', 'X-AI-Roles': 'operator' });
  assert.equal(canCrossPatientSearch(op, env({ AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' })), false);
});

test('service token: closed when unset; matches Bearer when set', () => {
  assert.equal(checkServiceToken('Bearer x', env({})), false);
  assert.equal(checkServiceToken('Bearer secret', env({ AI_RUNTIME_SERVICE_TOKEN: 'secret' })), true);
  assert.equal(checkServiceToken('Bearer wrong', env({ AI_RUNTIME_SERVICE_TOKEN: 'secret' })), false);
});

// ── deterministic filters ──
test('vitalNumericValue parses PA systolic/diastolic and plain numbers', () => {
  assert.deepEqual(vitalNumericValue('PA', '130/85'), { systolic: 130, diastolic: 85, value: 130 });
  assert.deepEqual(vitalNumericValue('FC', '78'), { value: 78 });
  assert.deepEqual(vitalNumericValue('TC', '36,5'), { value: 36.5 });
});

test('filterVitals: systolic > 150 selects only high blood-pressure readings', () => {
  const vitals = [
    { etichetta: 'PA', valore: '160/95', rilevato: '2026-03-09' },
    { etichetta: 'PA', valore: '130/80', rilevato: '2026-03-10' },
    { etichetta: 'FC', valore: '78', rilevato: '2026-03-09' },
  ];
  const high = filterVitals(vitals, { label: 'PA', systolicMin: 151 });
  assert.equal(high.length, 1);
  assert.equal(high[0].valore, '160/95');
});

test('filterVitals: date range', () => {
  const vitals = [
    { etichetta: 'FC', valore: '70', rilevato: '2026-03-01' },
    { etichetta: 'FC', valore: '90', rilevato: '2026-03-10' },
  ];
  assert.equal(filterVitals(vitals, { from: '2026-03-05', to: '2026-03-31' }).length, 1);
});

test('allergy/therapy matching is accent/case-insensitive', () => {
  assert.equal(textIncludes('Penicillina', 'penicillina'), true);
  const c = { allergie: [{ allergene: 'Penicillina' }], terapie: [{ descrizione: 'Warfarin anticoagulante' }] };
  assert.ok(matchAllergy(c, 'penicill'));
  assert.ok(matchTherapy(c, 'anticoagulante'));
  assert.equal(matchAllergy(c, 'lattice'), null);
});

// ── sources ──
test('every source builder carries patientId + recordId + label', () => {
  const n = narrativeSource('p1', 'ANAMNESIS', 'rec1', 'testo', '2026-03-09T00:00:00Z');
  assert.equal(n.sourceType, 'NARRATIVE_SECTION');
  assert.equal(n.patientId, 'p1'); assert.equal(n.recordId, 'rec1'); assert.equal(n.sectionKey, 'ANAMNESIS');
  const v = vitalSource('p1', 'rec2', 'PA', 'PA 160/95', '2026-03-09');
  assert.equal(v.sourceType, 'VITAL_SIGN'); assert.ok(v.label && v.recordId);
});
