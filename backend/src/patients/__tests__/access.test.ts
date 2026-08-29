import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasGlobalPatientScope, patientIsInOperatorScope } from '../patient-scope.js';

test('patient scope restricts ordinary operators to registered patients', async () => {
  const seen: unknown[] = [];
  const reader = {
    patient: {
      async findFirst(input: unknown) {
        seen.push(input);
        return { id: 'patient-1' };
      },
    },
  };
  assert.equal(
    await patientIsInOperatorScope('patient-1', { id: 'operator-1', role: 'operatore' }, reader),
    true,
  );
  assert.deepEqual(seen, [
    { where: { id: 'patient-1', registeredById: 'operator-1' }, select: { id: true } },
  ]);
});

test('manager and admin still verify existence without a registration predicate', async () => {
  for (const role of ['manager', 'admin']) {
    let where: unknown;
    const allowed = await patientIsInOperatorScope(
      'patient-1',
      { id: 'privileged-1', role },
      {
        patient: {
          async findFirst(input) {
            where = input.where;
            return { id: 'patient-1' };
          },
        },
      },
    );
    assert.equal(allowed, true);
    assert.deepEqual(where, { id: 'patient-1' });
  }
  assert.equal(hasGlobalPatientScope('operatore'), false);
});

test('missing and out-of-scope patients are denied uniformly', async () => {
  const denied = await patientIsInOperatorScope(
    'patient-other',
    { id: 'operator-1', role: 'operator' },
    {
      patient: {
        async findFirst() {
          return null;
        },
      },
    },
  );
  assert.equal(denied, false);
});
