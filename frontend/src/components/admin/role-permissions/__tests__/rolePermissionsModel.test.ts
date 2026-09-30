import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  PolicyCapability,
  PolicyDocument,
  PolicyIdentity,
} from '../../../../lib/authzPolicyApi';
import {
  EMPTY_FILTERS,
  cellKey,
  cloneDocument,
  describePolicyError,
  diffDraft,
  doubtfulCapabilities,
  effectCounts,
  effectOf,
  filterCapabilities,
  filtersActive,
  followersOf,
  groupByDomain,
  identitiesOfRole,
  identityRole,
  isEffectivelyAllowed,
  withAssignment,
  withGrant,
} from '../rolePermissionsModel';

function cap(
  id: string,
  domain: string,
  type: PolicyCapability['type'] = 'read',
  sensitivity: PolicyCapability['sensitivity'] = 'low',
  name = id,
): PolicyCapability {
  return { id, name, domain, type, sensitivity, exposure: 'gui', legacyRoles: [], tool: false };
}

const CAPS: PolicyCapability[] = [
  cap('patients.read', 'patients', 'read', 'medium', 'Leggi pazienti'),
  cap('patients.update', 'patients', 'write', 'high', 'Modifica paziente'),
  cap('therapy.administer', 'therapy', 'action', 'critical', 'Somministra terapia'),
  cap('notes.read', 'notes', 'read', 'low', 'Leggi note'),
];

function baseDoc(): PolicyDocument {
  return {
    schema: 'clinicos.authz-policy/v1',
    defaultEffect: 'DENIED',
    roles: [
      {
        id: 'nurse',
        label: 'Nurse',
        description: 'Infermiere',
        legacyRole: 'operatore',
        uiShell: 'operator',
      },
      {
        id: 'operator',
        label: 'Operator (legacy)',
        description: '',
        legacy: true,
        legacyRole: 'operatore',
        uiShell: 'operator',
      },
      {
        id: 'legacy_admin',
        label: 'Administrator (legacy)',
        description: '',
        legacy: true,
        legacyRole: 'admin',
        uiShell: 'admin',
      },
    ],
    grants: {
      nurse: { 'patients.read': 'ALLOWED', 'patients.update': 'ALLOWED_WITH_CONFIRMATION' },
      operator: { 'patients.read': 'READ_ONLY' },
      legacy_admin: {},
    },
    assignments: { 'OP-1': 'nurse' },
    review: { 'nurse:therapy.administer': 'Da confermare con la direzione sanitaria' },
  };
}

const IDENTITIES: PolicyIdentity[] = [
  {
    id: 'OP-1',
    name: 'Anna',
    ruolo: 'infermiere',
    legacyRole: 'operatore',
    active: true,
    simulated: false,
  },
  {
    id: 'OP-2',
    name: 'Bruno',
    ruolo: 'coordinatore',
    legacyRole: 'manager',
    active: true,
    simulated: false,
  },
  {
    id: 'SIM-NURSE-1',
    name: 'Nurse 1',
    ruolo: 'infermiere',
    legacyRole: 'operatore',
    active: true,
    simulated: true,
  },
];

test('effectOf falls back to the document default effect', () => {
  const doc = baseDoc();
  assert.equal(effectOf(doc, 'nurse', 'patients.read'), 'ALLOWED');
  assert.equal(effectOf(doc, 'nurse', 'notes.read'), 'DENIED');
  assert.equal(effectOf(doc, 'unknown', 'notes.read'), 'DENIED');
});

test('READ_ONLY only allows read capabilities (backend decide() rule)', () => {
  assert.equal(isEffectivelyAllowed('READ_ONLY', 'read'), true);
  assert.equal(isEffectivelyAllowed('READ_ONLY', 'write'), false);
  assert.equal(isEffectivelyAllowed('ALLOWED_WITH_CONFIRMATION', 'action'), true);
  assert.equal(isEffectivelyAllowed('DENIED', 'read'), false);
});

test('withGrant / withAssignment never mutate the source document', () => {
  const doc = baseDoc();
  const snapshot = JSON.stringify(doc);
  const edited = withGrant(doc, 'nurse', 'notes.read', 'ALLOWED');
  const reassigned = withAssignment(edited, 'OP-1', null);
  assert.equal(JSON.stringify(doc), snapshot);
  assert.equal(effectOf(edited, 'nurse', 'notes.read'), 'ALLOWED');
  assert.equal(reassigned.assignments['OP-1'], undefined);
  assert.equal(edited.grants.operator, doc.grants.operator, 'untouched roles stay shared');
});

