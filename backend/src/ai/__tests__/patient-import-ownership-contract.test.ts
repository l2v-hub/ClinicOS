import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const confirmSource = readFileSync(
  new URL('../upload/confirm-service.ts', import.meta.url),
  'utf8',
);
const routeSource = readFileSync(new URL('../../routes/ai-jobs.ts', import.meta.url), 'utf8');

test('both reviewed import paths assign the authenticated operator to the new patient', () => {
  assert.match(confirmSource, /registeredById: string/);
  assert.match(confirmSource, /registeredById,\s*firstName:/);
  assert.match(confirmSource, /resolveRegisteredById\(tx, draft\.createdById, actor\.id\)/);
  assert.match(confirmSource, /resolveRegisteredById\(tx, job\.createdById, actor\.id\)/);
  assert.match(confirmSource, /validIds\.has\(actorId\)/);
  assert.match(confirmSource, /validIds\.has\(candidateId\) \? candidateId : actorId/);
  assert.match(confirmSource, /where: \{ id: patientId, registeredById: null \}/);
  assert.equal(confirmSource.match(/await backfillPatientOwnership\(/g)?.length, 2);
  assert.match(confirmSource, /export async function confirmJob\([\s\S]*actor: ClinicalActor/);
  assert.match(routeSource, /confirmJob\([\s\S]*\(req as AuthedRequest\)\.operator![\s\S]*\)/);
});
