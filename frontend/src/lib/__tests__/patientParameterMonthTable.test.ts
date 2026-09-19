import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientParameterMonthTable } from '../../components/operator/PatientParameterMonthTable';
import type { PatientParameterReading } from '../patientParameterReadings';
Object.assign(globalThis, { React });

test('month rows label actual dates 3 and 20, keeping two distinct readings on day 20', () => {
  const readings: PatientParameterReading[] = [
    '2026-09-20T14:30:00.000Z',
    '2026-09-20T06:00:00.000Z',
    '2026-09-03T07:15:00.000Z',
  ].map((measuredAt, index) => ({
    id: `reading-${index}`,
    requestId: `request-${index}`,
    patientId: 'p1',
    measuredAt,
    createdAt: measuredAt,
    authorName: 'Infermiera QA',
    authorOperatorId: 'qa',
    values: { fc: String(70 + index), note: '<testo clinico>' },
  }));
  const html = renderToStaticMarkup(createElement(PatientParameterMonthTable, { readings }));
  assert.equal((html.match(/<tr>/g) ?? []).length, 4);
  assert.match(html, /20\/09\/2026 16:30/);
  assert.match(html, /20\/09\/2026 08:00/);
  assert.match(html, /03\/09\/2026 09:15/);
  assert.doesNotMatch(html, />0[12]\/09\/2026/);
  assert.match(html, /Una riga per ogni rilevazione salvata/);
  assert.match(html, /Infermiera QA/);
  assert.match(html, /&lt;testo clinico&gt;/);
});
