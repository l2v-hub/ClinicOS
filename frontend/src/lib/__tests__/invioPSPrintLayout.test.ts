import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const stylesUrl = new URL('../../print-forms.css', import.meta.url);

test('Invio PS uses a large A4-proportioned screen preview', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.invio-ps-box\s*\{[\s\S]*max-width:\s*1080px/);
  assert.match(
    styles,
    /\.invio-ps-doc\.fm\s*\{[\s\S]*width:\s*min\(794px, 100%\)[\s\S]*min-height:\s*1123px/,
  );
  assert.match(styles, /\.invio-ps-body\s*\{[\s\S]*overflow:\s*auto/);
});

test('Invio PS prints on a named portrait A4 page without screen framing', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /@page invio-ps-sheet\s*\{[\s\S]*size:\s*A4 portrait/);
  assert.match(styles, /\.invio-ps-doc\.fm\s*\{[\s\S]*page:\s*invio-ps-sheet/);
  assert.match(
    styles,
    /body:has\(\.invio-ps-overlay\) \.invio-ps-doc\.fm\s*\{[\s\S]*width:\s*100% !important[\s\S]*border:\s*none !important/,
  );
});

test('landscape clinical forms keep their own named A4 page', async () => {
  const styles = await readFile(stylesUrl, 'utf8');

  assert.match(styles, /\.fm--landscape\s*\{[\s\S]*page:\s*landscape-sheet/);
  assert.match(styles, /@page landscape-sheet\s*\{[\s\S]*size:\s*A4 landscape/);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import InvioPSModal from '../../components/operator/InvioPSModal';
import type { CartellaPaziente, Paziente } from '../../types';
import { loadEmergencyTransferSources } from '../emergencyTransferContext';
import { setCurrentOperator } from '../operatorSession';
import { invalidateCachedGet } from '../cachedFetch';
import { API_URL } from '../../config';

const psPatient = {
  id: 'synthetic-ps-patient',
  firstName: 'Persona',
  lastName: 'Sintetica',
  dateOfBirth: null,
  sex: null,
  medicalRecordNumber: 'SYNTHETIC',
  email: null,
  phone: null,
} as Paziente;
const psChart = {
  pazienteId: psPatient.id,
  allergie: [],
  diagnosi: [],
  parametriVitali: [],
  indicatoriRischio: [],
  anamnesi: {},
} as unknown as CartellaPaziente;

test('457 print preview renders actual required sections, editable reason and disabled print before clinical sources load', () => {
  const html = renderToStaticMarkup(
    createElement(InvioPSModal, { paziente: psPatient, cartella: psChart, onClose: () => {} }),
  );
  for (const section of [
    'data-invio-ps-reason',
    'data-invio-ps-vitals',
    'data-invio-ps-given',
    'data-invio-ps-risks',
    'data-invio-ps-contact',
  ])
    assert.ok(html.includes(section), section);
  assert.match(html, /disabled="" data-invio-ps-print/);
  assert.match(html, /Stato allergie da verificare/);
  assert.match(html, /Motivo dell&#x27;invio \(modificabile\)/);
  assert.doesNotMatch(html, /Nessuna allergia nota|Registra uscita|Sospendi|Pausa del giro/);
});

test('457 mismatched chart does not render another patient clinical context or an enabled print action', () => {
  const html = renderToStaticMarkup(
    createElement(InvioPSModal, {
      paziente: psPatient,
      cartella: { ...psChart, pazienteId: 'another-patient' },
      onClose: () => {},
    }),
  );
  assert.match(html, /Contesto clinico non coerente/);
  assert.doesNotMatch(html, /data-invio-ps-print|invio-ps-doc/);
});

async function withEmergencyApi(
  prnItems: unknown,
  run: (
    calls: Array<{ path: string; date: string | null; method: string; actor: string | null }>,
  ) => Promise<void>,
) {
  const original = globalThis.fetch;
  const calls: Array<{ path: string; date: string | null; method: string; actor: string | null }> =
    [];
  invalidateCachedGet(API_URL);
  setCurrentOperator({ id: 'synthetic-ps-operator', role: 'infermiere' });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push({
      path: url.pathname,
      date: url.searchParams.get('date'),
      method: init?.method ?? 'GET',
      actor: new Headers(init?.headers).get('X-Operator-Id'),
    });
    let body: unknown;
    if (url.pathname.endsWith('/therapies/page'))
      body = {
        items: [],
        summary: { total: 0, active: 0, inactive: 0 },
        pageInfo: { hasMore: false, nextCursor: null },
      };
    else if (url.pathname.endsWith('/parameter-readings'))
      body = { readings: [], hasMore: false, nextCursor: null };
    else if (url.pathname.endsWith('/medication-administrations/page'))
      body = { items: [], pageInfo: { hasMore: false, nextCursor: null } };
    else if (url.pathname.endsWith('/diary'))
      body = { entries: [], hasMore: false, nextCursor: null };
    else if (url.pathname === '/therapy-slots/prn') body = { items: prnItems };
    else throw new Error('Unexpected clinical source');
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
    setCurrentOperator(null);
    invalidateCachedGet(API_URL);
  }
}

test('457 source collection uses authenticated reads only, including both civil days of the 24-hour PRN window', async () => {
  await withEmergencyApi([], async (calls) => {
    const result = await loadEmergencyTransferSources(
      psPatient.id,
      new AbortController().signal,
      new Date('2026-10-17T00:30:00Z'),
    );
    assert.equal(result.patientId, psPatient.id);
    assert.deepEqual(result.scheduled, []);
    assert.deepEqual(result.prn, []);
    assert.deepEqual(
      calls
        .filter((call) => call.path === '/therapy-slots/prn')
        .map((call) => call.date)
        .sort(),
      ['2026-10-16', '2026-10-17'],
    );
    assert.ok(calls.length >= 6);
    assert.ok(
      calls.every((call) => call.method === 'GET' && call.actor === 'synthetic-ps-operator'),
    );
  });
});

test('457 PRN capped or malformed source blocks printable context instead of reporting an empty complete history', async () => {
  for (const items of [undefined, 'bad-shape', new Array(200).fill({})])
    await withEmergencyApi(items, async () => {
      await assert.rejects(
        loadEmergencyTransferSources(
          psPatient.id,
          new AbortController().signal,
          new Date('2026-10-17T10:00:00Z'),
        ),
        /Completezza|non valide/,
      );
    });
});
