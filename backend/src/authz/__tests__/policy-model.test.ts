// Unit tests of the Identity → Role → Capability model (no HTTP).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildBaselinePolicy, BASELINE_ROLES, SIMULATED_ASSIGNMENTS } from '../baseline.js';
import { decide, legacyRoleIdFor, resolveRoleId } from '../decision.js';
import { diffPolicies, parsePolicyDocument, PolicyValidationError } from '../policy-document.js';
import { allCapabilities, governedCapabilities, matchRoute } from '../registry.js';
import { issueSimulatorToken, verifySimulatorToken, simulatorEnabled } from '../simulator.js';
import { allToolDefinitions } from '../../tools/index.js';

const baseline = buildBaselinePolicy();

test('baseline is a valid, complete, deny-by-default document', () => {
  const parsed = parsePolicyDocument(structuredClone(baseline));
  assert.equal(parsed.defaultEffect, 'DENIED');
  assert.deepEqual(parsed.roles.map((r) => r.id).sort(), [
    'administrator',
    'doctor',
    'legacy_admin',
    'nurse',
    'operator',
    'oss',
    'supervisor',
  ]);
  for (const role of BASELINE_ROLES) {
    for (const cap of governedCapabilities()) {
      assert.ok(parsed.grants[role.id][cap.id], `${role.id} has an explicit effect for ${cap.id}`);
    }
  }
  assert.deepEqual(parsed.assignments, SIMULATED_ASSIGNMENTS);
  assert.ok(Object.keys(parsed.review ?? {}).length > 20, 'doubtful assignments are highlighted');
});

test('legacy roles reproduce today’s gates exactly (zero-regression migration)', () => {
  for (const cap of governedCapabilities()) {
    const adminOnly = cap.legacyRoles.length > 0;
    assert.equal(decide(baseline, 'operator', cap.id).allowed, !adminOnly, `operator ${cap.id}`);
    assert.equal(decide(baseline, 'legacy_admin', cap.id).allowed, true, `legacy_admin ${cap.id}`);
  }
  assert.equal(legacyRoleIdFor('manager'), 'legacy_admin');
  assert.equal(legacyRoleIdFor('ADMIN'), 'legacy_admin');
  assert.equal(legacyRoleIdFor('operatore'), 'operator');
  assert.equal(legacyRoleIdFor('operator'), 'operator');
});

test('prudent baseline: prescriptions, administrations and policy management are role-bound', () => {
  const allowed = (role: string, cap: string) => decide(baseline, role, cap);
  assert.equal(allowed('doctor', 'therapy.create').allowed, true);
  assert.equal(allowed('doctor', 'therapy.create').requiresConfirmation, true);
  assert.equal(allowed('nurse', 'therapy.create').allowed, false);
  assert.equal(allowed('oss', 'therapy.create').allowed, false);
  assert.equal(allowed('nurse', 'administration.confirm').allowed, true);
  assert.equal(allowed('oss', 'administration.confirm').allowed, false);
  assert.equal(allowed('administrator', 'authz.manage_policy').allowed, true);
  assert.equal(allowed('supervisor', 'authz.manage_policy').allowed, false);
  assert.equal(
    allowed('administrator', 'diary.create').allowed,
    false,
    'technical admin: no clinical writes',
  );
  assert.equal(allowed('supervisor', 'appointments.create').allowed, true);
  // READ_ONLY: reads pass, writes are denied with a dedicated code.
  assert.equal(allowed('nurse', 'narrative.list').allowed, true);
  const narrativeWrite = allowed('nurse', 'narrative.save');
  assert.equal(narrativeWrite.effect, 'READ_ONLY');
  assert.equal(narrativeWrite.allowed, false);
  assert.equal(narrativeWrite.code, 'read_only');
});

test('derived capabilities follow their functional capability (one rule for GUI, tools and AI)', () => {
  assert.equal(decide(baseline, 'oss', 'agnos.action.create_appointment').allowed, false);
  assert.equal(decide(baseline, 'nurse', 'agnos.action.create_consegna').allowed, true);
  assert.equal(decide(baseline, 'oss', 'ai.read.get_patient_therapies').allowed, false);
  assert.equal(decide(baseline, 'doctor', 'ai.read.get_patient_therapies').allowed, true);
  assert.equal(decide(baseline, 'oss', 'drugs.search').allowed, true, 'public reference data');
  // query_data can read therapies: governed by therapy.list, not by the generic assistant right.
  assert.equal(decide(baseline, 'oss', 'ai.read.query_data').allowed, false);
  assert.equal(decide(baseline, 'nurse', 'ai.read.query_data').allowed, true);
  assert.equal(decide(baseline, 'oss', 'no.such.capability').code, 'unknown_capability');
  assert.equal(decide(baseline, 'ghost', 'diary.list').code, 'unknown_role');
});

test('role resolution: assignment wins, otherwise the server-verified legacy role', () => {
  assert.deepEqual(resolveRoleId(baseline, 'SIM-DOCTOR-1', 'admin'), {
    roleId: 'doctor',
    source: 'assignment',
  });
  assert.deepEqual(resolveRoleId(baseline, 'SEED-OP-004', 'admin'), {
    roleId: 'legacy_admin',
    source: 'legacy',
  });
});

