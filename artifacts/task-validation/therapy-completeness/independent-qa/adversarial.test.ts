import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readCompletePatientTherapies } from '../../../frontend/src/lib/patientTherapyCalendarRead';
import { completeTherapySnapshot } from '../../../frontend/src/lib/therapyCompleteness';
import { loadAllTherapyPages } from '../../../frontend/src/lib/therapyPages';
import { clearCachedGet } from '../../../frontend/src/lib/cachedFetch';
import { drug } from './native-tests/fixtures.mjs';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearCachedGet(); });
const page = (items: any[], total: number, cursor: string | null) => ({ items,
 summary: { total, active: total, inactive: 0 }, pageInfo: { hasMore: cursor !== null, nextCursor: cursor } });
const read = () => readCompletePatientTherapies('synthetic-patient', new AbortController().signal);

test('QA independently rejects repeat cursor and state counts changing on a second page', async () => {
  let calls = 0;
  globalThis.fetch = (async () => Response.json(page([drug(String(++calls))], 3, 'repeated'))) as typeof fetch;
  await assert.rejects(read(), /Paginazione/); assert.equal(calls, 2);
  calls = 0;
  globalThis.fetch = (async () => Response.json(++calls === 1 ? page([drug('first')], 2, 'next') :
    { ...page([drug('second', { stato: 'sospesa' })], 2, null), summary: null })) as typeof fetch;
  await assert.rejects(read(), /incompleto/);
});
test('QA independently rejects cross-page duplicate ID even when summary unique count matches', async () => {
  let calls = 0;
  globalThis.fetch = (async () => Response.json(++calls === 1 ? page([drug('first')], 2, 'next') :
    { ...page([drug('first'), drug('second')], 2, null), summary: null })) as typeof fetch;
  await assert.rejects(read(), /cambiato/);
});
test('QA abandoned read cannot publish a later ignored-abort response', async () => {
  const abort = new AbortController();
  let finish: (() => void) | undefined;
  globalThis.fetch = (async () => { await new Promise<void>(resolve => { finish = resolve; }); return Response.json(page([drug('first')], 1, null)); }) as typeof fetch;
  const pending = readCompletePatientTherapies('synthetic-patient', abort.signal);
  abort.abort(); finish!();
  await assert.rejects(pending, { name: 'AbortError' });
});
test('QA over-capacity summary fails after one bounded read', async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return Response.json(page([drug('first')], 5001, 'next')); }) as typeof fetch;
  await assert.rejects(read(), /limite/); assert.equal(calls, 1);
});
test('QA print terminal cursor and mixed cache counts fail closed', async () => {
  globalThis.fetch = (async () => Response.json({ ...page([drug('first')], 1, 'unexpected'), pageInfo: { hasMore: false, nextCursor: 'unexpected' } })) as typeof fetch;
  await assert.rejects(() => loadAllTherapyPages('synthetic-patient'), /non valida/);
  const invalid = { therapies: [drug('inactive', { stato: 'sospesa' })], summary: { total: 1, active: 1, inactive: 0 }, nextCursor: null };
  assert.equal(completeTherapySnapshot(invalid, 'synthetic-patient'), undefined);
});
