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

test('patient room reads validate input, enforce scope, and bound active and legacy history', () => {
  const readRoute = source
    .split("patientAssignmentRouter.get(\n  '/:patientId/room-assignments'")[1]
    ?.split('// POST /patients/:patientId/room-assignments')[0];
  assert.ok(readRoute);
  assert.ok(
    readRoute.indexOf('Parametro scope non valido') < readRoute.indexOf('requirePatientScope'),
  );
  assert.match(readRoute, /requirePatientScope/);
  assert.doesNotMatch(readRoute, /prisma\.patient\.findUnique/);
  assert.match(readRoute, /orderBy: \[\{ startDate: 'desc' \}, \{ id: 'desc' \}\]/);
  assert.match(
    readRoute,
    /take: activeOnly[\s\S]+?MAX_PATIENT_ACTIVE_ASSIGNMENTS[\s\S]+?MAX_PATIENT_ASSIGNMENT_HISTORY \+ 1/,
  );
  assert.match(readRoute, /boundPatientAssignmentResult\(assignments, activeOnly\)/);
  assert.match(readRoute, /X-Result-Truncated/);
  assert.doesNotMatch(readRoute, /take:[^\n]+undefined/);
});