test('diffDraft counts effective grant and assignment changes', () => {
  const base = baseDoc();
  let draft = cloneDocument(base);
  // Setting DENIED explicitly where the default is DENIED is not a change.
  draft = withGrant(draft, 'nurse', 'notes.read', 'DENIED');
  assert.equal(diffDraft(base, draft, CAPS).total, 0);

  draft = withGrant(draft, 'nurse', 'therapy.administer', 'ALLOWED_WITH_CONFIRMATION');
  draft = withGrant(draft, 'operator', 'patients.read', 'DENIED');
  draft = withAssignment(draft, 'OP-2', 'nurse');
  const diff = diffDraft(base, draft, CAPS);
  assert.equal(diff.grants.length, 2);
  assert.equal(diff.assignments.length, 1);
  assert.equal(diff.total, 3);
  assert.ok(diff.changedCells.has(cellKey('nurse', 'therapy.administer')));
  assert.ok(diff.changedCells.has(cellKey('operator', 'patients.read')));
  assert.deepEqual([...diff.changedCapabilities].sort(), ['patients.read', 'therapy.administer']);
  assert.deepEqual(diff.assignments[0], { operatorId: 'OP-2', before: null, after: 'nurse' });

  // Reverting a cell removes the change.
  draft = withGrant(draft, 'operator', 'patients.read', 'READ_ONLY');
  assert.equal(diffDraft(base, draft, CAPS).grants.length, 1);
});

test('doubtfulCapabilities reads the roleId:capabilityId review keys', () => {
  assert.deepEqual([...doubtfulCapabilities(baseDoc().review)], ['therapy.administer']);
  assert.equal(doubtfulCapabilities(undefined).size, 0);
});

test('filterCapabilities combines text, type, sensitivity, doubtful and modified', () => {
  const ctx = { doubtful: new Set(['therapy.administer']), modified: new Set(['notes.read']) };
  const ids = (filters: Partial<typeof EMPTY_FILTERS>) =>
    filterCapabilities(CAPS, { ...EMPTY_FILTERS, ...filters }, ctx).map((c) => c.id);

  assert.equal(ids({}).length, 4);
  assert.deepEqual(ids({ text: 'PAZIENT' }), ['patients.read', 'patients.update']);
  assert.deepEqual(ids({ text: 'terapia' }), ['therapy.administer']);
  assert.deepEqual(ids({ type: 'write' }), ['patients.update']);
  assert.deepEqual(ids({ sensitivity: 'critical' }), ['therapy.administer']);
  assert.deepEqual(ids({ onlyDoubtful: true }), ['therapy.administer']);
  assert.deepEqual(ids({ onlyModified: true }), ['notes.read']);
  assert.deepEqual(ids({ type: 'read', onlyModified: true }), ['notes.read']);
  assert.equal(filtersActive(EMPTY_FILTERS), false);
  assert.equal(filtersActive({ ...EMPTY_FILTERS, text: '  ' }), false);
  assert.equal(filtersActive({ ...EMPTY_FILTERS, onlyDoubtful: true }), true);
});

test('groupByDomain groups with Italian labels, sorted', () => {
  const groups = groupByDomain(CAPS);
  assert.deepEqual(
    groups.map((g) => [g.label, g.capabilities.length]),
    [
      ['Note', 1],
      ['Pazienti', 2],
      ['Terapia', 1],
    ],
  );
  assert.deepEqual(
    groups[1].capabilities.map((c) => c.name),
    ['Leggi pazienti', 'Modifica paziente'],
  );
});

test('effectCounts covers every capability once', () => {
  const counts = effectCounts(baseDoc(), 'nurse', CAPS);
  assert.deepEqual(counts, { ALLOWED: 1, ALLOWED_WITH_CONFIRMATION: 1, READ_ONLY: 0, DENIED: 2 });
});

test('identity role: explicit valid assignment wins, otherwise legacy fallback', () => {
  const doc = baseDoc();
  assert.deepEqual(identityRole(doc, IDENTITIES[0]), { roleId: 'nurse', source: 'assignment' });
  assert.deepEqual(identityRole(doc, IDENTITIES[1]), { roleId: 'legacy_admin', source: 'legacy' });
  assert.deepEqual(identityRole(doc, IDENTITIES[2]), { roleId: 'operator', source: 'legacy' });
  const dangling = withAssignment(doc, 'OP-2', 'ghost_role');
  assert.deepEqual(identityRole(dangling, IDENTITIES[1]), {
    roleId: 'legacy_admin',
    source: 'legacy',
  });
  assert.deepEqual(
    identitiesOfRole(doc, IDENTITIES, 'operator').map((i) => i.identity.id),
    ['SIM-NURSE-1'],
  );
});

test('followersOf lists derived capabilities governed by a capability', () => {
  const derived = [
    {
      id: 'agnos.therapy.administer',
      name: 'Agnos somministra',
      domain: 'agnos',
      governedBy: 'therapy.administer',
    },
    { id: 'agnos.notes', name: 'Agnos note', domain: 'agnos', governedBy: 'notes.read' },
  ];
  assert.deepEqual(
    followersOf('therapy.administer', derived).map((d) => d.id),
    ['agnos.therapy.administer'],
  );
});

test('describePolicyError maps conflict codes to a reload notice', () => {
  assert.equal(
    describePolicyError({ status: 409, code: 'policy_version_conflict' }).needsReload,
    true,
  );
  assert.equal(describePolicyError({ status: 409, code: 'stale_draft' }).needsReload, true);
  const invalid = describePolicyError(
    Object.assign(new Error('Ruolo sconosciuto assegnato a OP-2'), {
      status: 400,
      code: 'invalid_policy',
    }),
  );
  assert.equal(invalid.needsReload, false);
  assert.match(invalid.message, /Ruolo sconosciuto assegnato a OP-2/);
  assert.match(describePolicyError({ status: 403, code: 'capability_denied' }).message, /permesso/);
});
