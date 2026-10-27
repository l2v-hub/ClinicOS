// Run only on the explicitly owned disposable SQL database; no real provider or clinical data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import intakeDraftsRouter from '../../routes/intake-drafts.js';
import { mutateLinkedDraft } from '../../ai/upload/pages/draft-mutations.js';
import { controlChar } from '../../lib/codice-fiscale.js';

const suffix = randomUUID().slice(0, 8);
const owner = `TEST-IDENTITY-${suffix}`;
const prefix = `test-identity-${suffix}-`;
const reviewedIdentity = {
  firstName: 'Mario',
  lastName: 'Rossi',
  dateOfBirth: '1980-01-01',
  codiceFiscale: 'RSSMRA80A01H501U',
};
let server: Server;
let base: string;

function assertDisposableIdentityDatabase(environment: NodeJS.ProcessEnv) {
  assert.equal(environment.NODE_ENV, 'test');
  assert.doesNotMatch(environment.DATABASE_URL ?? '', /railway|production/i);
  const database = new URL(environment.DATABASE_URL ?? '');
  assert.ok(
    ['127.0.0.1', 'localhost', 'postgres'].includes(database.hostname),
    'disposable local/service database required',
  );
  if (environment.CLINICOS_OWNED_GUARD_SQL === '1') {
    assert.equal(database.hostname, '127.0.0.1');
    assert.equal(database.pathname, '/clinicos_516_guard');
    assert.ok(Number(database.port) >= 1024, 'owned database requires an explicit ephemeral port');
    assert.notEqual(database.port, '5432', 'never use the pre-existing local postgres');
  } else {
    assert.equal(environment.CI, 'true', 'explicit disposable harness required');
    // The trusted native verification wrapper intentionally omits GITHUB_ACTIONS.
    // It supplies this fixed synthetic test URL, not deployment credentials.
    const nativeVerification =
      database.href === 'postgresql://postgres:postgres@127.0.0.1:5432/clinicos_test?schema=public';
    assert.ok(
      environment.GITHUB_ACTIONS === 'true' || nativeVerification,
      'only the owned local harness, GitHub CI service or exact native test runtime',
    );
  }
}

before(async () => {
  assertDisposableIdentityDatabase(process.env);
  const app = express();
  app.use(express.json());
  app.use('/intake/drafts', intakeDraftsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address === 'object');
      base = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});
