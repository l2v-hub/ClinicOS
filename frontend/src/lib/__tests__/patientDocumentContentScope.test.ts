import assert from 'node:assert/strict';
import test from 'node:test';
import { openScopedPatientDocument } from '../patientDocumentContent';

test('a delayed document response cannot open after patient or session scope changes', async () => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let currentScope = 'patient-a/operator-a';
  const opened: string[] = [];
  const objectUrls: string[] = [];
  const controller = new AbortController();

  const pending = openScopedPatientDocument({
    url: '/patients/patient-a/documents/doc-a/content',
    signal: controller.signal,
    getHeaders: async () => ({ Authorization: 'Bearer test' }),
    isCurrent: () => currentScope === 'patient-a/operator-a',
    fetchImpl: async () => {
      await responseGate;
      return new Response(new Blob(['protected']), { status: 200 });
    },
    createObjectUrl: () => {
      objectUrls.push('blob:protected');
      return 'blob:protected';
    },
    revokeObjectUrl: () => undefined,
    openWindow: (url) => opened.push(url),
    scheduleRevoke: () => undefined,
  });

  currentScope = 'patient-b/operator-b';
  releaseResponse();

  assert.equal(await pending, 'stale');
  assert.deepEqual(objectUrls, []);
  assert.deepEqual(opened, []);
});

test('an aborted document request cannot create or open a blob URL', async () => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const controller = new AbortController();
  let created = false;
  let opened = false;

  const pending = openScopedPatientDocument({
    url: '/patients/patient-a/documents/doc-a/content',
    signal: controller.signal,
    getHeaders: async () => ({}),
    isCurrent: () => true,
    fetchImpl: async () => {
      await responseGate;
      return new Response(new Blob(['protected']), { status: 200 });
    },
    createObjectUrl: () => {
      created = true;
      return 'blob:protected';
    },
    openWindow: () => {
      opened = true;
    },
    scheduleRevoke: () => undefined,
  });

  controller.abort();
  releaseResponse();

  assert.equal(await pending, 'stale');
  assert.equal(created, false);
  assert.equal(opened, false);
});
