import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientTherapyScheduleSummary } from '../../components/operator/cartella/PatientTherapyScheduleSummary';
import type { UnscheduledMedication } from '../patientTherapyCalendar';
import type { PatientTherapyAPI } from '../../types';
import { schedulesFromTherapy } from '../../components/operator/cartella/therapyFormRestore';
import { therapyToForm } from '../../components/operator/cartella/therapyFormMapping';

Object.assign(globalThis, { React });
const item: UnscheduledMedication = {
  id: 'incomplete-a',
  therapyId: 'therapy-a',
  drugName: 'Farmaco sintetico A',
  dose: 'Dose prescritta',
  strength: '',
  route: 'orale',
  prescriber: 'Medico sintetico',
  note: null,
  endDate: null,
  kind: 'incomplete',
  reason: 'Fasce prescritte: mattina. Orario non specificato.',
};
const render = (
  doseCount = 0,
  incomplete = [item],
  onEdit?: (id: string) => void,
  period: 'giorno' | 'settimana' = 'giorno',
) =>
  renderToStaticMarkup(
    React.createElement(PatientTherapyScheduleSummary, {
      doseCount,
      timeCount: doseCount ? 1 : 0,
      incomplete,
      onEdit,
      period,
    }),
  );

test('zero doses distinguishes incomplete prescriptions immediately and keeps original reasons', () => {
  const html = render(0, [item, { ...item, id: 'b', therapyId: 'b' }]);
  assert.match(html, /0 dosi programmate/);
  assert.match(html, /2 terapie con programmazione da completare/);
  assert.match(html, /Nessuna dose programmata per questo giorno/);
  assert.match(html, /non significa assenza di terapia/);
  assert.match(html, /Fasce prescritte: mattina. Orario non specificato/);
  assert.doesNotMatch(html, /08:00|12:00|18:00/);
});
test('non-prescriber sees clinician reference, never an editor action', () => {
  const html = render();
  assert.match(html, /medico prescrittore/);
  assert.match(html, /Medico sintetico/);
  assert.doesNotMatch(html, /Completa programmazione di/);
});
test('authorized edit is tied to the original incomplete therapy', () => {
  const html = render(0, [item], () => {});
  assert.match(html, /Completa programmazione di Farmaco sintetico A/);
});
test('mixed valid and invalid schedules preserve separate counts without claiming total drugs', () => {
  const html = render(1);
  assert.match(html, /1 dose programmata/);
  assert.match(html, /1 terapia con programmazione da completare/);
  assert.doesNotMatch(html, /Nessuna dose programmata|non sono incluse/);
});
test('genuinely empty and week states explain the displayed period without incomplete warning', () => {
  const html = render(0, [], undefined, 'settimana');
  assert.match(html, /Nessuna dose programmata per questa settimana/);
  assert.doesNotMatch(html, /con programmazione da completare|medico prescrittore/);
});
test('warning precedes grid and parent forwards only permitted existing-prescription edits', async () => {
  const calendar = await readFile(
    new URL('../../components/operator/cartella/PatientTherapyCalendar.tsx', import.meta.url),
    'utf8',
  );
  const parent = await readFile(
    new URL('../../components/operator/cartella/TerapiaFarmacologicaTab.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(
    calendar.indexOf('<PatientTherapyScheduleSummary') < calendar.indexOf('<TherapyCalendarGrid'),
  );
  assert.match(calendar, /therapyById\.get\(therapyId\)/);
  assert.match(parent, /onEditTherapy=\{canUpdateTherapy \? openIncompleteEdit : undefined\}/);
  assert.match(
    parent,
    /if \(!canUpdateTherapy \|\| saving \|\| t\.patientId !== paziente\.id\) return/,
  );
  assert.match(parent, /setForm\(therapyToForm\(t, \{ exactTimesOnly \}\)\)/);
  assert.match(parent, /function openIncompleteEdit[\s\S]*?openEdit\(t, true\)/);
  const css = await readFile(
    new URL('../../components/operator/cartella/PatientTherapyCalendar.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /\.patient-therapy-calendar \.therapy-calendar-grid\s*\{[^}]*max-height: none/);
});

const rawTherapy = {
  id: 'therapy-a',
  patientId: 'patient-a',
  farmacoNome: 'Farmaco sintetico A',
  dosaggio: 'Dose prescritta',
  viaSomministrazione: 'orale',
  tipo: 'periodica',
  stato: 'attiva',
  dataInizio: '2026-01-01',
  dataFine: null,
  fasceMattina: true,
  fascePranzo: false,
  fascePomeriggio: false,
  fasceSera: false,
  fasceNotte: true,
  orarioSpecifico: null,
  prescrittore: 'Medico sintetico',
  operatoreInseritore: null,
  note: null,
  dataSomministrazione: null,
  orarioSomministrazione: null,
  schedules: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} satisfies PatientTherapyAPI;

test('incomplete calendar editor never derives hours from bands or missing times', () => {
  assert.deepEqual(schedulesFromTherapy(rawTherapy, true), []);
  assert.deepEqual(therapyToForm(rawTherapy, { exactTimesOnly: true }).schedules, []);
  assert.equal(
    therapyToForm(rawTherapy, { exactTimesOnly: true }).farmacoNome,
    rawTherapy.farmacoNome,
  );
  // Other legacy entry points retain their existing compatibility behaviour.
  assert.deepEqual(
    schedulesFromTherapy(rawTherapy).map((row) => row.time),
    ['08:00', '22:00'],
  );
});
test('strict editor preserves saved exact/invalid times and quantities for explicit correction', () => {
  assert.deepEqual(
    schedulesFromTherapy({ ...rawTherapy, orarioSpecifico: '07:15,invalid' }, true).map(
      (row) => row.time,
    ),
    ['07:15', 'invalid'],
  );
  const schedules = [
    {
      id: 'schedule-a',
      therapyId: rawTherapy.id,
      time: '07:15',
      fascia: 'mattina',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
  ];
  const form = therapyToForm({ ...rawTherapy, schedules }, { exactTimesOnly: true });
  assert.deepEqual(form.schedules, [
    {
      time: '07:15',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
  ]);
});
test('adding a schedule requires an explicit time rather than a default dose hour', async () => {
  const editor = await readFile(
    new URL('../../components/operator/cartella/TherapyScheduleEditor.tsx', import.meta.url),
    'utf8',
  );
  assert.match(editor, /const addSchedule[\s\S]*?time: ''/);
  assert.doesNotMatch(editor, /time:.*'18:00'/);
});
