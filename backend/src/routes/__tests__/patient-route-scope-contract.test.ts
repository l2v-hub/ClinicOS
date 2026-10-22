import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const route = readFileSync(fileURLToPath(new URL('../patients.ts', import.meta.url)), 'utf8');
const parametersUpdate = readFileSync(
  fileURLToPath(new URL('../../patients/parameters-update.ts', import.meta.url)),
  'utf8',
);

test('patient detail and mutation routes use the same non-enumerating scope guard', () => {
  for (const signature of [
    "router.get('/:id', requirePatientScope",
    "router.patch('/:id', requirePatientScope",
    "router.get('/:id/cartella', requirePatientScope",
    "router.put('/:id/cartella', requirePatientScope",
  ]) {
    assert.ok(route.includes(signature), `${signature} must be scoped`);
  }
  assert.match(route, /router\.delete\(\s*'\/:id',[\s\S]+?requirePatientScope/);
  const scopedPatientLock = parametersUpdate.match(
    /const patients = await tx\.\$queryRaw<Array<\{ id: string \}>>\(Prisma\.sql`([\s\S]*?)`\);\s*if \(!patients\.length\) throw new PatientParametersNotFoundError\(\);\s*const rows = await tx\.\$queryRaw/,
  );
  assert.ok(
    scopedPatientLock,
    'the scoped patient lock and missing-patient rejection must happen before Cartella access',
  );
  const scopedQuery = scopedPatientLock[1];
  assert.match(scopedQuery, /SELECT p\.id FROM "Patient" p WHERE p\.id = \$\{patientId\}/);
  assert.match(
    scopedQuery,
    /hasFacilityPatientScope\(actor\.role\)\s*\?\s*Prisma\.empty\s*:\s*Prisma\.sql`AND p\."registeredById" = \$\{actor\.id\}`/,
  );
  assert.match(scopedQuery, /FOR UPDATE OF p/);
});

test('patient ownership and conflict responses are server-authoritative', () => {
  assert.match(route, /registeredById: actor\.id/);
  assert.doesNotMatch(route, /existingPatientId/);
});
