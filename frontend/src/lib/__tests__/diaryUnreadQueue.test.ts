import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fetchUnreadPatientCounts,
  parseUnreadDiaryPage,
  unreadDiaryAckPath,
  type UnreadDiaryPage,
} from '../diaryUnreadQueue';

const row = {
  id: 'd-1',
  patientId: 'p-1',
  sourceType: 'diary' as const,
  sourceId: 'd-1',
  identity: null,
  entryDateTime: '2026-10-06T09:00',
  authorName: 'Sintetico',
  title: null,
  content: 'Nota sintetica',
  priority: 'urgente' as const,
  status: 'aperta',
  readReceipt: { state: 'unread' as const, readBy: null, isAuthor: false, canAcknowledge: true },
  urgency: { state: 'active' as const, takenBy: null, isAuthor: false, canAcknowledge: true },
};
const page: UnreadDiaryPage = {
  entries: [row],
  totalUnread: 53,
  filteredUnread: 53,
  hasMore: true,
  nextCursor: 'opaque',
  patientCounts: [{ patientId: 'p-1', total: 27 }],
};
test('queue accepts a bounded mixed-source page with exact counts without confusing active urgency with unread', () => {
  assert.deepEqual(parseUnreadDiaryPage(page), page);
  assert.equal(unreadDiaryAckPath(row), '/patients/p-1/diary/d-1/ack');
  assert.equal(
    unreadDiaryAckPath({ ...row, id: 'consegna:c-1', sourceId: 'c-1', sourceType: 'consegna' }),
    '/consegne/c-1/ack',
  );
});
test('malformed, duplicate, mismatched, read or missing-count rows fail closed rather than fabricating zero', () => {
  for (const value of [
    null,
    {},
    { ...page, totalUnread: -1 },
    { ...page, filteredUnread: 54 },
    { ...page, nextCursor: null },
    { ...page, entries: Array(21).fill(row) },
    { ...page, entries: [row, row] },
    { ...page, patientCounts: [] },
    { ...page, patientCounts: [{ patientId: 'other', total: 1 }] },
    { ...page, entries: [{ ...row, sourceType: 'consegna' }] },
    { ...page, entries: [{ ...row, readReceipt: { ...row.readReceipt, state: 'read' } }] },
    { ...page, entries: [{ ...row, entryDateTime: 'not-a-date' }] },
    { ...page, entries: [{ ...row, identity: { id: 'other' } }] },
  ])
    assert.throws(() => parseUnreadDiaryPage(value));
});
test('patient counts client is bounded, private, abortable and missing patients are not coerced to zero', async () => {
  const signal = new AbortController().signal;
  const fetcher = (async (url: string, init: RequestInit) => {
    assert.match(String(url), /diary-unread-patient-counts\?patientIds=p-1%2Cp-2/);
    assert.equal(init.signal, signal);
    assert.equal(init.cache, 'no-store');
    return new Response(JSON.stringify({ items: [{ patientId: 'p-1', total: 27 }] }));
  }) as typeof fetch;
  assert.deepEqual(
    await fetchUnreadPatientCounts('/api', ['p-1', 'p-2'], { headers: {}, signal, fetcher }),
    [{ patientId: 'p-1', total: 27 }],
  );
  for (const ids of [[], ['p-1', 'p-1'], Array.from({ length: 51 }, (_, i) => `p-${i}`)])
    await assert.rejects(fetchUnreadPatientCounts('/api', ids, { headers: {}, fetcher }));
});
test('count transport failure, duplicate ids, negative/string counts and out-of-request ids remain errors', async () => {
  for (const body of [
    {},
    { items: [{ patientId: 'other', total: 1 }] },
    { items: [{ patientId: 'p-1', total: -1 }] },
    { items: [{ patientId: 'p-1', total: '0' }] },
    {
      items: [
        { patientId: 'p-1', total: 1 },
        { patientId: 'p-1', total: 1 },
      ],
    },
  ])
    await assert.rejects(
      fetchUnreadPatientCounts('/api', ['p-1'], {
        headers: {},
        fetcher: (async () => new Response(JSON.stringify(body))) as typeof fetch,
      }),
    );
  await assert.rejects(
    fetchUnreadPatientCounts('/api', ['p-1'], {
      headers: {},
      fetcher: (async () => new Response('{}', { status: 503 })) as typeof fetch,
    }),
  );
});
