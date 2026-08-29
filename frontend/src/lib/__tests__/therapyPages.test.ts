import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { clearCachedGet } from '../cachedFetch';
import { loadAllTherapyPages } from '../therapyPages';

const originalFetch = globalThis.fetch;
const therapyTabUrl = new URL(
  '../../components/operator/cartella/TerapiaFarmacologicaTab.tsx',
  import.meta.url,
);
const emergencyPrintUrl = new URL('../../components/operator/InvioPSModal.tsx', import.meta.url);

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCachedGet();
});

test('therapy page loader returns a complete deduplicated clinical list', async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    const second = url.includes('cursor=next-1');
    return new Response(
      JSON.stringify(
        second
          ? {
              items: [{ id: 'b' }, { id: 'c' }],
              summary: null,
              pageInfo: { hasMore: false, nextCursor: null },
            }
          : {
              items: [{ id: 'a' }, { id: 'b' }],
              summary: { total: 3, active: 2, inactive: 1 },
              pageInfo: { hasMore: true, nextCursor: 'next-1' },
            },
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const rows = await loadAllTherapyPages('patient/a', 'attiva');
  assert.deepEqual(
    rows.map((row) => row.id),
    ['a', 'b', 'c'],
  );
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => url.includes('limit=100&status=attiva')));
  assert.ok(urls.every((url) => url.includes('patient%2Fa')));
});

test('therapy page loader rejects a repeating cursor instead of looping forever', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        items: [{ id: 'a' }],
        summary: { total: 2, active: 2, inactive: 0 },
        pageInfo: { hasMore: true, nextCursor: 'same' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch;

  await assert.rejects(() => loadAllTherapyPages('patient-1'), /Paginazione terapie non valida/);
});

test('therapy UI loads incrementally while emergency print requires every active page', async () => {
  const [tab, emergencyPrint] = await Promise.all([
    readFile(therapyTabUrl, 'utf8'),
    readFile(emergencyPrintUrl, 'utf8'),
  ]);
  assert.match(tab, /loadTherapyPage\(requestedPatientId/);
  assert.match(tab, /Carica altre terapie/);
  assert.match(tab, /therapyLoadSequence/);
  assert.match(tab, /pageSize=\{25\}/);
  assert.match(tab, /therapySummary\?\.active/);
  assert.match(tab, /verifica parziale/);
  assert.match(tab, /filterable: !nextTherapyCursor/);
  assert.match(tab, /filtri disponibili a caricamento completo/);
  assert.match(emergencyPrint, /loadAllTherapyPages\(paziente\.id, 'attiva'\)/);
  assert.match(emergencyPrint, /disabled=\{loading \|\| Boolean\(fetchError\)\}/);
  assert.match(emergencyPrint, /La stampa è bloccata/);
});
