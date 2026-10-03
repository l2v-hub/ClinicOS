import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criticalHandoverCount, handoverPreview } from '../handoverPreview';
import type { Consegna, ConsegnaOverview } from '../../types';
import { identityHandover } from '../../components/operator/__tests__/operationalIdentity.fixtures';

const item = (id: string, options: Partial<Consegna> = {}): Consegna => ({
  ...identityHandover,
  id,
  priorita: 'normale',
  createdAt: '2026-10-03T10:00:00Z',
  ...options,
});
const overview = (recentPreview: Consegna[], urgentPreview: Consegna[] = []): ConsegnaOverview => ({
  scope: 'operator',
  summary: { total: 20, urgentActive: 12, urgentTaken: 3 },
  recentPreview,
  urgentPreview,
  byOperator: {},
});
test('preview merges latest and urgent, deduplicates and sorts severity before time', () => {
  const active = item('urgent', {
    priorita: 'urgente',
    urgency: { state: 'active', takenBy: null, isAuthor: false, canAcknowledge: true },
  });
  const taken = item('taken', {
    priorita: 'urgente',
    urgency: { state: 'taken', takenBy: null, isAuthor: false, canAcknowledge: false },
  });
  const input = overview(
    [item('normal'), item('high', { priorita: 'alta' }), active, taken],
    [active],
  );
  assert.deepEqual(
    handoverPreview(input).map((entry) => entry.id),
    ['urgent', 'high', 'normal', 'taken'],
  );
  assert.equal(input.recentPreview.length, 4, 'source unchanged');
});
test('newest first within a severity; bounded selection and invalid dates deterministic', () => {
  const list = [
    item('old', { createdAt: '2026-01-01' }),
    item('invalid', { createdAt: '?' }),
    ...Array.from({ length: 6 }, (_, i) =>
      item('n' + i, { createdAt: '2026-10-03T1' + i + ':00:00Z' }),
    ),
  ];
  assert.deepEqual(
    handoverPreview(overview(list)).map((entry) => entry.id),
    ['n5', 'n4', 'n3', 'n2', 'n1'],
  );
  assert.deepEqual(handoverPreview(null), []);
});
test('critical badge uses exact aggregate beyond preview and never treats unavailable as zero', () => {
  const input = overview([item('one')]);
  assert.equal(criticalHandoverCount(input, 'ready'), 12);
  assert.equal(criticalHandoverCount(input, 'loading'), null);
  assert.equal(criticalHandoverCount(input, 'error'), null);
  assert.equal(criticalHandoverCount(null, 'ready'), null);
  assert.equal(
    criticalHandoverCount({ ...input, summary: { ...input.summary, urgentActive: 0 } }, 'ready'),
    0,
  );
});
