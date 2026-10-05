// Prompt 10 AT-04 / AT-05 / AT-11 / AT-12: calendario terapie del paziente interattivo, con la
// somministrazione raggiungibile dalla cartella, e maschera terapia con errori per campo.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TherapyCalendarGrid } from '../../shared/TherapyCalendarGrid';
import type { TherapySlot } from '../../../types';
import { patientGiroTime } from '../../../lib/therapyGiro';
import { recordAdministration } from '../../../lib/therapyAdministrationWrite';
import {
  therapyFormIssues,
  therapyIssuesSummary,
  therapySaveErrorMessage,
} from '../cartella/therapySaveFeedback';
import { emptyTherapyForm } from '../cartella/TherapyFormFields';

const originalFetch = globalThis.fetch;
Object.assign(globalThis, { React });
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const src = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

function admin(therapyId: string, scheduledTime: string, status = 'pending') {
  return {
    administrationId: null,
    therapyId,
    drugName: `Farmaco ${therapyId}`,
    dosage: '1 cpr',
    route: 'orale',
    scheduledTime,
    status,
    administeredAt: null,
    administeredBy: null,
    notAdministeredReason: null,
  };
}
const slots = [
  {
    id: 'mattina',
    fascia: 'mattina',
    ora: '08:00',
    label: 'Mattina',
    summary: { total: 3, administered: 0, notAdministered: 0, pending: 3 },
    patients: [
      {
        patientId: 'nanni',
        firstName: 'Miriam',
        lastName: 'Nanni',
        administrations: [admin('t1', '08:00'), admin('t2', '08:00'), admin('t3', '09:00')],
      },
      {
        patientId: 'other',
        firstName: 'Altro',
        lastName: 'Ospite',
        administrations: [admin('t9', '08:00')],
      },
    ],
  },
] as unknown as TherapySlot[];

test('AT-04: the slot detail shows only the current patient at that exact time', () => {
  const time = patientGiroTime(slots, 'nanni', '08:00');
  assert.ok(time);
  assert.equal(time.patients.length, 1);
  assert.equal(time.patients[0].patient.patientId, 'nanni');
  assert.deepEqual(
    time.patients[0].items.map((item) => item.a.therapyId),
    ['t1', 't2'],
  );
  assert.equal(time.patients[0].items[0].fascia, 'mattina');
  assert.equal(patientGiroTime(slots, 'nanni', '12:00'), null);
  assert.equal(patientGiroTime(slots, 'missing', '08:00'), null);
});

test('AT-04: simultaneous doses share one named button for their hour dialog', () => {
  const html = renderToStaticMarkup(createElement(TherapyCalendarGrid, {
    days: ['2026-10-05'],
    cells: [{ date: '2026-10-05', time: '08:00', title: 'Farmaco t1 · Farmaco t2',
      detail: '2 in ritardo', count: 2, tone: 'late' }],
    selected: { date: '2026-10-05', time: '08:00' },
    onOpen() {},
  }));
  assert.equal((html.match(/<button /g) ?? []).length, 1);
  assert.match(html, /aria-haspopup="dialog" aria-expanded="true"/);
  assert.match(html, /aria-label="2026-10-05, ore 08:00: Farmaco t1 · Farmaco t2, 2 dosi, 2 in ritardo\. Apri dettagli"/);
  assert.match(html, /data-time="08:00"/);
});

test('AT-05: administration from the chart is capability-gated and reuses the giro rows', async () => {
  const detail = await src('../cartella/PatientTherapySlotDetail.tsx');
  assert.match(detail, /useCan\('administration\.confirm'\)/);
  assert.match(detail, /useCan\('administration\.record_not_administered'\)/);
  assert.match(detail, /<TherapyGiroRows/);
  assert.match(detail, /readOnly=\{!canAdminister\}/);
});

