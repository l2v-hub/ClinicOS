import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canApplyPatientConsegne,
  canRefreshPatientConsegne,
  type ConsegneViewScope,
} from '../consegneNavigation';
import { deferred } from './rosterOrder.fixtures';

const patientScope = (patientId: string): ConsegneViewScope => ({
  navKey: 'dettaglio-paziente',
  mode: 'rounds',
  patientId,
});

test('late creation for A cannot start a patient refresh or supersede B', async () => {
  let current = patientScope('a');
  const response = deferred<void>();
  const refreshes: string[] = [];
  const completion = response.promise.then(() => {
    if (canRefreshPatientConsegne(current, 'a')) refreshes.push('a');
  });
  current = patientScope('b');
  response.resolve();
  await completion;
  assert.deepEqual(refreshes, []);
  assert.equal(canRefreshPatientConsegne(current, 'b'), true);
});

test('patient read cannot commit after A→B or A→B→A, even when no new read has started', async () => {
  for (const backToA of [false, true]) {
    let current = patientScope('a');
    const captured = current;
    const response = deferred<void>();
    const completion = response.promise.then(() => canApplyPatientConsegne(captured, current, 'a'));
    current = patientScope('b');
    if (backToA) current = patientScope('a');
    response.resolve();
    assert.equal(await completion, false);
    if (backToA) {
      assert.equal(canRefreshPatientConsegne(current, 'a'), true);
      assert.equal(canApplyPatientConsegne(current, current, 'a'), true);
    }
  }
});

test('patient handover readers and creation refreshes stop when the detail view is closed', () => {
  const captured = patientScope('a');
  const closed: ConsegneViewScope = { ...captured, navKey: 'consegne', mode: 'feed' };
  assert.equal(canRefreshPatientConsegne(closed, 'a'), false);
  assert.equal(canApplyPatientConsegne(captured, closed, 'a'), false);
});
