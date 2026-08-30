import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Prisma construction requires a syntactically valid URL, but these contract tests never connect.
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:9/clinicos_contract';

const { atomicAppointmentWriteWhere } = await import('../appointment-service.js');
const serviceSource = readFileSync(new URL('../appointment-service.ts', import.meta.url), 'utf8');

test('appointment write predicates retain owner and privileged-role policy at mutation time', () => {
  assert.deepEqual(
    atomicAppointmentWriteWhere('appointment-1', {
      operatorId: 'operator-a',
      role: 'operatore',
    }),
    { id: 'appointment-1', operatorId: 'operator-a' },
  );
  for (const role of ['admin', 'manager']) {
    assert.deepEqual(
      atomicAppointmentWriteWhere('appointment-1', { operatorId: `${role}-1`, role }),
      { id: 'appointment-1' },
    );
  }
});

test('appointment update and UI-only delete cannot fall back to id-only writes', () => {
  assert.match(
    serviceSource,
    /tx\.appointment\.updateMany\(\{[\s\S]*atomicAppointmentWriteWhere\(id, actor\)/,
  );
  assert.match(serviceSource, /if \(updated\.count !== 1\)/);
  assert.match(
    serviceSource,
    /tx\.appointment\.deleteMany\(\{[\s\S]*atomicAppointmentWriteWhere\(id, actor\)/,
  );
  assert.match(serviceSource, /if \(deleted\.count === 1\) return true/);
  assert.doesNotMatch(serviceSource, /appointment\.update\(\{\s*where: \{ id \}/);
  assert.doesNotMatch(serviceSource, /appointment\.delete\(\{\s*where: \{ id \}/);
});
