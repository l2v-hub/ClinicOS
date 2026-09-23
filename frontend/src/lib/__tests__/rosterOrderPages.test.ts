import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertRosterPage,
  isRosterChanged,
  parseRosterMetadata,
  parseRosterPreference,
  parseRosterDefaultsPage,
  rosterQuery,
} from '../rosterOrder';
import { buildPatientPageRequest, fetchPatientPage } from '../patientPage';
import {
  buildPatientParametersPageUrl,
  fetchPatientParametersPage,
} from '../patientParametersPage';
import {
  buildTherapySlotPageUrl,
  mergeTherapySlotPages,
  parseTherapySlotPage,
} from '../therapySlotPage';
import { rosterMetadata, rosterPreference } from './rosterOrder.fixtures';
import { identityTherapySlot } from '../../components/operator/__tests__/operationalIdentity.fixtures';

const options = {
  sort: 'location' as const,
  direction: 'asc' as const,
  contextId: 'synthetic-context-a',
};
test('identity search keeps PHI in POST while binding global order and historical bootstrap asOf', () => {
  const request = buildPatientPageRequest('/api', {
    q: 'Rossi',
    limit: 25,
    ...options,
    asOf: '2026-09-23',
  });
  assert.equal(request.url, '/api/patients/page/search');
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    q: 'Rossi',
    limit: '25',
    ...options,
    asOf: '2026-09-23',
  });
  const parameters = new URL(
    buildPatientParametersPageUrl('https://synthetic.invalid', { date: '2026-09-23', ...options }),
  );
  const therapy = new URL(
    buildTherapySlotPageUrl('https://synthetic.invalid', '2026-09-23', 'opaque+/=', options),
  );
  for (const url of [parameters, therapy]) {
    assert.equal(url.searchParams.get('sort'), 'location');
    assert.equal(url.searchParams.get('direction'), 'asc');
    assert.equal(url.searchParams.get('contextId'), options.contextId);
  }
  assert.equal(therapy.searchParams.get('cursor'), 'opaque+/=');
  assert.deepEqual(rosterQuery({}), {});
  assert.throws(() => rosterQuery({ sort: 'name' }));
});

test('epochs and revisions remain exact strings; malformed metadata and partial permission shapes are rejected', () => {
  assert.equal(parseRosterMetadata(rosterMetadata)?.epoch.roster, '90071992547409930');
  assert.equal(parseRosterPreference(rosterPreference).revision, '0');
  assert.throws(() =>
    parseRosterMetadata({ ...rosterMetadata, epoch: { roster: Number('90071992547409930') } }),
  );
  assert.throws(() => parseRosterMetadata({ ...rosterMetadata, asOf: '2026-02-29' }));
  assert.throws(() => parseRosterPreference({ ...rosterPreference, context: null }));
  assert.throws(() => parseRosterPreference({ ...rosterPreference, revision: 0 }));
  assert.throws(() => parseRosterDefaultsPage({ items: [], hasMore: true, nextCursor: null }));
  assert.throws(() => assertRosterPage(undefined, options));
  assert.throws(
    () =>
      assertRosterPage(
        { ...rosterMetadata, order: { criterion: 'name', direction: 'asc' } },
        options,
      ),
    isRosterChanged,
  );
  assert.throws(() => assertRosterPage(rosterMetadata, options, '2026-09-22'), isRosterChanged);
});

test('initial identity/parameter readers run without waiting for preference and retain real server order metadata', async () => {
  const calls: string[] = [];
  const fetcher = (async (input) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({ items: [], hasMore: false, nextCursor: null, roster: rosterMetadata }),
    );
  }) as typeof fetch;
  const identity = await fetchPatientPage(
    '/api',
    { limit: 25, asOf: '2026-09-23' },
    { headers: {}, fetcher },
  );
  const parameters = await fetchPatientParametersPage(
    '/api',
    { date: '2026-09-23' },
    { headers: {}, fetcher },
  );
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => !/sort=|direction=|contextId=|\/me\//.test(url)));
  assert.deepEqual(identity.roster, rosterMetadata);
  assert.deepEqual(parameters.roster, rosterMetadata);
});

test('409 roster_changed is typed for a fresh page sequence; therapy partial merges keep server order and exact totals', async () => {
  await assert.rejects(
    fetchPatientPage(
      '/api',
      { ...options, cursor: 'old' },
      {
        headers: {},
        fetcher: (async () =>
          new Response(JSON.stringify({ code: 'roster_changed', reason: 'context' }), {
            status: 409,
          })) as typeof fetch,
      },
    ),
    isRosterChanged,
  );
  const slot = { ...identityTherapySlot, patients: [...identityTherapySlot.patients].reverse() };
  const page = parseTherapySlotPage({
    slots: [slot],
    roster: rosterMetadata,
    pageInfo: {
      hasMore: true,
      nextCursor: 'next',
      loadedTherapies: 2,
      completeness: 'partial',
      summaryExact: true,
    },
  });
  const first = page.slots[0].patients[0];
  const next = {
    ...slot,
    patients: [
      { ...first, administrations: [{ ...first.administrations[0], therapyId: 'additional' }] },
    ],
    summary: { total: 99, pending: 99, administered: 0, notAdministered: 0 },
  };
  const merged = mergeTherapySlotPages(page.slots, [next]);
  assert.deepEqual(
    merged[0].patients.map((p) => p.patientId),
    slot.patients.map((p) => p.patientId),
  );
  assert.equal(merged[0].patients[0].administrations.length, 2);
  assert.equal(merged[0].summary.total, 2);
});
