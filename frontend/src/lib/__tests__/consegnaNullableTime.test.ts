import assert from 'node:assert/strict';
import test from 'node:test';
import { isConsegnaRow } from '../consegnaResponse';
import { isConsegnaFeedResponse } from '../consegneFeed';
import { parseHandoverOverview } from '../handoverOverviewResponse';
import { identityHandover } from '../../components/operator/__tests__/operationalIdentity.fixtures';

const summary = { total: 1, urgentActive: 0, urgentTaken: 0 };
const row = (oraScadenza: unknown) => ({ ...identityHandover, oraScadenza });
const feed = (entry: unknown) => ({
  items: [entry],
  summary,
  pageInfo: { hasMore: false, nextCursor: null },
});
const overview = (entry: unknown) => ({
  scope: 'operator',
  summary,
  recentPreview: [entry],
  urgentPreview: [],
  byOperator: {},
});

test('feed and dashboard accept nullable deadline times returned by the backend', () => {
  for (const time of [undefined, null, '08:00']) {
    const entry = row(time);
    assert.equal(isConsegnaRow(entry), true);
    assert.equal(isConsegnaFeedResponse(feed(entry)), true);
    assert.equal(parseHandoverOverview(overview(entry)).recentPreview[0].oraScadenza, time);
  }
});

test('malformed deadline times still reject the whole response', () => {
  for (const time of [false, 8, {}, []]) {
    const entry = row(time);
    assert.equal(isConsegnaRow(entry), false);
    assert.equal(isConsegnaFeedResponse(feed(entry)), false);
    assert.throws(() => parseHandoverOverview(overview(entry)), /incompatible/);
  }
});
