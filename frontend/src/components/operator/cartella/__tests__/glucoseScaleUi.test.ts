import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlucoseAdministrationControl } from '../GlucoseAdministrationControl';
import { emptyTherapyForm, TherapyFormFields } from '../TherapyFormFields';
import { TherapyFormPreview } from '../TherapyFormPreview';
import { formToPayload, therapyToForm } from '../therapyFormMapping';
import { validateGlucoseScaleRows } from '../glucoseScale';
import { administrationBody } from '../../../../lib/therapyAdministrationWrite';
import { buildPatientTherapyDay } from '../../../../lib/patientTherapyCalendar';
import { TherapyGiroRows } from '../../TherapyGiroRows';
import { giroTimes } from '../../../../lib/therapyGiro';
import type { PatientTherapyAPI, TherapySlot } from '../../../../types';

Object.assign(globalThis, { React });
const rows = [{ minMgDl: '200', maxMgDl: '300', units: '6' }];
const protocol = validateGlucoseScaleRows(rows).protocol;
const form = {
  ...emptyTherapyForm(),
  farmacoNome: 'Insulina sintetica',
  doseMode: 'glucose_scale' as const,
  glucoseScale: rows,
};
const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('scale form hides fixed quantity, keeps exact schedule and renders prescription preview', () => {
  const html = render(createElement(TherapyFormFields, { value: form, onChange() {} }));
  assert.match(html, /Schema glicemico prescritto/);
  assert.match(html, /Rilevazione 1/);
  assert.doesNotMatch(html, /id="[^"]+-quantity-0"|Frazioni consentite/);
  assert.match(html, /value="una_tantum"[^>]+disabled|disabled=""[^>]+value="una_tantum"/);
  const preview = render(createElement(TherapyFormPreview, { value: form }));
  assert.match(preview, /Dose secondo glicemia misurata/);
  assert.match(preview, /200–300 mg\/dL → 6 unità/);
  assert.doesNotMatch(preview, /1 compressa/);
});

test('saved scale round trips independently of commercial strength and weekday settings', () => {
  const payload = formToPayload(
    { ...form, giorniSettimana: [1, 3], drugPackageRef: 'synthetic-package' },
    'synthetic-patient',
    'synthetic-operator',
  );
  assert.deepEqual(payload.doseProtocol, protocol);
  assert.equal(payload.drugPackageRef, 'synthetic-package');
  assert.equal(payload.giorniSettimana, '1,3');
  const saved = {
    ...payload,
    id: 'synthetic-therapy',
    dataInizio: '2026-01-01',
    dataFine: null,
    createdAt: '',
    updatedAt: '',
  } as unknown as PatientTherapyAPI;
  assert.deepEqual(therapyToForm(saved).glucoseScale, rows);
  const day = buildPatientTherapyDay([saved], 'synthetic-patient', '2026-10-07');
  assert.equal(day.events[0]?.dose, 'Secondo schema glicemico');
  assert.equal(day.events[0]?.strength, null);
});

test('glucose administration requires measurement and never posts a selected dose', () => {
  const html = render(
    createElement(GlucoseAdministrationControl, {
      protocol,
      target: 'Paziente sintetico',
      sending: false,
      onConfirm() {},
    }),
  );
  assert.match(html, /Glicemia rilevata \(mg\/dL\)/);
  assert.match(html, /disabled=""[^>]*>Conferma somministrazione/);
  const info = {
    patientId: 'p',
    therapyId: 't',
    date: '2026-10-08',
    fascia: 'mattina',
    measuredGlucose: 280,
  };
  const body = administrationBody(info, { kind: 'administered' }, { confirmed: true });
  assert.equal(body.measuredGlucose, 280);
  assert.equal(body.doseUnits, undefined);
  assert.equal(
    administrationBody(info, { kind: 'not_administered', motivo: 'paziente_assente', note: '' })
      .measuredGlucose,
    undefined,
  );
});

test('modern round renders glucose control for writable scale dose and none for read-only', () => {
  const slot: TherapySlot = {
    id: 's',
    fascia: 'mattina',
    label: 'Mattina',
    ora: '08:00',
    summary: { total: 1, pending: 1, administered: 0, notAdministered: 0 },
    patients: [
      {
        patientId: 'p',
        firstName: 'Paziente',
        lastName: 'Sintetico',
        room: '',
        bed: '',
        administrations: [
          {
            administrationId: null,
            therapyId: 't',
            drugName: 'Insulina sintetica',
            dosage: '1 unità',
            quantityLabel: '1 unità',
            route: 'SC',
            scheduledTime: '08:00',
            status: 'pending',
            administeredAt: null,
            administeredBy: null,
            notAdministeredReason: null,
            doseMode: 'glucose_scale',
            doseProtocol: protocol,
          },
        ],
      },
    ],
  };
  const time = giroTimes([slot])[0];
  const html = render(
    createElement(TherapyGiroRows, { time, date: '2026-10-08', filtro: 'tutte' }),
  );
  assert.match(html, /Secondo schema glicemico/);
  assert.match(html, /Glicemia rilevata/);
  assert.doesNotMatch(html, /class="giro-drug__cap">1 unità/);
  const readOnly = render(
    createElement(TherapyGiroRows, { time, date: '2026-10-08', filtro: 'tutte', readOnly: true }),
  );
  assert.doesNotMatch(readOnly, /Glicemia rilevata|Conferma somministrazione/);
});
