import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyTherapyForm } from '../TherapyFormFields';
import { applyTherapyFormChange } from '../therapyFormChange';
import { formToPayload, therapyToForm } from '../therapyFormMapping';
import { therapyFormAtCalendarSlot } from '../../../../lib/therapyCalendarCreate';
import {
  therapyAdmissionDate,
  pendingTherapyAdmissionDates,
  hydrateTherapyAdmissionDates,
} from '../../../../lib/therapyAdmissionDate';
import { facilityLocalDate } from '../../../../lib/facilityTime';
import { durationEnd } from '../therapyQuickSchedule';
import { resolvePresaInCarico } from '../../../../lib/presaInCarico';
import {
  dischargeRowToTherapyForm,
  type DischargeTherapyRow,
} from '../../../shared/intake/dischargeTherapy';
import type { PatientTherapyAPI } from '../../../../types';

test('chart admission source uses saved presa in carico and retained legacy intake dates', () => {
  for (const cartella of [
    { presaInCarico: { dataIngresso: '2026-09-15' }, dataPresa: '2026-08-01' },
    { dataPresa: '2026-09-15' },
  ]) {
    const admission = resolvePresaInCarico(cartella as Parameters<typeof resolvePresaInCarico>[0]);
    assert.equal(emptyTherapyForm(admission?.dataIngresso).dataInizio, '2026-09-15');
  }
});

test('new prescriptions start at admission while one-off doses default to the current round', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  for (const tipo of ['periodica', 'al_bisogno', 'una_tantum'] as const) {
    const form = applyTherapyFormChange(emptyTherapyForm('2026-09-15'), { tipo });
    assert.equal(form.dataInizio, '2026-09-15');
    assert.equal(form.dataSomministrazione, '2026-10-25');
    const payload = formToPayload(form, 'synthetic-patient', 'Synthetic Operator');
    assert.equal(payload.dataInizio, '2026-09-15');
    assert.equal(payload.dataSomministrazione, tipo === 'una_tantum' ? '2026-10-25' : null);
  }
});

test('calendar admission dates survive leap days, DST boundaries and ISO UTC serialization', () => {
  for (const day of ['2024-02-29', '2026-03-29', '2026-10-25', '2027-01-01']) {
    assert.equal(therapyAdmissionDate(day), day);
    assert.equal(therapyAdmissionDate(`${day}T00:00:00.000Z`), day);
    assert.equal(therapyAdmissionDate(`${day}T23:30:00Z`), day);
  }
});

test('missing and invalid admission uses the current Europe/Rome day, even before UTC midnight', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-24T22:30:00Z') });
  for (const value of [undefined, null, '', 'invalid', '2025-02-29', '2026-02-30',
    '2026-13-01', '2026-09-15T25:00:00Z', '2026-09-15 unexpected', 123]) {
    assert.equal(therapyAdmissionDate(value), '2026-10-25');
  }
  const form = emptyTherapyForm();
  assert.equal(form.dataInizio, '2026-10-25');
  assert.equal(form.dataSomministrazione, '2026-10-25');
});

test('operator dates survive type, drug and schedule changes; a fresh form uses its own admission', () => {
  const edited = applyTherapyFormChange(emptyTherapyForm('2026-09-15'), {
    dataInizio: '2026-10-01', dataSomministrazione: '2026-10-02',
  });
  const next = applyTherapyFormChange(edited, {
    tipo: 'una_tantum', farmacoNome: 'Synthetic medicine',
    schedules: [{ ...edited.schedules[0], time: '12:30' }],
  });
  assert.equal(next.dataInizio, '2026-10-01');
  assert.equal(next.dataSomministrazione, '2026-10-02');
  assert.equal(emptyTherapyForm('2026-09-20').dataInizio, '2026-09-20');
  assert.equal(next.dataInizio, '2026-10-01');
});

test('explicit calendar slot overrides admission for both date fields and submission', () => {
  const form = therapyFormAtCalendarSlot(emptyTherapyForm('2026-09-15'), '2026-10-28', '09:30');
  assert.ok(form);
  const payload = formToPayload({ ...form, tipo: 'una_tantum' }, 'synthetic-patient', 'Synthetic Operator');
  assert.equal(payload.dataInizio, '2026-10-28');
  assert.equal(payload.dataSomministrazione, '2026-10-28');
  assert.equal(payload.orarioSomministrazione, '09:30');
});

test('saved prescription dates survive restoring and resubmitting the editor', () => {
  const saved = {
    ...formToPayload({ ...emptyTherapyForm('2026-09-15'), tipo: 'una_tantum',
      dataInizio: '2026-09-17', dataSomministrazione: '2026-09-18' },
    'synthetic-patient', 'Synthetic Operator'),
    id: 'synthetic-therapy',
  } as unknown as PatientTherapyAPI;
  const payload = formToPayload(therapyToForm(saved), saved.patientId, 'Synthetic Operator');
  assert.equal(payload.dataInizio, '2026-09-17');
  assert.equal(payload.dataSomministrazione, '2026-09-18');
});

test('imported explicit dates and reviewed therapy dates retain their original values', () => {
  const row = { farmacoNome: 'Synthetic medicine', dataInizio: '2026-09-01',
    quantita: '1 cpr', orari: ['08:00'] } as DischargeTherapyRow;
  assert.equal(dischargeRowToTherapyForm(row).dataInizio, '2026-09-01');
  const reviewed = { ...emptyTherapyForm('2026-09-15'),
    dataInizio: '2026-08-30', dataSomministrazione: '2026-08-31' };
  const restored = dischargeRowToTherapyForm({ ...row, reviewedTherapy: reviewed });
  assert.equal(restored.dataInizio, '2026-08-30');
  assert.equal(restored.dataSomministrazione, '2026-08-31');
});

