import assert from 'node:assert/strict';
import test from 'node:test';
import { ImportReviewHandoff } from '../importReviewHandoff';
import { job, json } from './fixtures';
import type { DraftResponse } from '../../intake/intakeDraftApi';

const source = { manifestRevision: 3, resultHash: 'synthetic-result' };
const review = {
  patient: { firstName: 'Manual', lastName: 'Review', dateOfBirth: '' },
  cartella: {
    documentSections: [{ rawText: 'Synthetic OCR', reviewedText: 'Reviewed section' }],
    _allergyNarrative: { text: 'Reviewed allergy' },
  },
};

for (const failure of ['create-response', 'patch-precommit', 'patch-response'] as const) {
  test(`first handoff retains reviewed values after ${failure} loss and a retry`, async () => {
    const previous = globalThis.fetch;
    const handoff = new ImportReviewHandoff();
    let draft: DraftResponse | null = null;
    let failing = true;
    const patches: Record<string, unknown>[] = [];
    let creates = 0;
    const api = {
      async get() {
        const value = job(3);
        value.review.draftId = draft?.id ?? null;
        value.review.draftSourceIsCurrent = true;
        return value;
      },
    };
    try {
      globalThis.fetch = (async (_url, init) => {
        if (init?.method === 'POST') {
          creates++;
          draft = { id: 'synthetic-draft', version: 0, data: { anagrafica: { firstName: 'OCR' } } };
          if (failing && failure === 'create-response') throw new TypeError('lost response');
        } else if (init?.method === 'PATCH') {
          const { expectedDraftVersion, ...patch } = JSON.parse(init.body as string);
          assert.equal(expectedDraftVersion, 0);
          patches.push(patch);
          if (failing && failure === 'patch-precommit') throw new TypeError('offline');
          draft = { ...draft!, version: 1, data: { ...draft!.data, ...patch } };
          if (failing && failure === 'patch-response') throw new TypeError('lost response');
        } else if (failing) throw new TypeError('recovery GET offline');
        return json(draft);
      }) as typeof fetch;
      await assert.rejects(handoff.complete('job-one', source, {}, api, review));
      assert.equal(handoff.pending, true);
      failing = false;
      const recovered = await handoff.complete('job-one', source, {}, api);
      assert.equal(recovered.draftId, 'synthetic-draft');
      assert.equal((draft!.data.anagrafica as Record<string, unknown>).firstName, 'Manual');
      assert.deepEqual(draft!.data.documentSections, review.cartella.documentSections);
      assert.deepEqual(draft!.data._allergyNarrative, review.cartella._allergyNarrative);
      assert.equal(draft!.version, 1);
      assert.equal(creates, 1);
      if (failure === 'patch-precommit') assert.deepEqual(patches[0], patches[1]);
      assert.equal(handoff.pending, false);
    } finally {
      globalThis.fetch = previous;
    }
  });
}

test('opening a pre-existing draft never reseeds it from an unrelated review', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      throw new Error('No draft write expected');
    }) as typeof fetch;
    const existing = job();
    existing.review.draftId = 'existing';
    existing.review.draftSourceIsCurrent = true;
    const completed = await new ImportReviewHandoff().complete(
      'job-one',
      source,
      {},
      {
        get: async () => existing,
      },
      review,
    );
    assert.equal(completed.draftId, 'existing');
  } finally {
    globalThis.fetch = previous;
  }
});

test('recovery preserves a concurrently edited draft and refuses a different source', async () => {
  const previous = globalThis.fetch;
  const handoff = new ImportReviewHandoff();
  let linked = false;
  const api = {
    async get() {
      const value = job(3);
      value.review.draftId = linked ? 'draft' : null;
      value.review.draftSourceIsCurrent = true;
      return value;
    },
  };
  try {
    globalThis.fetch = (async (_, init) => {
      if (init?.method === 'POST') {
        linked = true;
        throw new TypeError('lost response');
      }
      assert.equal(init?.method, 'GET');
      return json({ id: 'draft', version: 2, data: { anagrafica: { firstName: 'Concurrent' } } });
    }) as typeof fetch;
    await assert.rejects(handoff.complete('job-one', source, {}, api, review));
    await assert.rejects(
      handoff.complete('job-one', { ...source, resultHash: 'changed' }, {}, api),
      /fonte è cambiata/,
    );
    assert.equal((await handoff.complete('job-one', source, {}, api)).draftId, 'draft');
    assert.equal(handoff.pending, false);
  } finally {
    globalThis.fetch = previous;
  }
});
