// Card Documenti della scheda d'ingresso (ciclo 2b): orchestrazione pura e coda della bozza.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { job as baseJob } from '../../import/__tests__/fixtures';
import type { ImportJob } from '../../import/importSessionTypes';
import {
  AI_READING_TEXT,
  aiFieldPaths,
  checkFiles,
  documentsErrorMessage,
  documentsProgress,
  FIELD_PROPOSALS_PENDING_MESSAGE,
  formatFieldValue,
  mutateWithVersionRetry,
  nextMergeStep,
  pendingFieldProposals,
  rebaseLocalEdits,
  shouldPoll,
} from '../intakeDocuments';
import { editableDraftPatch, VersionedDraftSaveQueue, DraftApiError } from '../intakeDraftApi';
import { intakeProgress } from '../intakeProgress';

type Group = ImportJob['manifest']['groups'][number];
function job(patch: Partial<ImportJob> = {}, groups: Partial<Group>[] = []): ImportJob {
  const base = baseJob(3);
  const value: ImportJob = { ...base, status: 'processing', ...patch };
  value.manifest = {
    ...base.manifest,
    groups: groups.length
      ? groups.map((g, i) => ({ ...base.manifest.groups[0], id: `g${i}`, sortOrder: i, ...g }))
      : base.manifest.groups,
  };
  return value;
}
const reviewReady = (resultHash = 'final-1', conflicts = 0): ImportJob =>
  job(
    {
      status: 'review_ready',
      review: {
        manifestRevision: 3,
        resultHash,
        unresolvedConflicts: conflicts,
        canProceed: conflicts === 0,
        draftId: 'd1',
        draftSourceIsCurrent: false,
      },
    },
    [{ resultHash: 'letter-1' }],
  );

test('PATCH never carries the server-owned AI keys (_fieldOrigin, _fieldProposals, _aiMerge)', () => {
  const draft = {
    anagrafica: { firstName: 'Ada' },
    _accepted: { demographics: true },
    _fieldOrigin: { 'anagrafica.firstName': { by: 'ai', value: 'Ada' } },
    _fieldProposals: [{ id: 'p', path: 'anagrafica.lastName', status: 'pending' }],
    _aiMerge: { final: 'x' },
    _importSource: { manifestRevision: 1, resultHash: 'x' },
  };
  assert.deepEqual(editableDraftPatch(draft), {
    anagrafica: { firstName: 'Ada' },
    _accepted: { demographics: true },
  });
});

test('each letter is merged once per (groupId, resultHash); a new result is a new merge', () => {
  const done = new Set<string>();
  const reading = job({}, [{ resultHash: null }, { resultHash: 'h-b' }]);
  const first = nextMergeStep(reading, {}, done);
  assert.deepEqual(first, {
    kind: 'letter',
    key: 'letter:g1:h-b',
    groupId: 'g1',
    resultHash: 'h-b',
  });
  done.add(first!.key);
  assert.equal(nextMergeStep(reading, {}, done), null);
  // la lettera g0 è pronta, poi g1 cambia risultato (pagina aggiunta): due unioni nuove, in ordine
  const later = job({}, [{ resultHash: 'h-a' }, { resultHash: 'h-b2' }]);
  const a = nextMergeStep(later, {}, done)!;
  assert.equal(a.key, 'letter:g0:h-a');
  done.add(a.key);
  assert.equal(nextMergeStep(later, {}, done)!.key, 'letter:g1:h-b2');
});

test('final merge: once, when the review is ready without conflicts; it supersedes letters', () => {
  const done = new Set<string>();
  const ready = reviewReady();
  const step = nextMergeStep(ready, {}, done);
  assert.deepEqual(step, {
    kind: 'final',
    key: 'final:3:final-1',
    manifestRevision: 3,
    resultHash: 'final-1',
  });
  done.add(step!.key);
  assert.equal(nextMergeStep(ready, {}, done), null);
  // bozza ricaricata dopo una risposta persa: _aiMerge.final dice che l'unione è già avvenuta
  assert.equal(nextMergeStep(ready, { _aiMerge: { final: 'final-1' } }, new Set()), null);
  // con informazioni discordanti non c'è unione finale: restano le unioni per lettera
  assert.equal(nextMergeStep(reviewReady('final-1', 2), {}, new Set())!.kind, 'letter');
});

test('polling only with a job, while reading or while a merge is still due', () => {
  assert.equal(shouldPoll(null, {}, new Set()), false);
  assert.equal(shouldPoll(job(), {}, new Set()), true);
  assert.equal(shouldPoll(reviewReady(), {}, new Set()), true);
  assert.equal(shouldPoll(reviewReady(), { _aiMerge: { final: 'final-1' } }, new Set()), false);
  assert.equal(shouldPoll(job({ status: 'uploaded' }), {}, new Set()), false);
  assert.equal(shouldPoll(job({ status: 'cancelled' }), {}, new Set(['x'])), false);
});

