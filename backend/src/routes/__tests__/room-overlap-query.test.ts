import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../admin-rooms.ts', import.meta.url), 'utf8');

test('available beds exclude exact overlaps in PostgreSQL without loading assignment rows', () => {
  const block = source
    .split("adminRouter.get('/beds/available'")[1]
    ?.split('// GET /admin/rooms')[0];
  assert.ok(block);
  assert.match(
    block,
    /assignments: \{ none: assignmentOverlapFilter\(validStartDate, validEndDate\) \}/,
  );
  assert.doesNotMatch(block, /assignments:\s*\{\s*where:/);
  assert.doesNotMatch(block, /\.filter\(/);
});

test('assignment POST and PUT apply the exact database overlap predicate before materializing', () => {
  const postBlock = source
    .split("patientAssignmentRouter.post('/:patientId/room-assignments'")[1]
    ?.split('// PUT /patients/:patientId/room-assignments/:assignmentId')[0];
  const putBlock = source
    .split("patientAssignmentRouter.put('/:patientId/room-assignments/:assignmentId'")[1]
    ?.split('// DELETE /patients/:patientId/room-assignments/:assignmentId')[0];
  assert.ok(postBlock);
  assert.ok(putBlock);
  assert.match(postBlock, /bedId, \.\.\.assignmentOverlapFilter\(startDate, endDate\)/);
  assert.match(postBlock, /patientId, \.\.\.assignmentOverlapFilter\(startDate, endDate\)/);
  assert.match(putBlock, /AND: \[/);
  assert.match(putBlock, /\{ OR: \[\{ patientId \}, \{ bedId: existing\.bedId \}\] \}/);
  assert.match(putBlock, /assignmentOverlapFilter\(existing\.startDate, candidateEndDate\)/);
  assert.match(putBlock, /select: \{ patientId: true, bedId: true \}/);
  assert.doesNotMatch(postBlock, /rangesOverlap/);
  assert.doesNotMatch(putBlock, /rangesOverlap/);
  assert.match(putBlock, /id: \{ not: assignmentId \}/);
});
