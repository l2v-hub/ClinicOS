import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routeSource = readFileSync(new URL('../admin-rooms.ts', import.meta.url), 'utf8');
const deleteBlock = routeSource
  .split("patientAssignmentRouter.delete('/:patientId/room-assignments/:assignmentId'")[1]
  ?.split('export { adminRouter, patientAssignmentRouter }')[0];

test('assignment deletion locks room, bed and patient before re-reading and deleting', () => {
  assert.ok(deleteBlock);
  assert.match(deleteBlock, /select: \{ bedId: true, roomId: true \}/);
  assert.match(deleteBlock, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(
    deleteBlock,
    /assignmentLockKeys\([\s\S]*patientId,[\s\S]*lockTarget\.bedId,[\s\S]*lockTarget\.roomId/,
  );
  assert.match(deleteBlock, /pg_advisory_xact_lock/);
  assert.match(deleteBlock, /tx\.patientRoomAssignment\.findFirst/);
  assert.match(deleteBlock, /if \(!existing\) return false/);
  assert.match(deleteBlock, /tx\.patientRoomAssignment\.deleteMany/);
  assert.match(deleteBlock, /where: \{ id: assignmentId, patientId \}/);
  assert.match(deleteBlock, /return result\.count === 1/);
  assert.match(deleteBlock, /if \(!deleted\)[\s\S]*res\.status\(404\)/);
  assert.ok(
    deleteBlock.indexOf('tx.patientRoomAssignment.findFirst') <
      deleteBlock.indexOf('tx.patientRoomAssignment.deleteMany'),
  );
});

test('database regression suite covers duplicate and parent-delete races', () => {
  const integrationSource = readFileSync(
    new URL('./admin-rooms-concurrency.test.ts', import.meta.url),
    'utf8',
  );
  assert.match(integrationSource, /doppia DELETE assegnazione concorrente produce 204 e 404/);
  assert.match(
    integrationSource,
    /DELETE assegnazione concorrente con DELETE letto non produce 500/,
  );
  assert.match(integrationSource, /app\.use\('\/admin', adminRouter\)/);
});
