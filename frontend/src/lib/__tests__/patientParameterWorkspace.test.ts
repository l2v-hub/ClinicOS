import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientParameterHistory } from '../../components/operator/PatientParameterHistory';
import type { CartellaPaziente } from '../../types';
import type { PatientParameterReading } from '../patientParameterReadings';
import { parameterPeriod, parameterDayInPeriod } from '../patientParameterWorkspace';
import { trendPeriodError, trendTimeDomain } from '../patientParameterTrends';

Object.assign(globalThis, { React });

test('today and seven-day presets are inclusive Rome civil ranges', () => {
  assert.deepEqual(parameterPeriod('today', '2026-09-20'), {
    start: '2026-09-20',
    end: '2026-09-20',
  });
  assert.deepEqual(parameterPeriod('week', '2026-01-03'), {
    start: '2025-12-28',
    end: '2026-01-03',
  });
  const spring = trendTimeDomain(parameterPeriod('today', '2026-03-29'));
  assert.equal(spring[1] - spring[0], 23 * 3600000);
});
test('month, six-month and year use calendar anniversaries rather than fixed-day approximations', () => {
  assert.deepEqual(parameterPeriod('month', '2026-09-20'), {
    start: '2026-08-21',
    end: '2026-09-20',
  });
  assert.deepEqual(parameterPeriod('half-year', '2026-09-20'), {
    start: '2026-03-21',
    end: '2026-09-20',
  });
  assert.deepEqual(parameterPeriod('year', '2026-09-20'), {
    start: '2025-09-21',
    end: '2026-09-20',
  });
});
test('month-end and leap anniversaries clamp, without overflowing into the wrong month', () => {
  assert.deepEqual(parameterPeriod('month', '2026-03-31'), {
    start: '2026-03-01',
    end: '2026-03-31',
  });
  assert.deepEqual(parameterPeriod('month', '2024-03-31'), {
    start: '2024-03-01',
    end: '2024-03-31',
  });
  assert.deepEqual(parameterPeriod('half-year', '2026-08-31'), {
    start: '2026-03-01',
    end: '2026-08-31',
  });
  assert.deepEqual(parameterPeriod('year', '2024-02-29'), {
    start: '2023-03-01',
    end: '2024-02-29',
  });
  assert.equal(trendPeriodError(parameterPeriod('year', '2024-02-29')), null);
});
test('dated legacy entries follow exact period; absent dates are never counted as in-range', () => {
  const period = parameterPeriod('week', '2026-09-20');
  assert.equal(parameterDayInPeriod('2026-09-14', period), true);
  assert.equal(parameterDayInPeriod('2026-09-20', period), true);
  assert.equal(parameterDayInPeriod('2026-09-13', period), false);
  assert.equal(parameterDayInPeriod('2026-09-21', period), false);
  assert.equal(parameterDayInPeriod('', period), false);
});

test('unified values show newest first without mutating the chart source; legacy dates stay separate', () => {
  const readings: PatientParameterReading[] = ['07', '08'].map((hour, index) => ({
    id: `reading-${index}`,
    patientId: 'synthetic-patient',
    requestId: `request-${index}`,
    measuredAt: `2026-09-20T${hour}:00:00.000Z`,
    values: { fc: index === 0 ? '0' : '72' },
    authorOperatorId: 'operator-test',
    authorName: 'Operatore test',
    createdAt: '2026-09-20T08:00:00.000Z',
  }));
  const cartella = {
    parametriVitali: [
      {
        id: 'dated',
        etichetta: 'Parametro precedente',
        valore: 'dato del periodo',
        rilevato: '2026-09-20',
      },
      {
        id: 'outside',
        etichetta: 'Parametro precedente',
        valore: 'dato fuori periodo',
        rilevato: '2026-09-19',
      },
      { id: 'undated', etichetta: 'Parametro precedente', valore: 'dato senza data', rilevato: '' },
    ],
  } as unknown as CartellaPaziente;
  const html = renderToStaticMarkup(
    React.createElement(PatientParameterHistory, {
      readings,
      cartella,
      period: parameterPeriod('today', '2026-09-20'),
    }),
  );
  assert.ok(html.indexOf('10:00') < html.indexOf('09:00'));
  assert.match(html, />0 <small>bpm/);
  assert.match(html, /dato del periodo/);
  assert.doesNotMatch(html, /dato fuori periodo/);
  assert.match(html, /Dati senza data \(1\)/);
  assert.match(html, /Orario non disponibile/);
  assert.deepEqual(
    readings.map((reading) => reading.id),
    ['reading-0', 'reading-1'],
  );
});