test('AT-05: recordAdministration posts the slot key to the existing endpoints', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const info = {
    patientId: 'nanni',
    therapyId: 't1',
    drugName: 'Farmaco t1',
    dosage: '1 cpr',
    route: 'orale',
    date: '2026-10-02',
    fascia: 'mattina',
    ora: '08:00',
  };
  assert.deepEqual(await recordAdministration(info, { kind: 'administered' }), { ok: true });
  assert.ok(calls[0].url.endsWith('/therapy-slots/confirm'));
  assert.equal(calls[0].body.therapyId, 't1');
  assert.equal(calls[0].body.motivo, undefined);
  await recordAdministration(info, {
    kind: 'not_administered',
    motivo: 'rifiutata_paziente',
    note: '',
  });
  assert.ok(calls[1].url.endsWith('/therapy-slots/not-administered'));
  assert.equal(calls[1].body.motivo, 'rifiutata_paziente');
});

test('AT-05: a refused administration shows the server reason, not a generic error', async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: 'Terapia non trovata o non prevista per questo slot' }), {
      status: 409,
    })) as typeof fetch;
  const result = await recordAdministration(
    {
      patientId: 'p',
      therapyId: 't',
      drugName: 'x',
      dosage: '',
      route: '',
      date: '2026-10-02',
      fascia: 'mattina',
      ora: '08:00',
    },
    { kind: 'administered' },
  );
  assert.deepEqual(result, {
    ok: false,
    message: 'Terapia non trovata o non prevista per questo slot',
  });
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;
  const offline = await recordAdministration(
    {
      patientId: 'p',
      therapyId: 't',
      drugName: 'x',
      dosage: '',
      route: '',
      date: '2026-10-02',
      fascia: 'mattina',
      ora: '08:00',
    },
    { kind: 'administered' },
  );
  assert.equal(offline.ok, false);
});

test('AT-12: a correctly filled therapy form has no issues', () => {
  assert.deepEqual(therapyFormIssues({ ...emptyTherapyForm(), farmacoNome: 'Paracetamolo' }), []);
  assert.deepEqual(
    therapyFormIssues({
      ...emptyTherapyForm(),
      farmacoNome: 'Paracetamolo',
      commercialStrengthValue: '500',
    }),
    [],
  );
});

test('AT-11: invalid fields are reported per field and schedule row, never dropped', () => {
  const form = {
    ...emptyTherapyForm(),
    farmacoNome: 'Paracetamolo',
    commercialStrengthValue: '2,5',
    schedules: [
      ...emptyTherapyForm().schedules,
      { time: '', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' },
    ],
  };
  const issues = therapyFormIssues(form);
  assert.ok(issues.some((i) => i.field === 'commercialStrengthValue'));
  assert.ok(issues.some((i) => i.field === 'time' && i.scheduleIndex === 1));
  assert.match(
    therapyIssuesSummary(issues),
    /^Correggi prima di salvare: .+\(e 1 altro campo\)\.$/,
  );
  const oneTime = therapyFormIssues({
    ...emptyTherapyForm(),
    farmacoNome: 'Paracetamolo',
    tipo: 'una_tantum',
    orarioSomministrazione: '',
  });
  assert.deepEqual(
    oneTime.map((i) => i.field),
    ['orarioSomministrazione'],
  );
});

test('AT-11: a server rejection shows its reason instead of «Errore 400»', async () => {
  assert.equal(
    await therapySaveErrorMessage(
      new Response(JSON.stringify({ error: 'La data di fine precede la data di inizio' }), {
        status: 400,
      }),
    ),
    'Terapia non salvata: La data di fine precede la data di inizio',
  );
  assert.match(await therapySaveErrorMessage(new Response('', { status: 500 })), /errore 500/);
  const tab = await src('../cartella/TerapiaFarmacologicaTab.tsx');
  assert.doesNotMatch(tab, /throw new Error\(`Errore \$\{res\.status\}`\);\n\s+createKey\.reset/);
  assert.match(tab, /issues=\{formIssues\}/);
  assert.match(tab, /data-testid="therapy-save-error"/);
});
