import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const route = readFileSync(fileURLToPath(new URL('../patients.ts', import.meta.url)), 'utf8');
const parametersPage = readFileSync(
  fileURLToPath(new URL('../../patients/parameters-page.ts', import.meta.url)),
  'utf8',
);
const parametersUpdate = readFileSync(
  fileURLToPath(new URL('../../patients/parameters-update.ts', import.meta.url)),
  'utf8',
);
const confirmService = readFileSync(
  fileURLToPath(new URL('../../ai/upload/confirm-service.ts', import.meta.url)),
  'utf8',
);

test('patient rosters and aggregate projections carry the authenticated ownership scope', () => {
  assert.match(route, /const baseWhere = \{\s*\.\.\.patientScopeWhere\(actor\)/);
  assert.match(route, /loadPatientParametersPage\([^;]+, actor\)/s);
  assert.match(route, /WHERE p\."registeredById" = \$\{actor\.id\}/);
  assert.match(route, /where: \{ id: \{ in: patientIds \}, \.\.\.patientScopeWhere\(actor\) \}/);
  assert.match(parametersPage, /p\."registeredById" = \$\{scope\.registeredById\}/);
});

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
  assert.match(
    parametersUpdate,
    /findFirst\(\{\s*where: \{ id: patientId, \.\.\.patientScopeWhere\(actor\) \}/s,
  );
});

test('patient ownership and conflict responses are server-authoritative', () => {
  assert.match(route, /registeredById: actor\.id/);
  assert.doesNotMatch(route, /existingPatientId/);
});

test('bounded patient roster projects and searches the canonical fiscal identity', () => {
  assert.match(route, /router\.post\('\/page\/search'/);
  assert.match(route, /sendPatientPage\(req as AuthedRequest, res, rawInput/);
  assert.match(route, /hasOwnProperty\.call\(req\.query, 'q'\)/);
  assert.match(route, /typeof rawInput\.q !== 'string' \|\| !rawInput\.q\.trim\(\)/);
  assert.match(route, /const exactFiscalCode = \/\^\[A-Z0-9\]\{16\}\$\//);
  assert.match(route, /\? \{ codiceFiscale: exactFiscalCode \}/);
  assert.match(route, /codiceFiscale:\s*\{\s*contains: token\.replace/);
  assert.doesNotMatch(route, /medicalRecordNumber: \{ contains: token/);
  assert.match(route, /medicalRecordNumber: true,\s*codiceFiscale: true/);
  assert.match(route, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(route, /SET "data" = "data" - 'codiceFiscale'/);
  assert.match(route, /const \{ codiceFiscale: _legacyIdentity, \.\.\.clinicalData \}/);
  assert.match(confirmService, /withoutCanonicalPatientIdentity\(cartellaData\)/);
  assert.match(confirmService, /withoutCanonicalPatientIdentity\(payload\.cartella \?\? \{\}\)/);
});
