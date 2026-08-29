import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const source = readFileSync(fileURLToPath(new URL('../admin-rooms.ts', import.meta.url)), 'utf8');

test('facility room read models are admin/manager-only', () => {
  const adminGate = source
    .split('adminRouter.use(requireOperator);')[1]
    ?.split('patientAssignmentRouter.use(requireOperator);')[0];
  assert.ok(adminGate);
  assert.match(adminGate, /adminRouter\.use\(requireAdmin\);/);
  assert.doesNotMatch(
    adminGate,
    /if \(\['POST', 'PUT', 'PATCH', 'DELETE'\]\.includes\(req\.method\)\)[\s\S]+?requireAdmin/,
  );
});

test('patient room history validates input then applies the non-enumerating patient scope', () => {
  const readRoute = source
    .split("patientAssignmentRouter.get(\n  '/:patientId/room-assignments'")[1]
    ?.split('// POST /patients/:patientId/room-assignments')[0];
  assert.ok(readRoute);
  assert.ok(
    readRoute.indexOf('Parametro scope non valido') < readRoute.indexOf('requirePatientScope'),
  );
  assert.match(readRoute, /requirePatientScope/);
  assert.doesNotMatch(readRoute, /prisma\.patient\.findUnique/);
  assert.match(readRoute, /take: activeOnly \? 8 : undefined/);
});