test('progress: "N/M pagine lette", the AI sentence while reading, M/M at the end', () => {
  const reading = job();
  reading.progress = { ...reading.progress, totalPages: 1, completedPages: 0, totalGroups: 1 };
  const p = documentsProgress(reading);
  assert.equal(p.label, '0/1 pagine lette');
  assert.equal(p.status, AI_READING_TEXT);
  assert.equal(p.reading, true);
  const done = reviewReady();
  done.progress = {
    ...done.progress,
    totalPages: 4,
    completedPages: 4,
    totalGroups: 1,
    completedGroups: 1,
  };
  const end = documentsProgress(done, { _aiMerge: { final: 'final-1' } });
  assert.equal(end.label, '4/4 pagine lette');
  assert.equal(end.percent, 100);
  assert.match(end.status, /Lettura completata/);
  assert.equal(documentsProgress(null).label, '0/0 pagine lette');
});

test('AI fields: only values still equal to what the AI wrote (operator edits drop the style)', () => {
  const data = {
    anagrafica: { firstName: 'Teresa ', lastName: 'Rossi', phone: '333' },
    diagnosi: [{ id: 'new-id', descrizione: 'Scompenso' }],
    _fieldOrigin: {
      'anagrafica.firstName': { by: 'ai', value: 'Teresa' },
      'anagrafica.lastName': { by: 'ai', value: 'Galli' },
      'anagrafica.phone': { by: 'operator', value: '333' },
      diagnosi: { by: 'ai', value: [{ id: 'other', descrizione: 'Scompenso' }] },
    },
  };
  assert.deepEqual([...aiFieldPaths(data)].sort(), ['anagrafica.firstName', 'diagnosi']);
});

test('field proposals: pending only, in form order; values shown whole, never truncated', () => {
  const long = 'Anamnesi '.repeat(200).trim();
  const data = {
    _fieldProposals: [
      { id: 'a', path: 'anamnesi.patologicaRemota', value: long, status: 'pending' },
      { id: 'b', path: 'anagrafica.lastName', value: 'Galli', status: 'pending' },
      { id: 'c', path: 'anagrafica.firstName', value: 'X', status: 'kept' },
    ],
  };
  const list = pendingFieldProposals(data);
  assert.deepEqual(
    list.map((p) => p.id),
    ['b', 'a'],
  );
  assert.equal(formatFieldValue(list[1].path, list[1].value), long);
  assert.equal(formatFieldValue('anagrafica.dateOfBirth', '1939-02-05'), '05/02/1939');
  assert.equal(
    formatFieldValue('allergie', [
      { allergene: 'Penicillina', reazione: 'orticaria' },
      { allergene: 'Lattice' },
    ]),
    'Penicillina (orticaria); Lattice',
  );
  assert.equal(formatFieldValue('allergieStatus', 'assenti'), 'Nessuna allergia');
  assert.match(FIELD_PROPOSALS_PENDING_MESSAGE(2), /le 2 proposte/);
});

test('create is blocked while field proposals are open, with the reason in the missing list', () => {
  const { missing } = intakeProgress({
    _fieldProposals: [{ id: 'p', path: 'anagrafica.lastName', value: 'Galli', status: 'pending' }],
  });
  const step = missing.find((m) => m.kind === 'fieldProposals');
  assert.equal(step?.label, 'Una proposta dei documenti da decidere');
  assert.equal(
    intakeProgress({ _fieldProposals: [{ id: 'p', path: 'x', status: 'applied' }] }).missing.some(
      (m) => m.kind === 'fieldProposals',
    ),
    false,
  );
});

test('reloaded draft keeps what the operator is typing and takes the AI values elsewhere', () => {
  const base = { anagrafica: { firstName: '', phone: '' }, _accepted: { demographics: false } };
  const local = {
    anagrafica: { firstName: '', phone: '333 1' },
    _accepted: { demographics: false },
  };
  const server = {
    anagrafica: { firstName: 'Teresa', phone: '' },
    _accepted: { demographics: false },
    _fieldOrigin: { 'anagrafica.firstName': { by: 'ai', value: 'Teresa' } },
  };
  const { data, dirty } = rebaseLocalEdits(base, local, server);
  assert.deepEqual(data.anagrafica, { firstName: 'Teresa', phone: '333 1' });
  assert.deepEqual(data._fieldOrigin, server._fieldOrigin);
  assert.equal(dirty, true);
  // nessuna modifica locale: vince il server, niente da salvare
  const clean = rebaseLocalEdits(server, server, { ...server, diagnosi: ['x'] });
  assert.deepEqual(clean.data.diagnosi, ['x']);
  assert.equal(clean.dirty, false);
  // campo scritto in contemporanea: resta quello dell'operatore (il server ne farà una proposta)
  const race = rebaseLocalEdits(
    base,
    { ...base, anagrafica: { firstName: 'Tere', phone: '' } },
    server,
  );
  assert.equal((race.data.anagrafica as { firstName: string }).firstName, 'Tere');
});

