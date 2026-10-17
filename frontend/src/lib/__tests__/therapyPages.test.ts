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

test('therapy page loader returns the complete patient-scoped clinical list', async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    const second = url.includes('cursor=next-1');
    return new Response(
      JSON.stringify(
        second
          ? {
              items: [{ id: 'c', patientId: 'patient/a', stato: 'sospesa' }],
              summary: null,
              pageInfo: { hasMore: false, nextCursor: null },
            }
          : {
              items: [
                { id: 'a', patientId: 'patient/a', stato: 'attiva' },
                { id: 'b', patientId: 'patient/a', stato: 'attiva' },
              ],
              summary: { total: 3, active: 2, inactive: 1 },
              pageInfo: { hasMore: true, nextCursor: 'next-1' },
            },
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const rows = await loadAllTherapyPages('patient/a', 'tutte');
  assert.deepEqual(
    rows.map((row) => row.id),
    ['a', 'b', 'c'],
  );
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => url.includes('limit=100&status=tutte')));
  assert.ok(urls.every((url) => url.includes('patient%2Fa')));
});

test('therapy page loader rejects a repeating cursor instead of looping forever', async () => {
  let calls = 0;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        items: [{ id: `a-${calls++}`, patientId: 'patient-1', stato: 'attiva' }],
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

test('therapy plan and emergency print require every page, never a manual partial plan', async () => {
  const [tab, emergencyPrint] = await Promise.all([
    readFile(therapyTabUrl, 'utf8'),
    readFile(emergencyPrintUrl, 'utf8'),
  ]);
  assert.match(tab, /readCompletePatientTherapies\(requestedPatientId, controller.signal\)/);
  assert.doesNotMatch(tab, /Carica altre terapie|nextTherapyCursor/);
  assert.match(tab, /therapyLoadSequence/);
  assert.match(tab, /therapySummary\?\.active/);
  assert.match(tab, /completeTherapySnapshot/);
  assert.match(tab, /Vedi tutti i farmaci nel piano terapeutico/);
  assert.match(tab, /setTherapies\(\[\]\);[\s\S]*setTherapySummary\(null\);/);
  assert.match(emergencyPrint, /loadAllTherapyPages\(paziente\.id, 'attiva'\)/);
  assert.match(emergencyPrint, /disabled=\{loading \|\| Boolean\(fetchError\)\}/);
  assert.match(emergencyPrint, /La stampa è bloccata/);
});

test('therapy failures are announced and never rendered as empty clinical results', async () => {
  const [tab, loadErrorState, history] = await Promise.all([
    readFile(therapyTabUrl, 'utf8'),
    readFile(loadErrorStateUrl, 'utf8'),
    readFile(
      new URL('../../components/operator/cartella/TherapyHistoryView.tsx', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(loadErrorState, /export function LoadErrorState/);
  assert.match(loadErrorState, /className="alert alert--error" role="alert"/);
  assert.match(tab, /therapyLoadError && therapies\.length === 0 \? \(\s*<LoadErrorState/);
  assert.match(history, /historyError && history\.length === 0 \? \([\s\S]*LoadErrorState/);
  assert.match(history, /setHistoryError\(/);
  assert.match(history, /historyLoadSequence/);
  assert.match(history, /lo storico è parziale/);
  assert.match(history, /Dosi al bisogno non disponibili/);
  assert.doesNotMatch(tab, /medication-administrations\?limit=200/);
  assert.doesNotMatch(history, /medication-administrations\?limit=200/);
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

// Emergency-print and other consumers use this loader, rather than the calendar-specific reader.
// Their count must never certify cross-patient or inconsistent source pages as a complete plan.
for (const [name, items, summary] of [
  [
    'foreign patient',
    [{ id: 'a', patientId: 'other', stato: 'attiva' }],
    { total: 1, active: 1, inactive: 0 },
  ],
  [
    'wrong state counts',
    [{ id: 'a', patientId: 'patient-1', stato: 'sospesa' }],
    { total: 1, active: 1, inactive: 0 },
  ],
  [
    'repeated prescription',
    [
      { id: 'a', patientId: 'patient-1', stato: 'attiva' },
      { id: 'a', patientId: 'patient-1', stato: 'attiva' },
    ],
    { total: 1, active: 1, inactive: 0 },
  ],
  [
    'short terminal page',
    [{ id: 'a', patientId: 'patient-1', stato: 'attiva' }],
    { total: 2, active: 2, inactive: 0 },
  ],
] as const) {
  test(`complete printable inventory rejects ${name}`, async () => {
    globalThis.fetch = (async () =>
      Response.json({
        items,
        summary,
        pageInfo: { hasMore: false, nextCursor: null },
      })) as typeof fetch;
    await assert.rejects(() => loadAllTherapyPages('patient-1'));
  });
}

test('failed printable inventory can retry and never returns a partial page', async () => {
  let fail = true;
  globalThis.fetch = (async () =>
    fail
      ? new Response('unavailable', { status: 503 })
      : Response.json({
          items: [{ id: 'a', patientId: 'patient-1', stato: 'attiva' }],
          summary: { total: 1, active: 1, inactive: 0 },
          pageInfo: { hasMore: false, nextCursor: null },
        })) as typeof fetch;
  await assert.rejects(() => loadAllTherapyPages('patient-1'));
  fail = false;
  assert.deepEqual(
    (await loadAllTherapyPages('patient-1')).map((item) => item.id),
    ['a'],
  );
});

test('printable inventory rejects changed page totals and empty nonterminal pages', async () => {
  globalThis.fetch = (async (input: string | URL | Request) =>
    Response.json(
      String(input).includes('cursor=')
        ? {
            items: [{ id: 'b', patientId: 'patient-1', stato: 'attiva' }],
            summary: { total: 3, active: 3, inactive: 0 },
            pageInfo: { hasMore: false, nextCursor: null },
          }
        : {
            items: [{ id: 'a', patientId: 'patient-1', stato: 'attiva' }],
            summary: { total: 2, active: 2, inactive: 0 },
            pageInfo: { hasMore: true, nextCursor: 'next' },
          },
    )) as typeof fetch;
  await assert.rejects(() => loadAllTherapyPages('patient-1'), /Riepilogo terapie cambiato/);
  clearCachedGet();
  globalThis.fetch = (async () =>
    Response.json({
      items: [],
      summary: { total: 1, active: 1, inactive: 0 },
      pageInfo: { hasMore: true, nextCursor: 'next' },
    })) as typeof fetch;
  await assert.rejects(() => loadAllTherapyPages('patient-1'), /Risposta terapie non valida/);
});

test('a rejected short printable snapshot is evicted so retry reads repaired server data', async () => {
  let calls = 0;
  globalThis.fetch = (async () =>
    Response.json({
      items: [{ id: 'a', patientId: 'patient-1', stato: 'attiva' }],
      summary: { total: ++calls === 1 ? 2 : 1, active: calls === 1 ? 2 : 1, inactive: 0 },
      pageInfo: { hasMore: false, nextCursor: null },
    })) as typeof fetch;
  await assert.rejects(() => loadAllTherapyPages('patient-1'), /incompleto/);
  assert.deepEqual(
    (await loadAllTherapyPages('patient-1')).map((item) => item.id),
    ['a'],
  );
  assert.equal(
    calls,
    2,
    'Retry must issue a fresh HTTP read instead of replaying the rejected cache',
  );
});
