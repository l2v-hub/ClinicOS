import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import { clearCachedGet } from '../cachedFetch';
import { loadAllTherapyPages, loadTherapyPage } from '../therapyPages';
import { loadMedicationAdministrationPage } from '../medicationAdministrationPages';

const originalFetch = globalThis.fetch;
const therapyTabUrl = new URL(
  '../../components/operator/cartella/TerapiaFarmacologicaTab.tsx',
  import.meta.url,
);
const loadErrorStateUrl = new URL(
  '../../components/operator/cartella/LoadErrorState.tsx',
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

test('therapy page loader carries every server filter on the first page', async () => {
  let requested = '';
  globalThis.fetch = (async (input: string | URL | Request) => {
    requested = String(input);
    return new Response(
      JSON.stringify({
        items: [],
        summary: { total: 0, active: 0, inactive: 0 },
        pageInfo: { hasMore: false, nextCursor: null },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  await loadTherapyPage('patient-1', 'tutte', null, {
    q: 'acido acetilsalicilico',
    tipo: 'periodica',
    data: '2030-01-02',
  });
  assert.match(requested, /q=acido\+acetilsalicilico/);
  assert.match(requested, /tipo=periodica/);
  assert.match(requested, /data=2030-01-02/);
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
  assert.match(tab, /Applica filtri/);
  assert.match(tab, /loadTherapyPage\([\s\S]*therapyFilters/);
  assert.match(tab, /filterable: false/);
  assert.match(tab, /disableSorting=\{Boolean\(nextTherapyCursor\)\}/);
  assert.match(
    tab,
    /setTherapies\(\[\]\);[\s\S]*setNextTherapyCursor\(null\);[\s\S]*setTherapySummary\(null\);/,
  );
  assert.match(emergencyPrint, /loadAllTherapyPages\(paziente\.id, 'attiva'\)/);
  assert.match(emergencyPrint, /disabled=\{loading \|\| Boolean\(fetchError\)\}/);
  assert.match(emergencyPrint, /La stampa è bloccata/);
});

test('therapy failures are announced and never rendered as empty clinical results', async () => {
  const [tab, loadErrorState] = await Promise.all([
    readFile(therapyTabUrl, 'utf8'),
    readFile(loadErrorStateUrl, 'utf8'),
  ]);
  assert.match(loadErrorState, /export function LoadErrorState/);
  assert.match(loadErrorState, /className="alert alert--error" role="alert"/);
  assert.match(tab, /therapyLoadError && therapies\.length === 0 \? null/);
  assert.match(tab, /dailyError \? \([\s\S]*LoadErrorState/);
  assert.match(tab, /historyError && history\.length === 0 \? \([\s\S]*LoadErrorState/);
  assert.match(tab, /setDailyError\(/);
  assert.match(tab, /setHistoryError\(/);
  assert.match(tab, /dailyLoadSequence/);
  assert.match(tab, /historyLoadSequence/);
  assert.match(tab, /lo storico è parziale/);
  assert.doesNotMatch(tab, /medication-administrations\?limit=200/);
});

test('medication administration history follows the bounded opaque cursor feed', async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({
        items: [{ id: 'administration-1' }],
        pageInfo: { hasMore: true, nextCursor: 'next-history' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const page = await loadMedicationAdministrationPage<{ id: string }>(
    'patient/a',
    'cursor/current',
  );
  assert.equal(page.pageInfo.nextCursor, 'next-history');
  assert.match(urls[0], /patient%2Fa\/medication-administrations\/page\?limit=100/);
  assert.match(urls[0], /cursor=cursor%2Fcurrent/);
});
