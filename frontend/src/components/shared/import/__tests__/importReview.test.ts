import assert from 'node:assert/strict';
import test from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImportConflictReview } from '../ImportConflictReview';
import {
  completeConflictDecisions,
  effectiveImportSections,
  reviewedDraftPatch,
} from '../importReviewModel';
import { ImportSourceCache } from '../importSourceCache';
import { result } from './fixtures';

test('each current conflict needs an explicit valid decision, including defer; stale/duplicate decisions fail', () => {
  const value = result();
  assert.equal(completeConflictDecisions(value, []), false);
  assert.equal(
    completeConflictDecisions(value, [
      { conflictId: 'conflict', action: 'select', candidateId: 'one' },
    ]),
    true,
  );
  assert.equal(
    completeConflictDecisions(value, [{ conflictId: 'conflict', action: 'defer' }]),
    true,
  );
  assert.equal(
    completeConflictDecisions(value, [
      { conflictId: 'conflict', action: 'select', candidateId: 'missing' },
    ]),
    false,
  );
  assert.equal(completeConflictDecisions(value, [{ conflictId: 'stale', action: 'defer' }]), false);
  assert.equal(
    completeConflictDecisions(value, [
      { conflictId: 'conflict', action: 'defer' },
      { conflictId: 'conflict', action: 'defer' },
    ]),
    false,
  );
});
test('conflict surface shows both values and sources without a default selection', () => {
  Object.assign(globalThis, { React });
  const html = renderToStaticMarkup(
    createElement(ImportConflictReview, {
      result: result(),
      busy: false,
      onSave: async () => {},
      onOpenPage: () => {},
      onDirty: () => {},
    }),
  );
  for (const text of [
    'alpha',
    'beta',
    'Lettera A',
    'Lettera B',
    'Originale p. 2',
    'Lascia da verificare',
  ])
    assert.ok(html.includes(text));
  assert.ok(!html.includes('checked=""'));
  assert.match(html, /disabled=""/);
});
test('review still prefers narrative text and persists edited sections separately from source', () => {
  const value = result();
  value._sections = {
    sections: [{ sectionKey: 'ANAMNESIS', rawText: 'source' }],
    allergies: { status: 'not_documented' },
  };
  assert.equal(effectiveImportSections(value).sections[0].rawText, 'source');
  const sections = [{ rawText: 'original', reviewedText: 'manual correction' }];
  const patch = reviewedDraftPatch(
    { anagrafica: { careOwner: 'retained' } },
    { firstName: 'Test', lastName: 'Patient', dateOfBirth: '' },
    { documentSections: sections },
  );
  assert.equal(patch.anagrafica.careOwner, 'retained');
  assert.deepEqual(patch.documentSections, sections);
  assert.ok(!('_importSource' in patch));
});
test('authenticated original cache downloads one immutable document once, cleans URLs and evicts replaced source', async () => {
  let calls = 0;
  const options: RequestInit[] = [];
  const cache = new ImportSourceCache(
    async (path, init) => {
      calls++;
      assert.equal(path, '/jobs/id/files/doc/content');
      options.push(init!);
      return new Response(new Blob(['original'], { type: 'application/pdf' }));
    },
    '/jobs/id',
    100,
  );
  const document = {
    id: 'doc',
    filename: 'duplicate.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 8,
    pageCount: 3,
    contentUrl: '',
  };
  cache.retain([document]);
  const [one, two] = await Promise.all([cache.blob(document), cache.blob(document)]);
  assert.equal(one, two);
  assert.equal(calls, 1);
  assert.equal(options[0].cache, 'no-store');
  assert.ok(options[0].signal);
  const url = await cache.url(document);
  assert.equal(await (await fetch(url)).text(), 'original');
  cache.retain([]);
  await assert.rejects(fetch(url));
  assert.throws(() => cache.blob(document), /sostituito/);
  cache.clear();
});
test('failed source fetch can be retried and an oversized original is refused', async () => {
  let calls = 0;
  const cache = new ImportSourceCache(
    async () => {
      if (++calls === 1) return new Response('', { status: 503 });
      return new Response('long source');
    },
    '/jobs/id',
    3,
  );
  const document = {
    id: 'doc',
    filename: 'x',
    mimeType: 'image/jpeg',
    sizeBytes: 3,
    pageCount: 1,
    contentUrl: '',
  };
  await assert.rejects(cache.blob(document), /non disponibile/);
  await assert.rejects(cache.blob(document), /limite/);
  assert.equal(calls, 2);
  cache.clear();
});
