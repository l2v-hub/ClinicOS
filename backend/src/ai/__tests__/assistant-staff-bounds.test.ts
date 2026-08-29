import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boundStaffList, MAX_STAFF_RESULTS, type StaffListRow } from '../assistant/staff-window.js';

function staffRow(index: number, isActive = true): StaffListRow {
  return {
    ruolo: index % 2 === 0 ? 'infermiere' : null,
    qualifica: index % 2 === 0 ? 'OSS' : null,
    department: index % 2 === 0 ? 'Reparto A' : null,
    user: { fullName: `Operatore ${index}`, isActive },
  };
}

test('staff window preserves the public five-field shape and exact-size completeness', () => {
  const result = boundStaffList(
    Array.from({ length: MAX_STAFF_RESULTS }, (_, index) => staffRow(index, index !== 1)),
  );
  assert.equal(result.data.length, MAX_STAFF_RESULTS);
  assert.equal(result.truncated, false);
  assert.deepEqual(result.data[1], {
    fullName: 'Operatore 1',
    ruolo: null,
    qualifica: null,
    reparto: null,
    stato: 'inattivo',
  });
  assert.deepEqual(Object.keys(result.data[0] ?? {}).sort(), [
    'fullName',
    'qualifica',
    'reparto',
    'ruolo',
    'stato',
  ]);
});

test('staff window uses one-row look-ahead and returns at most 100 operators', () => {
  const result = boundStaffList(
    Array.from({ length: MAX_STAFF_RESULTS + 1 }, (_, index) => staffRow(index)),
  );
  assert.equal(result.data.length, MAX_STAFF_RESULTS);
  assert.equal(result.truncated, true);
  assert.equal(result.data.at(-1)?.fullName, 'Operatore 99');
});

test('assistant staff query is gated, minimal, stable and bounded', () => {
  const service = readFileSync(new URL('../assistant/service.ts', import.meta.url), 'utf8');
  const block = service.split('async function staffList')[1]?.split('/** Quante eccezioni')[0];
  assert.ok(block);
  assert.ok(block.indexOf('canFacilityRead(env)') < block.indexOf('operator.findMany'));
  assert.match(block, /user:\s*\{\s*select:\s*\{\s*fullName:\s*true,\s*isActive:\s*true/);
  assert.match(block, /orderBy:\s*\[\{ createdAt: 'asc' \}, \{ id: 'asc' \}\]/);
  assert.match(block, /take:\s*MAX_STAFF_RESULTS \+ 1/);
  assert.match(block, /truncated:\s*result\.truncated/);
  assert.match(block, /elenco parziale/);
  assert.doesNotMatch(block, /include:\s*\{\s*user:\s*true/);
  assert.doesNotMatch(block, /passwordHash|email|entraObjectId|phone|licenseNumber/);
});
