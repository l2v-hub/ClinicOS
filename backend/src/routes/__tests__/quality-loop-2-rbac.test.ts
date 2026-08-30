import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';

process.env.AUTH_MODE = 'demo';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:9/clinicos_test';

test('maintenance and ownerless legacy intake routes require a privileged role', async (t) => {
  const [{ default: aiJobsRouter }, { default: patientIntakeRouter, LEGACY_INTAKE_EXISTS_SELECT }] =
    await Promise.all([import('../ai-jobs.js'), import('../patient-intake.js')]);
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
});
