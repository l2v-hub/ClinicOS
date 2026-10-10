// Real HTTP + PostgreSQL regression for every supported structured assessment.
// Run with node --import tsx, a local synthetic backend and its synthetic patient ID.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tinettiAnswers } from '../backend/src/assessments/__tests__/tinetti-fixture.ts';
import { completeTransfers } from '../backend/src/assessments/__tests__/transfers-fixture.ts';
import { PAPER_VERSIONS } from '../backend/src/assessments/paper/types.ts';
import { PAINAD_VERSION, TRANSFERS_VERSION } from '../backend/src/assessments/types.ts';

const base = process.env.QA_BACKEND_URL ?? 'http://127.0.0.1:3201';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const patientId = process.env.QA_SYNTHETIC_PATIENT_ID;
assert.ok(patientId, 'Provide a patient from the isolated synthetic API audit');
const out = resolve(process.argv[2] ?? '/tmp/clinicos-assessment-lifecycle');
mkdirSync(out, { recursive: true });
const session = await fetch(base + '/auth/simulator/session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identityId: 'SIM-NURSE-1' }),
});
assert.equal(session.status, 201);
const { token } = await session.json();
async function call(method, path, body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Demo-Patient-Id': patientId,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let data;
  try {
    data = JSON.parse(bytes.toString());
  } catch {
    data = bytes;
  }
  return { status: response.status, data };
}
const cases = [
  {
    type: 'painad',
    formVersion: PAINAD_VERSION,
    total: 3,
    answers: {
      respiration: 0,
      negativeVocalization: 1,
      facialExpression: 1,
      bodyLanguage: 1,
      consolability: 0,
    },
  },
  { type: 'postural_transfers', formVersion: TRANSFERS_VERSION, answers: completeTransfers() },
  { type: 'tinetti', formVersion: PAPER_VERSIONS.tinetti, total: 28, answers: tinettiAnswers() },
  {
    type: 'gds15',
    formVersion: PAPER_VERSIONS.gds15,
    total: 5,
    answers: {
      ...Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`q${i + 1}`, false])),
      notes: '',
    },
  },
  {
    type: 'mna',
    formVersion: PAPER_VERSIONS.mna,
    total: 7,
    answers: {
      a: 1,
      b: 2,
      c: 1,
      d: 2,
      e: 1,
      f1: null,
      f2: 0,
      weightKg: null,
      heightM: null,
      calfCm: 29.5,
    },
  },
  {
    type: 'barthel',
    formVersion: PAPER_VERSIONS.barthel,
    total: 85,
    answers: {
      alimentazione: 10,
      igiene: 5,
      curaPersona: 5,
      abbigliamento: 10,
      intestino: 10,
      vescica: 10,
      gabinetto: 5,
      trasferimenti: 15,
      deambulazione: 10,
      scale: 5,
    },
  },
  {
    type: 'ucla_npi_sleep',
    formVersion: PAPER_VERSIONS.ucla_npi_sleep,
    total: 6,
    answers: { frequency: 3, severity: 2, distress: 4 },
  },
];
const results = [];
try {
  for (const scenario of cases) {
    try {
      const body = {
        requestId: randomUUID(),
        type: scenario.type,
        formVersion: scenario.formVersion,
        assessedAt: new Date().toISOString(),
        answers: scenario.answers,
      };
      const created = await call('POST', `/patients/${patientId}/assessments`, body);
      assert.equal(created.status, 201, JSON.stringify(created.data));
      const draft = created.data.assessment;
      const replay = await call('POST', `/patients/${patientId}/assessments`, body);
      assert.equal(replay.status, 200);
      assert.equal(replay.data.assessment.id, draft.id);
      const path = `/patients/${patientId}/assessments/${draft.id}`;
      const finalized = await call('POST', path + '/finalize', {
        requestId: randomUUID(),
        expectedVersion: draft.version,
      });
      assert.equal(finalized.status, 200, JSON.stringify(finalized.data));
      const final = finalized.data.assessment;
      assert.equal(final.status, 'final');
      assert.equal(final.pdf.status, 'ready');
      assert.ok(final.snapshotSha256);
      if (scenario.total !== undefined) assert.equal(final.result.total, scenario.total);
      const reread = await call('GET', path);
      assert.equal(reread.status, 200);
      assert.equal(reread.data.assessment.snapshotSha256, final.snapshotSha256);
      const pdf = await call(
        'GET',
        `/patients/${patientId}/documents/${final.pdf.documentId}/content`,
      );
      assert.equal(pdf.status, 200, JSON.stringify(pdf.data));
      assert.equal(pdf.data.subarray(0, 4).toString(), '%PDF');
      assert.ok(pdf.data.length > 1000);
      const illegalEdit = await call('PATCH', path, {
        answers: scenario.answers,
        expectedVersion: final.version,
        assessedAt: body.assessedAt,
      });
      assert.equal(illegalEdit.status, 409, JSON.stringify(illegalEdit.data));
      results.push({
        type: scenario.type,
        pass: true,
        assessmentId: final.id,
        total: final.result?.total,
        pdfBytes: pdf.data.length,
        snapshotSha256: final.snapshotSha256,
      });
    } catch (error) {
      results.push({ type: scenario.type, pass: false, error: error.message });
    }
  }
} finally {
  await fetch(base + '/auth/simulator/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
writeFileSync(resolve(out, 'results.json'), JSON.stringify({ patientId, results }, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.every((result) => result.pass) ? 0 : 1;
