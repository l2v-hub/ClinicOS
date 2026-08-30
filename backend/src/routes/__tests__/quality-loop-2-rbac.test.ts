import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';

process.env.AUTH_MODE = 'demo';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:9/clinicos_test';

test('maintenance and ownerless legacy intake routes require a privileged role', async (t) => {
  const [
    { default: aiJobsRouter },
    {
      default: patientIntakeRouter,
      LEGACY_INTAKE_EXISTS_SELECT,
      LEGACY_INTAKE_LIST_SELECT,
      MAX_LEGACY_INTAKE_DOCUMENTS,
      legacyIntakeDocumentsQuery,
      boundLegacyIntakeDocuments,
    },
  ] = await Promise.all([import('../ai-jobs.js'), import('../patient-intake.js')]);
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/ai/extraction/jobs', aiJobsRouter);
  app.use('/patient-intake', patientIntakeRouter);

  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}`;
  const operatorHeaders = {
    'Content-Type': 'application/json',
    'X-Operator-Id': 'operator-a',
    'X-Operator-Role': 'operatore',
  };

  const sweep = await fetch(`${base}/ai/extraction/jobs/sweep`, {
    method: 'POST',
    headers: operatorHeaders,
  });
  assert.equal(sweep.status, 403);

  const legacyAsOperator = await fetch(`${base}/patient-intake/discharge-letter/upload`, {
    method: 'POST',
    headers: operatorHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(legacyAsOperator.status, 403);
  assert.equal(legacyAsOperator.headers.get('cache-control'), 'private, no-store');

  const anonymousDocuments = await fetch(`${base}/patient-intake/documents/patient-a`);
  assert.equal(anonymousDocuments.status, 401);
  assert.equal(anonymousDocuments.headers.get('cache-control'), 'private, no-store');

  const operatorDocuments = await fetch(`${base}/patient-intake/documents/patient-a`, {
    headers: operatorHeaders,
  });
  assert.equal(operatorDocuments.status, 403);
  assert.equal(operatorDocuments.headers.get('cache-control'), 'private, no-store');

  const legacyAsManager = await fetch(`${base}/patient-intake/discharge-letter/upload`, {
    method: 'POST',
    headers: { ...operatorHeaders, 'X-Operator-Role': 'manager' },
    body: JSON.stringify({}),
  });
  assert.equal(legacyAsManager.status, 400);
  assert.equal(legacyAsManager.headers.get('cache-control'), 'private, no-store');
  assert.equal(legacyAsManager.headers.get('deprecation'), 'true');
  assert.ok(legacyAsManager.headers.get('sunset'));

  assert.deepEqual(LEGACY_INTAKE_EXISTS_SELECT, { id: true });
  assert.equal('fileData' in LEGACY_INTAKE_EXISTS_SELECT, false);
  assert.equal('ocrText' in LEGACY_INTAKE_EXISTS_SELECT, false);
  assert.equal('extractedData' in LEGACY_INTAKE_EXISTS_SELECT, false);

  assert.deepEqual(LEGACY_INTAKE_LIST_SELECT, {
    id: true,
    fileName: true,
    fileType: true,
    status: true,
    operatoreNome: true,
    createdAt: true,
  });
  for (const sensitiveField of ['fileData', 'ocrText', 'extractedData']) {
    assert.equal(sensitiveField in LEGACY_INTAKE_LIST_SELECT, false);
  }

  const query = legacyIntakeDocumentsQuery('patient-a');
  assert.deepEqual(query.where, { patientId: 'patient-a' });
  assert.equal(query.select, LEGACY_INTAKE_LIST_SELECT);
  assert.deepEqual(query.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
  assert.equal(query.take, MAX_LEGACY_INTAKE_DOCUMENTS + 1);

  const sentinelRows = Array.from({ length: MAX_LEGACY_INTAKE_DOCUMENTS + 1 }, (_, id) => id);
  const bounded = boundLegacyIntakeDocuments(sentinelRows);
  assert.equal(bounded.truncated, true);
  assert.equal(bounded.documents.length, MAX_LEGACY_INTAKE_DOCUMENTS);
  assert.equal(bounded.documents.at(-1), MAX_LEGACY_INTAKE_DOCUMENTS - 1);

  const short = boundLegacyIntakeDocuments([1, 2]);
  assert.equal(short.truncated, false);
  assert.deepEqual(short.documents, [1, 2]);
});
