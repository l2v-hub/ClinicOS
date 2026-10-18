import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { recordAdministration } from '../therapyAdministrationWrite';
import { getCurrentOperator, setCurrentOperator } from '../operatorSession';

const originalFetch = globalThis.fetch;
const originalOperator = getCurrentOperator();
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
  setCurrentOperator({ id: 'synthetic-nurse', role: 'operatore' });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  setCurrentOperator(originalOperator);
  if (storageDescriptor) Object.defineProperty(globalThis, 'sessionStorage', storageDescriptor);
  else Reflect.deleteProperty(globalThis, 'sessionStorage');
});
const info = {
  patientId: 'synthetic-patient',
  therapyId: 'synthetic-therapy',
  date: '2026-10-12',
  fascia: 'mattina',
  scheduledTime: '08:00',
};

test('uncertain scheduled writes retry the same intent key and retain pending-state precondition', async () => {
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    if (requests.length === 1) throw new Error('response lost');
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const failed = await recordAdministration(info, { kind: 'administered' });
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.match(failed.message, /Esito non verificabile/);
  assert.deepEqual(
    await recordAdministration(info, { kind: 'administered' }, { confirmed: true }),
    { ok: true },
  );
  assert.equal(requests[0].requestId, requests[1].requestId);
  assert.equal(requests[0].expectedStato, 'da_erogare');
  assert.equal(requests[1].expectedStato, 'da_erogare');
  assert.equal(typeof requests[0].requestId, 'string');
});

test('reload storage restores the nonce while outcome and actor remain isolated; no clinical text is stored', async () => {
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const outcome = {
    kind: 'not_administered' as const,
    motivo: 'rifiutata_paziente' as const,
    note: 'Synthetic private clinical note',
  };
  await recordAdministration(info, outcome);
  const key = [...stored.keys()][0];
  assert.ok(key);
  const entry = JSON.parse(stored.get(key)!);
  const restored = 'restored-session-request-nonce';
  stored.set(key, JSON.stringify({ ...entry, requestId: restored }));
  await recordAdministration(info, outcome);
  assert.equal(requests[1].requestId, restored);
  await recordAdministration(info, { kind: 'administered' });
  assert.notEqual(requests[2].requestId, restored);
  setCurrentOperator({ id: 'another-synthetic-nurse', role: 'operatore' });
  await recordAdministration(info, outcome);
  assert.notEqual(requests[3].requestId, restored);
  const bytes = JSON.stringify([...stored]);
  assert.equal(bytes.includes(outcome.note), false);
  assert.equal(bytes.includes(info.patientId), false);
  assert.equal(bytes.includes('synthetic-nurse'), false);
});

test('a role change during request preparation prevents a clinical write under the next identity', async () => {
  let writes = 0;
  globalThis.fetch = (async () => {
    writes++;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  const pending = recordAdministration(info, { kind: 'administered' });
  setCurrentOperator({ id: 'synthetic-oss', role: 'operatore' });
  const result = await pending;
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /sessione è cambiata/);
  assert.equal(writes, 0);
});

test('a late write response cannot report success in a different operator session', async () => {
  let entered!: () => void;
  let release!: (response: Response) => void;
  const reached = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<Response>((resolve) => {
    release = resolve;
  });
  globalThis.fetch = (async () => {
    entered();
    return held;
  }) as typeof fetch;
  const pending = recordAdministration(info, { kind: 'administered' });
  await reached;
  setCurrentOperator({ id: 'synthetic-oss', role: 'operatore' });
  release(new Response('{}', { status: 200 }));
  const result = await pending;
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /sessione è cambiata/);
});

test('uncertain explicit correction keeps its nonce separate from pending confirmation across reload storage', async () => {
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    if (requests.length === 2) throw new Error('correction response lost');
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  await recordAdministration(info, { kind: 'administered' });
  await recordAdministration(info, { kind: 'administered' }, { expectedStato: 'non_erogata' });
  const entry = [...stored.entries()].find(
    ([, value]) => JSON.parse(value).requestId === requests[1].requestId,
  );
  assert.ok(entry);
  stored.set(
    entry[0],
    JSON.stringify({ ...JSON.parse(entry[1]), requestId: 'correction-after-reload' }),
  );
  await recordAdministration(
    info,
    { kind: 'administered' },
    { expectedStato: 'non_erogata', confirmed: true },
  );
  assert.equal(requests[0].expectedStato, 'da_erogare');
  assert.equal(requests[1].expectedStato, 'non_erogata');
  assert.notEqual(requests[0].requestId, requests[1].requestId);
  assert.equal(requests[2].requestId, 'correction-after-reload');
});