test('late valid admission hydrates automatic dates without backdating a dose or changing prescription data', () => {
  const form = { ...emptyTherapyForm(), note: 'Synthetic operator note' };
  const pending = pendingTherapyAdmissionDates(undefined);
  assert.equal(hydrateTherapyAdmissionDates(form, 'invalid', pending), form);
  const hydrated = hydrateTherapyAdmissionDates(form, '2026-09-15', pending);
  assert.equal(hydrated.dataInizio, '2026-09-15');
  assert.equal(hydrated.dataSomministrazione, facilityLocalDate());
  assert.equal(hydrated.note, form.note);
  assert.equal(hydrated.schedules, form.schedules);
  assert.equal(pendingTherapyAdmissionDates('2026-09-15'), null);
});

test('start-only input protects that field while the hidden once date can hydrate', () => {
  const form = { ...emptyTherapyForm(), dataInizio: '2026-10-01' };
  const hydrated = hydrateTherapyAdmissionDates(form, '2026-09-15', {
    dataInizio: false, dataSomministrazione: true,
  });
  assert.equal(hydrated.dataInizio, '2026-10-01');
  assert.equal(hydrated.dataSomministrazione, facilityLocalDate());
});

test('once-only input protects that field while start date can hydrate', () => {
  const form = { ...emptyTherapyForm(), dataSomministrazione: '2026-10-02' };
  const hydrated = hydrateTherapyAdmissionDates(form, '2026-09-15', {
    dataInizio: true, dataSomministrazione: false,
  });
  assert.equal(hydrated.dataInizio, '2026-09-15');
  assert.equal(hydrated.dataSomministrazione, '2026-10-02');
});

test('explicit fallback-day selection and deliberate empty input remain operator-owned', () => {
  for (const dataInizio of [emptyTherapyForm().dataInizio, '']) {
    const form = { ...emptyTherapyForm(), dataInizio };
    const hydrated = hydrateTherapyAdmissionDates(form, '2026-09-15', {
      dataInizio: false, dataSomministrazione: true,
    });
    assert.equal(hydrated.dataInizio, dataInizio);
    assert.equal(hydrated.dataSomministrazione, facilityLocalDate());
  }
});

test('saved/imported/calendar forms without automatic lineage never hydrate', () => {
  const defaults = emptyTherapyForm('2026-09-01');
  const calendar = therapyFormAtCalendarSlot(defaults, '2026-10-28', '09:30');
  assert.ok(calendar);
  for (const form of [defaults, calendar]) {
    assert.equal(hydrateTherapyAdmissionDates(form, '2026-09-15', null), form);
  }
});


test('today and future admissions keep both automatic dates on the admission day', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  for (const day of ['2026-10-25', '2026-10-28']) {
    const form = emptyTherapyForm(day);
    assert.equal(form.dataInizio, day);
    assert.equal(form.dataSomministrazione, day);
  }
});

test('intake automatic fields follow repeated admission corrections independently', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  const automatic = { dataInizio: true, dataSomministrazione: true };
  let form = emptyTherapyForm('2026-10-25');
  for (const day of ['2026-10-20', '2026-10-21', '2026-10-28']) {
    form = hydrateTherapyAdmissionDates(form, day, automatic);
    assert.equal(form.dataInizio, day);
    assert.equal(form.dataSomministrazione, day > '2026-10-25' ? day : '2026-10-25');
  }
  automatic.dataInizio = false;
  form = { ...form, dataInizio: '2026-10-19' };
  form = hydrateTherapyAdmissionDates(form, '2026-10-29', automatic);
  assert.equal(form.dataInizio, '2026-10-19');
  assert.equal(form.dataSomministrazione, '2026-10-29');
});

test('intake explicit once date stays protected across repeated admission corrections', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  // Explicitly selecting the automatic value must still transfer ownership to the operator.
  const automatic = { dataInizio: true, dataSomministrazione: false };
  let form = emptyTherapyForm('2026-10-25');
  for (const day of ['2026-10-28', '2026-10-29']) {
    form = hydrateTherapyAdmissionDates(form, day, automatic);
    assert.equal(form.dataInizio, day);
    assert.equal(form.dataSomministrazione, '2026-10-25');
  }
});

test('undated imports retain their current-day default without manual admission lineage', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  const imported = dischargeRowToTherapyForm({
    farmacoNome: 'Synthetic medicine', quantita: '1 cpr', orari: ['08:00'],
  } as DischargeTherapyRow);
  assert.equal(imported.dataInizio, '2026-10-25');
  assert.equal(hydrateTherapyAdmissionDates(imported, '2026-10-20', null), imported);
});

test('an operator-owned duration keeps its start, end and span when admission arrives', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  const form = emptyTherapyForm();
  const interval = { ...form, dataFine: durationEnd(form.dataInizio, 7) };
  const hydrated = hydrateTherapyAdmissionDates(interval, '2026-09-15', {
    dataInizio: false, dataSomministrazione: true,
  });
  assert.equal(hydrated.dataInizio, '2026-10-25');
  assert.equal(hydrated.dataFine, '2026-10-31');
  assert.equal(hydrated.dataFine, durationEnd(hydrated.dataInizio, 7));
  assert.equal(hydrated.dataSomministrazione, '2026-10-25');
});

test('an empty end stays empty while an automatic start follows admission', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-25T12:00:00Z') });
  const form = emptyTherapyForm();
  const hydrated = hydrateTherapyAdmissionDates(form, '2026-09-15', {
    dataInizio: true, dataSomministrazione: true,
  });
  assert.equal(hydrated.dataInizio, '2026-09-15');
  assert.equal(hydrated.dataFine, '');
});
