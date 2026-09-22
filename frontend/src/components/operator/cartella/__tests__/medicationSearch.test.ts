import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as tick } from 'node:timers/promises';
import {
  createMedicationSearch,
  emptyMedicationSearch,
  loadExactDrugPackage,
  medicationSearchUrl,
  type MedicationSearchPage,
} from '../medicationSearch';

const product = (n: number) => ({
  aic: String(n).padStart(9, '0'),
  denominazione: 'Prodotto sintetico',
  linkFi: null,
  linkRcp: null,
});
function harness() {
  let state = emptyMedicationSearch();
  const requests: Array<{
    query: string;
    criterion: string;
    cursor: string | null;
    signal: AbortSignal;
    resolve: (page: MedicationSearchPage) => void;
    reject: (error: Error) => void;
  }> = [];
  const search = createMedicationSearch(
    (query, criterion, cursor, signal) =>
      new Promise((resolve, reject) => {
        requests.push({ query, criterion, cursor, signal, resolve, reject });
      }),
    (next) => {
      state = next;
    },
    0,
  );
  return { search, requests, state: () => state };
}

test('continuation reaches more than 12 packages, preserves rows on failure and retries the same cursor', async () => {
  const h = harness();
  h.search.search('Tachipirina', 'nome');
  await tick(1);
  h.requests[0].resolve({
    esiti: Array.from({ length: 25 }, (_, n) => product(n)),
    pageInfo: { hasMore: true, nextCursor: 'page-2' },
  });
  await tick(1);
  h.search.loadMore();
  h.search.loadMore();
  assert.equal(h.requests.length, 2);
  assert.equal(h.state().items.length, 25);
  h.requests[1].reject(new Error('offline'));
  await tick(1);
  assert.equal(h.state().phase, 'error');
  assert.equal(h.state().items.length, 25);
  h.search.retry();
  assert.equal(h.requests[2].cursor, 'page-2');
  h.requests[2].resolve({
    esiti: [product(24), product(25)],
    pageInfo: { hasMore: false, nextCursor: null },
  });
  await tick(1);
  assert.equal(h.state().items.length, 26);
  assert.equal(h.state().nextCursor, null);
  h.search.cancel();
});

test('query and criterion changes clear results and ignore late success or failure', async () => {
  const h = harness();
  h.search.search('primo', 'nome');
  await tick(1);
  h.requests[0].resolve({ esiti: [product(1)], pageInfo: { hasMore: true, nextCursor: 'more' } });
  await tick(1);
  h.search.loadMore();
  h.search.search('secondo', 'principio-attivo');
  assert.equal(h.requests[1].signal.aborted, true);
  assert.deepEqual(h.state().items, []);
  assert.equal(h.state().nextCursor, null);
  h.requests[1].resolve({ esiti: [product(2)] });
  await tick(1);
  assert.deepEqual(h.state().items, []);
  assert.equal(h.requests[2].criterion, 'principio-attivo');
  h.search.search('secondo', 'nome');
  h.requests[2].reject(new Error('stale failure'));
  await tick(1);
  assert.equal(h.state().phase, 'loading');
  h.requests[3].resolve({ esiti: [product(3)] });
  await tick(1);
  assert.equal(h.state().items[0].aic, product(3).aic);
  h.search.cancel();
});

test('short queries and disposed searches neither send nor accept obsolete work', async () => {
  const h = harness();
  h.search.search('prima', 'nome');
  h.search.search('ab', 'nome');
  await tick(1);
  assert.equal(h.requests.length, 0);
  assert.equal(h.state().phase, 'idle');
  h.search.search('valida', 'nome');
  await tick(1);
  h.search.cancel();
  h.requests[0].resolve({ esiti: [product(1)] });
  await tick(1);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.deepEqual(h.state().items, []);
});

test('empty scan pages continue; malformed responses remain retryable', async () => {
  const h = harness();
  h.search.search('Tachipirina 1000 compresse', 'nome');
  await tick(1);
  h.requests[0].resolve({ esiti: [], pageInfo: { hasMore: true, nextCursor: 'scan-next' } });
  await tick(1);
  assert.equal(h.state().nextCursor, 'scan-next');
  h.search.loadMore();
  assert.equal(h.requests[1].cursor, 'scan-next');
  h.requests[1].resolve({ esiti: [product(31)], pageInfo: { hasMore: false, nextCursor: null } });
  await tick(1);
  assert.equal(h.state().items[0].aic, product(31).aic);
  h.search.search('malformed', 'nome');
  await tick(1);
  h.requests[2].resolve({} as MedicationSearchPage);
  await tick(1);
  assert.equal(h.state().phase, 'error');
  h.search.cancel();
});

test('cursor requests retain query, criterion and limit without patient information', () => {
  const url = new URL(
    medicationSearchUrl('https://synthetic.invalid', 'A+B 1000', 'principio-attivo', 'abc+/='),
  );
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    q: 'A+B 1000',
    limite: '25',
    pa: '1',
    cursor: 'abc+/=',
  });
});

test('restore requests exact AIC and rejects another package with the same name', async () => {
  const aic = product(42).aic;
  const urls: string[] = [];
  const signal = new AbortController().signal;
  const request = (async (url, init) => {
    urls.push(String(url));
    assert.equal(init?.signal, signal);
    return new Response(JSON.stringify({ esiti: [product(42)] }), { status: 200 });
  }) as typeof fetch;
  assert.equal(
    (await loadExactDrugPackage('https://synthetic.invalid', aic, signal, request)).aic,
    aic,
  );
  assert.equal(new URL(urls[0]).searchParams.get('q'), aic);
  assert.equal(new URL(urls[0]).searchParams.get('limite'), '1');
  await assert.rejects(
    loadExactDrugPackage(
      '',
      aic,
      signal,
      (async () => new Response(JSON.stringify({ esiti: [product(41)] }))) as typeof fetch,
    ),
  );
  await assert.rejects(loadExactDrugPackage('', 'Tachipirina', signal, request));
  assert.equal(urls.length, 1);
});
