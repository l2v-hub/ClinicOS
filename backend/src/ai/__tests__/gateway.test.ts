import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUserContext,
  signUserContext,
  assertTenant,
  isPatientAllowed,
  assertPatientAllowed,
  canCrossPatientSearch,
  checkServiceToken,
  defaultTenant,
} from '../gateway/context.js';
import {
  patientSearchWhere,
  patientScopeWhere,
  validateClinicalSearchInput,
  validateCorrelateInput,
  validatePatientSearchInput,
} from '../gateway/validation.js';
import type { UserContext } from '../gateway/types.js';
import { GatewayError } from '../gateway/types.js';
import {
  filterVitals,
  vitalNumericValue,
  matchAllergy,
  matchTherapy,
  normalizeSearchText,
  textIncludes,
} from '../gateway/filters.js';
import { narrativeSource, vitalSource } from '../gateway/sources.js';

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const TEST_NOW = Date.parse('2026-08-29T12:00:00.000Z');
const SIGN_ENV = env({
  AI_GATEWAY_CONTEXT_SECRET: 'test-only-context-secret-at-least-32-bytes',
  AI_DEFAULT_TENANT: 'clinicos',
});
const BASE_CONTEXT: UserContext = {
  userId: 'u1',
  tenantId: 'clinicos',
  roles: ['operator'],
  permittedPatientIds: null,
  requestId: 'req-1',
};

function signedContext(overrides: Partial<UserContext> = {}, nowMs = TEST_NOW): UserContext {
  const headers = signUserContext({ ...BASE_CONTEXT, ...overrides }, SIGN_ENV, nowMs);
  return parseUserContext(headers, SIGN_ENV, nowMs);
}

// ── context ──
test('signed context: legacy identity/role/scope headers are rejected', () => {
  assert.throws(
    () =>
      parseUserContext(
        {
          'X-AI-User-Id': 'attacker',
          'X-AI-Roles': 'admin',
          'X-AI-Permitted-Patients': 'patient-any',
        },
        SIGN_ENV,
        TEST_NOW,
      ),
    (e) => e instanceof GatewayError && e.kind === 'unauthorized',
  );
});

test('signed context: valid envelope round-trips bounded authorization fields', () => {
  const parsed = signedContext({ roles: ['manager'], permittedPatientIds: ['p1', 'p2'] });
  assert.deepEqual(parsed, {
    ...BASE_CONTEXT,
    roles: ['manager'],
    permittedPatientIds: ['p1', 'p2'],
  });
});

test('signed context: tampering and expiry fail closed', () => {
  const headers = signUserContext(BASE_CONTEXT, SIGN_ENV, TEST_NOW, 60);
  assert.throws(
    () =>
      parseUserContext(
        { ...headers, 'x-ai-context-signature': `${headers['x-ai-context-signature']}x` },
        SIGN_ENV,
        TEST_NOW,
      ),
    (e) => e instanceof GatewayError && e.kind === 'unauthorized',
  );
  assert.throws(
    () => parseUserContext(headers, SIGN_ENV, TEST_NOW + 61_000),
    (e) => e instanceof GatewayError && e.kind === 'unauthorized',
  );
});

test('signed context: unconfigured/short secret and oversized scope fail closed', () => {
  assert.throws(
    () => signUserContext(BASE_CONTEXT, env({ AI_GATEWAY_CONTEXT_SECRET: 'short' }), TEST_NOW),
    (e) => e instanceof GatewayError && e.kind === 'unauthorized',
  );
  assert.throws(
    () =>
      signUserContext(
        { ...BASE_CONTEXT, permittedPatientIds: Array.from({ length: 101 }, (_, i) => `p-${i}`) },
        SIGN_ENV,
        TEST_NOW,
      ),
    (e) => e instanceof GatewayError && e.kind === 'unauthorized',
  );
});

test('assertTenant: a different tenant is rejected (isolation)', () => {
  const ctx = signedContext({ tenantId: 'other-clinic' });
  assert.throws(
    () => assertTenant(ctx),
    (e) => e instanceof GatewayError && e.kind === 'tenant_isolation',
  );
  const ok = signedContext({ tenantId: defaultTenant() });
  assert.doesNotThrow(() => assertTenant(ok));
});