test('validation: unknown capability/effect, last policy manager, legacy fallback roles', () => {
  const bad = (mutate: (d: ReturnType<typeof buildBaselinePolicy>) => void) => {
    const doc = buildBaselinePolicy();
    mutate(doc);
    assert.throws(() => parsePolicyDocument(doc), PolicyValidationError);
  };
  bad((d) => (d.grants.nurse['nope.cap'] = 'ALLOWED'));
  bad((d) => (d.grants.nurse['diary.list'] = 'MAYBE' as never));
  bad((d) => (d.grants.nurse['agnos.action.create_consegna'] = 'ALLOWED'));
  bad((d) => {
    d.grants.administrator['authz.manage_policy'] = 'DENIED';
    d.grants.legacy_admin['authz.manage_policy'] = 'DENIED';
  });
  bad((d) => (d.roles = d.roles.filter((r) => r.id !== 'operator')));
  bad((d) => (d.assignments['SIM-OSS-1'] = 'ghost'));
  // A custom role is data, not code: the model is not limited to the initial roles.
  const doc = buildBaselinePolicy();
  doc.roles.push({
    id: 'physiotherapist',
    label: 'Fisioterapista',
    description: 'Riabilitazione',
    legacyRole: 'operatore',
    uiShell: 'operator',
  });
  doc.grants.physiotherapist = { 'assessments.create_draft': 'ALLOWED' };
  const parsed = parsePolicyDocument(doc);
  assert.equal(decide(parsed, 'physiotherapist', 'assessments.create_draft').allowed, true);
  assert.equal(
    decide(parsed, 'physiotherapist', 'therapy.create').allowed,
    false,
    'default DENIED',
  );
  const diff = diffPolicies(baseline, parsed);
  assert.deepEqual(diff.rolesAdded, ['physiotherapist']);
});

test('route matcher prefers literal segments and covers every catalogued route', () => {
  assert.equal(matchRoute('GET', '/patients/page')?.id, 'patients.list_page');
  assert.equal(matchRoute('GET', '/patients/abc123')?.id, 'patients.get');
  assert.equal(matchRoute('POST', '/patients/p1/therapies')?.id, 'therapy.create');
  assert.equal(matchRoute('POST', '/therapy-slots/confirm')?.id, 'administration.confirm');
  assert.equal(
    matchRoute('PATCH', '/patients/p1/narrative-sections/diagnosi')?.id,
    'narrative.save',
  );
  assert.equal(matchRoute('GET', '/not/catalogued'), undefined);
  // Express routes case-insensitively and serves HEAD with GET handlers: the gate must too.
  assert.equal(matchRoute('POST', '/PATIENTS/p1/Therapies')?.id, 'therapy.create');
  assert.equal(matchRoute('post', '/patients/p1/therapies/')?.id, 'therapy.create');
  assert.equal(matchRoute('POST', '//patients//p1/therapies')?.id, 'therapy.create');
  assert.equal(matchRoute('HEAD', '/therapy-slots')?.id, 'administration.list_slots');
  const routed = allCapabilities().filter((c) => c.routes.length > 0);
  assert.ok(routed.length >= 140);
});

test('every Tool Layer tool is governed by the policy (directly or through its functional capability)', () => {
  for (const tool of allToolDefinitions) {
    const decision = decide(baseline, 'legacy_admin', tool.name);
    assert.notEqual(decision.code, 'unknown_capability', tool.name);
  }
});

test('simulator tokens: signed, identity-only, tamper and expiry proof', () => {
  const { token } = issueSimulatorToken('SIM-NURSE-1', 1_000);
  assert.equal(verifySimulatorToken(token, 2_000), 'SIM-NURSE-1');
  const [prefixAndPayload, signature] = [
    token.slice(0, token.lastIndexOf('.')),
    token.slice(token.lastIndexOf('.') + 1),
  ];
  const payload = JSON.parse(Buffer.from(prefixAndPayload.slice(4), 'base64url').toString('utf8'));
  assert.equal(payload.role, undefined, 'the token carries no role');
  const forged = `sim.${Buffer.from(JSON.stringify({ ...payload, sub: 'SIM-ADMIN' })).toString('base64url')}.${signature}`;
  assert.equal(verifySimulatorToken(forged, 2_000), null);
  assert.equal(verifySimulatorToken(token, 1_000 + 13 * 3600 * 1000), null, 'expired');
  assert.throws(() => issueSimulatorToken('SIM-UNKNOWN'));
  assert.equal(
    simulatorEnabled('demo', { ROLE_SIMULATOR_ENABLED: 'true', NODE_ENV: 'development' }),
    true,
  );
  assert.equal(
    simulatorEnabled('entra', { ROLE_SIMULATOR_ENABLED: 'true', NODE_ENV: 'development' }),
    false,
  );
  assert.equal(
    simulatorEnabled('demo', { ROLE_SIMULATOR_ENABLED: 'true', NODE_ENV: 'production' }),
    false,
  );
  assert.equal(simulatorEnabled('demo', { NODE_ENV: 'development' }), false);
});

test('backend registry is generated from the catalog of record (no drift)', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  const catalog = JSON.parse(
    readFileSync(
      path.join(root, '.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.json'),
      'utf8',
    ),
  ) as { capabilities: { capability_id: string; type: string; sensitivity: string }[] };
  const registry = new Map(allCapabilities().map((c) => [c.id, c]));
  assert.equal(registry.size, catalog.capabilities.length);
  for (const entry of catalog.capabilities) {
    const cap = registry.get(entry.capability_id);
    assert.ok(
      cap,
      `${entry.capability_id} missing: run node scripts/ai-architecture/build-authz-registry.mjs`,
    );
    assert.equal(cap!.type, entry.type);
    assert.equal(cap!.sensitivity, entry.sensitivity);
  }
});