test('version conflict: reload and repeat once with a fresh request id; skip when already done', async () => {
  const calls: [number | undefined, string][] = [];
  let reloads = 0;
  let key = 0;
  const conflict = new DraftApiError('cambiata', 409, 'draft_version_conflict');
  const res = await mutateWithVersionRetry({
    version: 4,
    run: async (v, id) => {
      calls.push([v, id]);
      if (calls.length === 1) throw conflict;
      return { version: 6, data: {} };
    },
    reload: async () => {
      reloads++;
      return { version: 5, data: {} };
    },
    newKey: () => `k${++key}`,
  });
  assert.deepEqual(calls, [
    [4, 'k1'],
    [5, 'k2'],
  ]);
  assert.equal(reloads, 1);
  assert.equal(res.version, 6);
  // seconda contesa: nessuna terza richiesta
  let runs = 0;
  await assert.rejects(
    mutateWithVersionRetry({
      version: 1,
      run: async () => {
        runs++;
        throw conflict;
      },
      reload: async () => ({ version: 2, data: {} }),
      newKey: () => 'k',
    }),
    /cambiata/,
  );
  assert.equal(runs, 2);
  // unione finale già presente nella bozza ricaricata: non si ripete
  runs = 0;
  const skipped = await mutateWithVersionRetry({
    version: 1,
    run: async () => {
      runs++;
      throw conflict;
    },
    reload: async () => ({ version: 2, data: { _aiMerge: { final: 'h' } } }),
    skip: (fresh) => (fresh.data?._aiMerge as { final?: string }).final === 'h',
    newKey: () => 'k',
  });
  assert.equal(runs, 1);
  assert.equal(skipped.version, 2);
  // altri errori: nessuna ricarica
  await assert.rejects(
    mutateWithVersionRetry({
      version: 1,
      run: async () => {
        throw new DraftApiError('no', 400, 'invalid_input');
      },
      reload: async () => assert.fail('reload'),
      newKey: () => 'k',
    }),
    /no/,
  );
});

test('job errors become clear Italian messages (cost guard, invalid file, network)', () => {
  assert.match(
    documentsErrorMessage({ status: 429, message: 'Troppe richieste' }),
    /limite di letture AI/,
  );
  assert.match(documentsErrorMessage(new TypeError('Failed to fetch')), /Connessione/);
  assert.match(documentsErrorMessage({ status: 400, code: 'invalid_files' }), /File non valido/);
  assert.match(documentsErrorMessage({ status: 503 }), /non ha risposto/);
  const { accepted, problems } = checkFiles(
    [
      new File(['x'], 'foto.heic', { type: 'image/heic' }),
      new File([new Uint8Array(20)], 'grande.pdf', { type: 'application/pdf' }),
      new File(['ok'], 'pagina.jpg', { type: 'image/jpeg' }),
    ],
    { maxFileBytes: 10, acceptedMimeTypes: ['application/pdf', 'image/jpeg'], maxPages: 30 },
    0,
  );
  assert.deepEqual(
    accepted.map((f) => f.name),
    ['pagina.jpg'],
  );
  assert.equal(problems.length, 2);
  assert.match(
    checkFiles([new File(['ok'], 'p.jpg', { type: 'image/jpeg' })], baseJob().limits, 30)
      .problems[0],
    /Limite di 30 pagine/,
  );
});

test('draft writes are serialized: a merge waits for the autosave and the next save reads the latest draft', async () => {
  const order: string[] = [];
  const patches: Record<string, unknown>[] = [];
  let version = 1;
  globalThis.fetch = (async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    order.push(`patch@${body.expectedDraftVersion}`);
    patches.push(body);
    await new Promise((r) => setTimeout(r, 5));
    const { expectedDraftVersion: _v, ...data } = body;
    void _v;
    version += 1;
    return new Response(JSON.stringify({ id: 'd', version, data }), { status: 200 });
  }) as typeof fetch;
  const queue = new VersionedDraftSaveQueue('d', 1);
  let current: Record<string, unknown> = { anagrafica: { phone: '1' } };
  const saving = queue.save(() => current);
  const merging = queue.exclusive(async (v) => {
    order.push(`merge@${v}`);
    version = (v ?? 0) + 1;
    current = { anagrafica: { phone: '1', firstName: 'Teresa' } };
    return { id: 'd', version, data: current };
  });
  const later = queue.save(() => current);
  await Promise.all([saving, merging, later]);
  assert.deepEqual(order, ['patch@1', 'merge@2', 'patch@3']);
  assert.deepEqual(patches[1].anagrafica, { phone: '1', firstName: 'Teresa' });
  assert.equal(queue.version, 4);
});