test('patient allow-list is enforced', () => {
  const scoped = signedContext({ permittedPatientIds: ['p1'] });
  assert.equal(isPatientAllowed(scoped, 'p1'), true);
  assert.equal(isPatientAllowed(scoped, 'p2'), false);
  assert.throws(
    () => assertPatientAllowed(scoped, 'p2'),
    (e) => e instanceof GatewayError && e.kind === 'forbidden',
  );
  const operator = signedContext();
  assert.equal(isPatientAllowed(operator, 'anything'), true);
});

// QA P1: una riga senza paziente collegato (`Consegna.pazienteId` è `String @default("")`) porta
// comunque nome paziente e note in chiaro. Con una allow-list esplicita deve restare fuori; senza
// allow-list (scope operatore) la lettura è invece consentita come per ogni altra riga.
test('patient allow-list excludes rows with no linked patient', () => {
  const scoped = signedContext({ permittedPatientIds: ['p1'] });
  assert.equal(isPatientAllowed(scoped, ''), false);
  const unrestricted = signedContext();
  assert.equal(isPatientAllowed(unrestricted, ''), true);
});

test('cross-patient search is off unless enabled AND privileged', () => {
  const mgr = signedContext({ roles: ['manager'] });
  assert.equal(
    canCrossPatientSearch(mgr, env({ AI_CROSS_PATIENT_SEARCH_ENABLED: 'false' })),
    false,
  );
  assert.equal(canCrossPatientSearch(mgr, env({ AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' })), true);
  const op = signedContext({ roles: ['operator'] });
  assert.equal(canCrossPatientSearch(op, env({ AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' })), false);
});

test('service token: closed when unset; matches Bearer when set', () => {
  assert.equal(checkServiceToken('Bearer x', env({})), false);
  assert.equal(
    checkServiceToken('Bearer secret', env({ AI_RUNTIME_SERVICE_TOKEN: 'secret' })),
    true,
  );
  assert.equal(
    checkServiceToken('Bearer wrong', env({ AI_RUNTIME_SERVICE_TOKEN: 'secret' })),
    false,
  );
});

// ── input validation / query scope ──
test('patient search requires a bounded filter and validates dates/limits', () => {
  assert.throws(() => validatePatientSearchInput({}), /at least one search filter/);
  assert.throws(
    () => validatePatientSearchInput({ query: 'one two three four five six' }),
    /too many tokens/,
  );
  assert.throws(() => validatePatientSearchInput({ query: 'Rossi', limit: 51 }), /limit/);
  assert.throws(() => validatePatientSearchInput({ admissionFrom: '2026-02-30' }), /valid date/);
  assert.throws(
    () => validatePatientSearchInput({ admissionFrom: '2026-08-30', admissionTo: '2026-08-01' }),
    /must not be after/,
  );
  assert.deepEqual(validatePatientSearchInput({ query: '  Rossi Mario ', limit: 5 }).tokens, [
    'Rossi',
    'Mario',
  ]);
});

test('clinical/document search cannot become an unbounded roster dump', () => {
  assert.throws(
    () => validateClinicalSearchInput({}, { queryRequired: false }),
    /query or patientId required/,
  );
  assert.throws(
    () => validateClinicalSearchInput({ query: 'x'.repeat(101) }, { queryRequired: true }),
    /query is invalid/,
  );
  assert.deepEqual(patientScopeWhere([]), { patientId: { in: [] } });
  assert.deepEqual(patientScopeWhere(['p1', 'p2']), { patientId: { in: ['p1', 'p2'] } });
  assert.deepEqual(patientScopeWhere(null), {});
});

test('patient ACL and text filters are built into the database predicate before take', () => {
  const validated = validatePatientSearchInput({
    query: 'Rossi Mario',
    admissionFrom: '2026-01-01',
  });
  const where = patientSearchWhere(validated, ['p1', 'p2']) as {
    AND: Array<Record<string, unknown>>;
  };
  assert.deepEqual(where.AND[0], { id: { in: ['p1', 'p2'] } });
  assert.equal(where.AND.length, 4); // ACL + two tokens + admission date
  assert.deepEqual(patientSearchWhere(validatePatientSearchInput({ query: 'Rossi' }), null), {
    AND: [
      {
        OR: [
          { firstName: { contains: 'Rossi', mode: 'insensitive' } },
          { lastName: { contains: 'Rossi', mode: 'insensitive' } },
          { medicalRecordNumber: { contains: 'Rossi', mode: 'insensitive' } },
        ],
      },
    ],
  });
});

test('correlation rejects empty/unbounded input and normalizes a valid conjunction', () => {
  assert.throws(() => validateCorrelateInput({}), /at least one correlation filter/);
  assert.throws(
    () => validateCorrelateInput({ sectionContains: { text: 'x'.repeat(101) } }),
    /sectionContains.text is invalid/,
  );
  assert.throws(() => validateCorrelateInput({ allergy: 'lattice', limit: 0 }), /limit/);
  assert.deepEqual(
    validateCorrelateInput({
      allergy: ' lattice ',
      therapy: 'warfarin',
      sectionContains: { sectionKey: 'ANAMNESIS', text: ' ipertensione ' },
      limit: 10,
    }),
    {
      allergy: 'lattice',
      therapy: 'warfarin',
      sectionContains: { sectionKey: 'ANAMNESIS', text: 'ipertensione' },
      limit: 10,
    },
  );
});

// ── deterministic filters ──
test('vitalNumericValue parses PA systolic/diastolic and plain numbers', () => {
  assert.deepEqual(vitalNumericValue('PA', '130/85'), { systolic: 130, diastolic: 85, value: 130 });
  assert.deepEqual(vitalNumericValue('FC', '78'), { value: 78 });
  assert.deepEqual(vitalNumericValue('TC', '36,5'), { value: 36.5 });
});

test('filterVitals: systolic > 150 selects only high blood-pressure readings', () => {
  const vitals = [
    { etichetta: 'PA', valore: '160/95', rilevato: '2026-03-09' },
    { etichetta: 'PA', valore: '130/80', rilevato: '2026-03-10' },
    { etichetta: 'FC', valore: '78', rilevato: '2026-03-09' },
  ];
  const high = filterVitals(vitals, { label: 'PA', systolicMin: 151 });
  assert.equal(high.length, 1);
  assert.equal(high[0].valore, '160/95');
});

test('filterVitals: date range', () => {
  const vitals = [
    { etichetta: 'FC', valore: '70', rilevato: '2026-03-01' },
    { etichetta: 'FC', valore: '90', rilevato: '2026-03-10' },
  ];
  assert.equal(filterVitals(vitals, { from: '2026-03-05', to: '2026-03-31' }).length, 1);
});

test('allergy/therapy matching is accent/case-insensitive', () => {
  assert.equal(normalizeSearchText('Caffè già'), 'caffe gia');
  assert.equal(textIncludes('Caffè', 'caffe'), true);
  assert.equal(textIncludes('Penicillina', 'penicillina'), true);
  const c = {
    allergie: [{ allergene: 'Penicillina' }],
    terapie: [{ descrizione: 'Warfarin anticoagulante' }],
  };
  assert.ok(matchAllergy(c, 'penicill'));
  assert.ok(matchTherapy(c, 'anticoagulante'));
  assert.equal(matchAllergy(c, 'lattice'), null);
});

// ── sources ──
test('every source builder carries patientId + recordId + label', () => {
  const n = narrativeSource('p1', 'ANAMNESIS', 'rec1', 'testo', '2026-03-09T00:00:00Z');
  assert.equal(n.sourceType, 'NARRATIVE_SECTION');
  assert.equal(n.patientId, 'p1');
  assert.equal(n.recordId, 'rec1');
  assert.equal(n.sectionKey, 'ANAMNESIS');
  const v = vitalSource('p1', 'rec2', 'PA', 'PA 160/95', '2026-03-09');
  assert.equal(v.sourceType, 'VITAL_SIGN');
  assert.ok(v.label && v.recordId);
});

// ── 016 F0: match nome paziente multi-token (per risoluzione per nome) ─────────
import { nameMatchesAllTokens } from '../gateway/filters.js';

test('016 F0: nameMatchesAllTokens matches full name in either order', () => {
  assert.equal(nameMatchesAllTokens('Elena', 'Moretti', 'Elena Moretti'), true);
  assert.equal(nameMatchesAllTokens('Elena', 'Moretti', 'moretti elena'), true);
});

test('016 F0: nameMatchesAllTokens matches a single surname token', () => {
  assert.equal(nameMatchesAllTokens('Mario', 'Rossi', 'Rossi'), true);
});

test('016 F0: nameMatchesAllTokens is false when a token is absent', () => {
  assert.equal(nameMatchesAllTokens('Elena', 'Moretti', 'Elena Bianchi'), false);
  assert.equal(nameMatchesAllTokens('Elena', 'Moretti', ''), false);
});
