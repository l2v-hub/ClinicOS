import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHandoverOverview } from '../handoverOverviewResponse';
import { criticalHandoverCount, handoverPreview } from '../handoverPreview';
import { legacyReadTraces, postUrgencyAck } from '../urgency';
import type { ConsegnaOverview } from '../../types';
import { identityHandover } from '../../components/operator/__tests__/operationalIdentity.fixtures';

const valid = () => ({ scope: 'operator',
  summary: { total: 20, urgentActive: 12, urgentTaken: 3 },
  recentPreview: [identityHandover], urgentPreview: [], byOperator: { reader: 12 },
});

test('boundary accepts current exact aggregates; empty preview does not imply zero', () => {
  assert.equal(criticalHandoverCount(parseHandoverOverview(valid()), 'ready'), 12);
  assert.equal(criticalHandoverCount(parseHandoverOverview({ ...valid(), recentPreview: [] }), 'ready'), 12);
});

test('legacy open/status counters cannot become shared unread critical counts', () => {
  const legacy = { scope: 'operator', summary: { total: 20, open: 20, urgentOpen: 12 },
    openPreview: [identityHandover], urgentPreview: [], byOperator: {} };
  assert.throws(() => parseHandoverOverview(legacy), /incompatible/);
  assert.doesNotThrow(() => handoverPreview(legacy as unknown as ConsegnaOverview));
  assert.equal(criticalHandoverCount(legacy as unknown as ConsegnaOverview, 'ready'), null);
});

test('malformed summary, arrays, rows and counts are rejected at the API boundary', () => {
  for (const bad of [null, [], {}, { ...valid(), summary: undefined },
    { ...valid(), summary: { total: 1, urgentActive: -1, urgentTaken: 0 } },
    { ...valid(), recentPreview: null }, { ...valid(), urgentPreview: {} },
    { ...valid(), recentPreview: [null] },
    { ...valid(), recentPreview: [{ ...identityHandover, pazienteNome: {} }] },
    { ...valid(), recentPreview: [{ ...identityHandover, urgency: { state: 'taken' } }] },
    { ...valid(), byOperator: { reader: '12' } },
  ]) assert.throws(() => parseHandoverOverview(bad), /incompatible/);
  assert.equal(criticalHandoverCount({} as ConsegnaOverview, 'ready'), null);
});

test('personal legacy acknowledgement cannot be reported as shared success', async () => {
  const fetcher = async () => new Response(JSON.stringify({
    created: true, acknowledgedByMe: true, acknowledgements: [],
  }), { status: 201 });
  await assert.rejects(postUrgencyAck('/synthetic/ack', {}, fetcher as typeof fetch), /condivisa/);
});

test('successful shared acknowledgement requires actual reader and a valid timestamp', async () => {
  const takenBy = { operatorName: 'Collega Test', operatorRole: 'infermiere',
    acknowledgedAt: '2026-10-03T16:35:00Z', byMe: true };
  const reply = (reader: unknown) => ({ created: true,
    urgency: { state: 'taken', takenBy: reader, isAuthor: false, canAcknowledge: false } });
  for (const reader of [null, { ...takenBy, operatorName: '' },
    { ...takenBy, acknowledgedAt: '?' }]) {
    await assert.rejects(postUrgencyAck('/synthetic/ack', {}, (async () =>
      new Response(JSON.stringify(reply(reader)), { status: 201 })) as typeof fetch), /condivisa/);
  }
  const result = await postUrgencyAck('/synthetic/ack', {}, (async () =>
    new Response(JSON.stringify(reply(takenBy)), { status: 201 })) as typeof fetch);
  assert.equal(result.urgency.takenBy?.operatorName, 'Collega Test');
});

test('older personal reading history keeps the actual reader without claiming shared understanding', () => {
  const traces = legacyReadTraces([null, {}, { operatorName: 'Collega Test',
    operatorRole: 'infermiere', acknowledgedAt: '2026-10-03T16:35:00Z' }]);
  assert.equal(traces.length, 1);
  assert.match(traces[0], /Letta da Collega Test \(infermiere\).*registrazione personale/);
  assert.doesNotMatch(traces[0], /compresa|priorità originale/);
  assert.deepEqual(legacyReadTraces({}), []);
});
