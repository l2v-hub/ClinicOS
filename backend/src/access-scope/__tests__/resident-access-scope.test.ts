import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RESIDENT_SCOPE_CONFIG,
  canAccessResident,
  describeResident,
  residentScopeConfig,
  residentScopeFor,
  residentScopeWhere,
  type ResidentReader,
} from '../resident-access-scope.js';
import { hasGlobalPatientScope, patientScopeWhere } from '../../patients/patient-scope.js';

const original = process.env.RESIDENT_SCOPE_CONFIG;
afterEach(() => {
  if (original === undefined) delete process.env.RESIDENT_SCOPE_CONFIG;
  else process.env.RESIDENT_SCOPE_CONFIG = original;
});

/** In-memory reader: rows owned by operators; applies the same `where` the service builds. */
function reader(
  rows: { id: string; registeredById: string; firstName: string; lastName: string }[],
): ResidentReader & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    patient: {
      async findFirst(input) {
        calls.push(input.where);
        const row = rows.find(
          (r) =>
            r.id === input.where.id &&
            (input.where.registeredById === undefined ||
              r.registeredById === input.where.registeredById),
        );
        return row ? { id: row.id, firstName: row.firstName, lastName: row.lastName } : null;
      },
    },
  };
}

const rows = [
  { id: 'p-nurse', registeredById: 'SIM-NURSE-1', firstName: 'Nora', lastName: 'Galli' },
  { id: 'p-oss', registeredById: 'SIM-OSS-1', firstName: 'Olga', lastName: 'Verdi' },
];

test('default config preserves today’s behaviour (never widened)', () => {
  assert.deepEqual(residentScopeConfig({}), DEFAULT_RESIDENT_SCOPE_CONFIG);
  assert.equal(residentScopeFor({ role: 'operatore' }).mode, 'registered_by_me');
  assert.equal(residentScopeFor({ role: 'admin' }).mode, 'all');
  assert.equal(residentScopeFor({ role: 'Manager' }).mode, 'all');
  assert.deepEqual(residentScopeWhere({ id: 'X', role: 'operatore' }), { registeredById: 'X' });
  assert.deepEqual(residentScopeWhere({ id: 'X', role: 'manager' }), {});
  // The legacy helpers now delegate to the scope service (single rule).
  assert.equal(hasGlobalPatientScope('admin'), true);
  assert.equal(hasGlobalPatientScope('operatore'), false);
  assert.deepEqual(patientScopeWhere({ id: 'X', role: 'operatore' }), { registeredById: 'X' });
});

test('config: implemented modes apply, unimplemented or malformed ones never widen', () => {
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({
    byLegacyRole: { manager: 'registered_by_me' },
  });
  assert.equal(
    residentScopeFor({ role: 'manager' }).mode,
    'registered_by_me',
    'narrowing is allowed',
  );
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({
    byLegacyRole: { operatore: 'ward' },
    fallback: 'team',
  });
  assert.equal(
    residentScopeFor({ role: 'operatore' }).mode,
    'registered_by_me',
    'ward not implemented → unchanged',
  );
  process.env.RESIDENT_SCOPE_CONFIG = JSON.stringify({ byLegacyRole: { operatore: 'all' } });
  assert.equal(residentScopeFor({ role: 'operatore' }).mode, 'all', 'explicit config only');
  process.env.RESIDENT_SCOPE_CONFIG = '{not json';
  assert.equal(residentScopeFor({ role: 'operatore' }).mode, 'registered_by_me');
});

test('canAccessResident: same predicate for select/read/skill/write; lists and unknown ids refused', async () => {
  const db = reader(rows);
  const nurse = { id: 'SIM-NURSE-1', role: 'operatore' };
  for (const operation of ['select', 'read', 'skill', 'write', 'tool'] as const) {
    assert.equal(
      (await canAccessResident(nurse, 'p-nurse', { operation }, db)).allowed,
      true,
      operation,
    );
    const denied = await canAccessResident(nurse, 'p-oss', { operation }, db);
    assert.deepEqual([denied.allowed, denied.reason], [false, 'resident_out_of_scope'], operation);
  }
  assert.equal(
    (await canAccessResident(nurse, 'p-nurse,p-oss', { operation: 'read' }, db)).allowed,
    false,
  );
  assert.equal((await canAccessResident(nurse, '', { operation: 'read' }, db)).allowed, false);
  const supervisor = { id: 'SIM-SUPERVISOR-1', role: 'manager' };
  assert.equal(
    (await canAccessResident(supervisor, 'p-oss', { operation: 'read' }, db)).allowed,
    true,
  );
});

test('describeResident: server label only for reachable residents', async () => {
  const db = reader(rows);
  assert.deepEqual(
    await describeResident({ id: 'SIM-NURSE-1', role: 'operatore' }, 'p-nurse', db),
    {
      id: 'p-nurse',
      label: 'Galli Nora',
    },
  );
  assert.equal(await describeResident({ id: 'SIM-NURSE-1', role: 'operatore' }, 'p-oss', db), null);
});