after(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  await cleanup();
  await prisma.$disconnect();
});
async function cleanup() {
  await prisma.patientIntakeDraft.deleteMany({ where: { createdById: { startsWith: owner } } });
  await prisma.importJob.deleteMany({ where: { id: { startsWith: prefix } } });
}
beforeEach(cleanup);
async function source(label: string, actor = owner) {
  return prisma.importJob.create({
    data: {
      id: prefix + label,
      createdById: actor,
      status: 'review_ready',
      manifest: {},
      maxFiles: 5,
      maxTotalBytes: 10_000_000,
      expiresAt: new Date('2099-01-01T00:00:00Z'),
      resultData: {
        _narrative: { ...reviewedIdentity, fiscalCode: reviewedIdentity.codiceFiscale },
      },
    },
  });
}
async function call(method: string, path: string, body?: unknown, actor = owner) {
  const response = await fetch(`${base}/intake/drafts${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Operator-Id': actor,
      'X-Operator-Role': 'operator',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, any> };
}
async function seed(jobId: string, identity: unknown = reviewedIdentity, actor = owner) {
  return call('POST', '/from-import', { importJobId: jobId, reviewedIdentity: identity }, actor);
}
async function saved(data: Record<string, unknown>, label: string, importJobId?: string) {
  return prisma.patientIntakeDraft.create({
    data: {
      id: prefix + label,
      createdById: owner,
      status: 'draft',
      source: importJobId ? 'import' : 'manual',
      importJobId,
      data: data as object,
    },
  });
}
const alternative15 = 'RSSMRA80A01H50M';
const alternative = {
  ...reviewedIdentity,
  codiceFiscale: alternative15 + controlChar(alternative15),
};
test('two jobs for the same reviewed identity create exactly one open practice under concurrent HTTP', async () => {
  const a = await source('one'),
    b = await source('two');
  const results = await Promise.all([seed(a.id), seed(b.id)]);
  const drafts = await prisma.patientIntakeDraft.findMany({
    where: { createdById: owner, status: 'draft' },
  });
  assert.equal(drafts.length, 1, 'Concurrent different jobs must not create a second practice');
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const rejected = results.find((r) => r.status === 409)!;
  assert.equal(rejected.body.code, 'existing_intake_draft');
  assert.equal(rejected.body.candidates.length, 1);
  assert.equal(rejected.body.candidates[0].id, drafts[0].id);
  const replay = await seed(drafts[0].importJobId!);
  assert.equal(replay.status, 201);
  assert.equal(replay.body.id, drafts[0].id);
  assert.equal(await prisma.importJob.count({ where: { id: { startsWith: prefix } } }), 2);
});

test('reviewed corrections and explicit blanks are persisted before duplicate detection; legacy absent DTO stays compatible', async () => {
  const first = await source('original');
  assert.equal((await seed(first.id)).status, 201);
  const corrected = await source('corrected');
  const created = await seed(corrected.id, alternative);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.data.anagrafica.codiceFiscale, alternative.codiceFiscale);
  assert.equal(
    created.body.data._narrative.fiscalCode,
    reviewedIdentity.codiceFiscale,
    'original OCR remains immutable',
  );
  const cleared = await source('cleared');
  const blank = { firstName: '', lastName: '', dateOfBirth: '', codiceFiscale: '' };
  const result = await seed(cleared.id, blank);
  assert.equal(result.status, 201);
  for (const key of Object.keys(blank)) assert.equal(result.body.data.anagrafica[key], '');
  const legacy = await source('legacy');
  const conflict = await call('POST', '/from-import', { importJobId: legacy.id });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'existing_intake_draft');
});

test('a shared CF with contradictory or incomplete demographics refuses without candidate leakage or source writes', async () => {
  const first = await source('original');
  await seed(first.id);
  const next = await source('conflicting');
  const before = await prisma.importJob.findUniqueOrThrow({ where: { id: next.id } });
  for (const identity of [
    { ...reviewedIdentity, firstName: 'Altro' },
    { ...reviewedIdentity, dateOfBirth: '' },
  ]) {
    const response = await seed(next.id, identity);
    assert.equal(response.status, 409);
    assert.equal(response.body.code, 'intake_identity_conflict');
    assert.equal(response.body.candidates, undefined);
    assert.equal(response.body.draft, undefined);
  }
  assert.equal(
    (await seed(next.id, { ...reviewedIdentity, createdById: owner + '-other' })).status,
    400,
  );
  assert.deepEqual(await prisma.importJob.findUniqueOrThrow({ where: { id: next.id } }), before);
  assert.equal(await prisma.patientIntakeDraft.count({ where: { createdById: owner } }), 1);
});

test('homonyms without valid CF remain progressive; owners and closed drafts never become another owner candidate', async () => {
  for (const [label, code] of [
    ['empty', ''],
    ['invalid', 'RSSMRA80A01H501A'],
  ]) {
    const response = await seed((await source(label)).id, {
      ...reviewedIdentity,
      codiceFiscale: code,
    });
    assert.equal(response.status, 201);
  }
  const first = await seed((await source('own')).id);
  assert.equal(first.status, 201);
  const other = owner + '-other';
  const independent = await seed((await source('other', other)).id, reviewedIdentity, other);
  assert.equal(independent.status, 201);
  assert.equal((await call('GET', '/' + first.body.id, undefined, other)).status, 404);
  assert.equal((await seed(prefix + 'other', reviewedIdentity, owner)).status, 404);
  await prisma.patientIntakeDraft.update({
    where: { id: first.body.id },
    data: { status: 'confirmed' },
  });
  assert.equal((await seed((await source('after-closed')).id)).status, 201);
});

test('legacy duplicates require an explicit choice and allow non-identity edits without changing the other practice', async () => {
  const data = { anagrafica: reviewedIdentity, clinical: { choice: 'retained' } };
  const a = await saved(data, 'historical-a'),
    b = await saved(data, 'historical-b');
  const response = await seed((await source('third')).id);
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'ambiguous_intake_drafts');
  assert.deepEqual(
    new Set(response.body.candidates.map((x: { id: string }) => x.id)),
    new Set([a.id, b.id]),
  );
  assert.equal(await prisma.patientIntakeDraft.count({ where: { createdById: owner } }), 2);
  const update = await call('PATCH', '/' + a.id, {
    notes: 'operator choice',
    expectedDraftVersion: 0,
  });
  assert.equal(update.status, 200);
  assert.deepEqual(update.body.data.anagrafica, reviewedIdentity);
  assert.deepEqual(await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: b.id } }), b);
});

test('two concurrent manual patches cannot introduce the same strong identity and the losing draft is untouched', async () => {
  const original = { clinical: { retained: 'operator entry' } };
  const a = await saved(original, 'manual-a'),
    b = await saved(original, 'manual-b');
  const results = await Promise.all(
    [a, b].map((draft) =>
      call('PATCH', '/' + draft.id, { anagrafica: reviewedIdentity, expectedDraftVersion: 0 }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const loser = [a, b][results.findIndex((r) => r.status === 409)];
  assert.deepEqual(
    await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: loser.id } }),
    loser,
  );
});

test('an import seed racing a manual patch uses the same guard and preserves the unlinked new source', async () => {
  const manual = await saved({ notes: 'unsaved identity, retained clinical entry' }, 'manual');
  const job = await source('new-import');
  const originalJob = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  const results = await Promise.all([
    seed(job.id),
    call('PATCH', '/' + manual.id, { anagrafica: reviewedIdentity, expectedDraftVersion: 0 }),
  ]);
  assert.equal(results.filter((r) => r.status === 409).length, 1);
  assert.equal(results.filter((r) => r.status === 200 || r.status === 201).length, 1);
  const identified = await prisma.patientIntakeDraft.findMany({
    where: {
      createdById: owner,
      data: { path: ['anagrafica', 'codiceFiscale'], equals: reviewedIdentity.codiceFiscale },
    },
  });
  assert.equal(identified.length, 1);
  assert.deepEqual(
    await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } }),
    originalJob,
  );
  if (results[1].status === 409)
    assert.deepEqual(
      await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: manual.id } }),
      manual,
    );
});

test('linked mutations and manual patches serialize across different rows; rejected mutation rolls back JSON and receipts', async () => {
  const job = await source('linked');
  await prisma.importJob.update({
    where: { id: job.id },
    data: { manifest: { version: 1, groups: [], pages: [] }, status: 'uploaded' },
  });
  const linked = await saved({ notes: 'keep linked data' }, 'linked', job.id);
  const manual = await saved({ notes: 'keep manual data' }, 'manual');
  const mutation = mutateLinkedDraft(
    linked.id,
    { expectedDraftVersion: 0, requestId: 'identity-' + suffix },
    'synthetic-identity-test',
    {},
    ({ existing }) => ({ ...existing, anagrafica: reviewedIdentity }),
  );
  const [mutated, patched] = await Promise.allSettled([
    mutation,
    call('PATCH', '/' + manual.id, { anagrafica: reviewedIdentity, expectedDraftVersion: 0 }),
  ]);
  assert.equal(patched.status, 'fulfilled');
  if (patched.status !== 'fulfilled') return;
  if (mutated.status === 'fulfilled') {
    assert.equal(patched.value.status, 409);
    assert.deepEqual(
      await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: manual.id } }),
      manual,
    );
  } else {
    assert.equal(patched.value.status, 200);
    assert.equal(mutated.reason.code, 'existing_intake_draft');
    assert.deepEqual(
      await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: linked.id } }),
      linked,
    );
    assert.equal(await prisma.importMutation.count({ where: { jobId: job.id } }), 0);
  }
});

test('in-place linked identity proposals are guarded against their pre-change identity and refusal leaves every byte intact', async () => {
  await saved({ anagrafica: reviewedIdentity }, 'existing');
  const job = await source('linked');
  await prisma.importJob.update({
    where: { id: job.id },
    data: { manifest: { version: 1, groups: [], pages: [] }, status: 'uploaded' },
  });
  const linked = await saved({ anagrafica: {}, notes: 'retained' }, 'linked', job.id);
  const original = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  await assert.rejects(
    mutateLinkedDraft(
      linked.id,
      { expectedDraftVersion: 0, requestId: 'in-place-' + suffix },
      'synthetic-in-place-test',
      {},
      ({ existing }) => {
        Object.assign(existing.anagrafica as object, reviewedIdentity);
        return existing;
      },
    ),
    { code: 'existing_intake_draft' },
  );
  assert.deepEqual(
    await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: linked.id } }),
    linked,
  );
  assert.deepEqual(await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } }), original);
  assert.equal(await prisma.importMutation.count({ where: { jobId: job.id } }), 0);
});

test('page-source checks and draft versions run before identity writes; corrected seed retains original source and failed patch is atomic', async () => {
  await saved({ anagrafica: reviewedIdentity }, 'historical');
  const job = await source('page');
  const pair = { manifestRevision: 3, resultHash: 'synthetic-identity-page-review' };
  const result = {
    _source: pair,
    _narrative: { ...reviewedIdentity, fiscalCode: reviewedIdentity.codiceFiscale },
    _groups: [],
    _conflicts: [],
    _review: { decisions: [], unresolvedConflictIds: [] },
    anagrafica: {
      nome: { value: 'Mario' },
      cognome: { value: 'Rossi' },
      dataNascita: { value: '1980-01-01' },
    },
    cartella: { codiceFiscale: { value: reviewedIdentity.codiceFiscale } },
  };
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      manifest: { version: 1, groups: [], pages: [] },
      manifestRevision: 3,
      resultData: result,
    },
  });
  const originalJob = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } });
  const missing = await seed(job.id, alternative);
  assert.equal(missing.status, 409);
  assert.equal(missing.body.code, 'import_review_outdated');
  const stale = await call('POST', '/from-import', {
    importJobId: job.id,
    ...pair,
    manifestRevision: 2,
    reviewedIdentity: alternative,
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'import_review_outdated');
  assert.deepEqual(
    await prisma.importJob.findUniqueOrThrow({ where: { id: job.id } }),
    originalJob,
  );
  const valid = await call('POST', '/from-import', {
    importJobId: job.id,
    ...pair,
    reviewedIdentity: alternative,
  });
  assert.equal(valid.status, 201, JSON.stringify(valid.body));
  assert.equal(valid.body.data.anagrafica.codiceFiscale, alternative.codiceFiscale);
  assert.equal(valid.body.data._importSource.resultHash, pair.resultHash);
  assert.deepEqual(valid.body.data._narrative, result._narrative);
  const before = await prisma.patientIntakeDraft.findUniqueOrThrow({
    where: { id: valid.body.id },
  });
  const version = await call('PATCH', '/' + before.id, {
    anagrafica: reviewedIdentity,
    expectedDraftVersion: 9,
  });
  assert.equal(version.status, 409);
  assert.equal(version.body.code, 'draft_version_conflict');
  const refused = await call('PATCH', '/' + before.id, {
    anagrafica: reviewedIdentity,
    expectedDraftVersion: 0,
  });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'existing_intake_draft');
  assert.deepEqual(
    await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: before.id } }),
    before,
  );
  assert.equal(await prisma.importMutation.count({ where: { jobId: job.id } }), 0);
  const replay = await call('POST', '/from-import', {
    importJobId: job.id,
    ...pair,
    reviewedIdentity,
  });
  assert.equal(replay.status, 201);
  assert.equal(replay.body.id, before.id);
  assert.equal(replay.body.data.anagrafica.codiceFiscale, alternative.codiceFiscale);
});
