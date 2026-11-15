// API dati sintetici — guardie. Nessun test qui scrive o cancella dati: il giro completo
// seed → wipe → seed è in `synthetic-data-destructive-db.test.ts` (opt-in).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  createPatientOwnedBy,
  login,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { WIPE_CONFIRMATION, syntheticDataAvailability } from '../index.js';
import { PRESERVED_TABLES, WIPED_TABLES } from '../wipe.js';

const schema = readFileSync(new URL('../../../../prisma/schema.prisma', import.meta.url), 'utf8');

test('syntheticDataAvailability: mai in produzione, demo solo sintetica, staging solo con flag', () => {
  const at = (env: Record<string, string>) => syntheticDataAvailability(env as NodeJS.ProcessEnv);
  assert.equal(at({ NODE_ENV: 'development' }).enabled, true);
  assert.equal(at({ NODE_ENV: 'test' }).enabled, true);

  // Produzione reale: nessuna combinazione di variabili la riabilita.
  for (const env of [
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', CLINICOS_ENV: 'production' },
    { NODE_ENV: 'production', CLINICOS_ENV: 'production', SYNTHETIC_DATA_API_ENABLED: 'true' },
    { NODE_ENV: 'production', CLINICOS_ENV: 'production', DEMO_DATASET_ID: 'synthetic-v1' },
    // Tier scritto male = produzione (fail closed).
    { NODE_ENV: 'development', CLINICOS_ENV: 'prod', SYNTHETIC_DATA_API_ENABLED: 'true' },
  ]) {
    const result = at(env);
    assert.equal(result.enabled, false, JSON.stringify(env));
    assert.equal(result.tier, 'production');
  }

  assert.equal(at({ NODE_ENV: 'production', DEMO_DATASET_ID: 'synthetic-v1' }).enabled, true);
  assert.equal(
    at({ NODE_ENV: 'production', CLINICOS_ENV: 'demo', DEMO_DATASET_ID: 'synthetic-v1' }).enabled,
    true,
  );
  assert.equal(at({ NODE_ENV: 'production', CLINICOS_ENV: 'demo' }).enabled, false);

  assert.equal(at({ NODE_ENV: 'production', CLINICOS_ENV: 'staging' }).enabled, false);
  assert.equal(
    at({ NODE_ENV: 'production', CLINICOS_ENV: 'staging', SYNTHETIC_DATA_API_ENABLED: 'true' })
      .enabled,
    true,
  );
});

test('ogni tabella dello schema è dichiarata: svuotata oppure conservata, mai dimenticata', () => {
  const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((match) => match[1]).sort();
  const declared = [...WIPED_TABLES, ...PRESERVED_TABLES].sort();
  assert.deepEqual(
    declared,
    models,
    'aggiorna WIPED_TABLES o PRESERVED_TABLES in synthetic/wipe.ts',
  );
  assert.equal(new Set(declared).size, declared.length, 'una tabella è in entrambe le liste');
  // Le identità di accesso, la policy e l'audit non devono mai finire fra le tabelle svuotate.
  for (const table of ['User', 'Operator', 'AuthzPolicyVersion', 'AiAuditEvent'])
    assert.equal((WIPED_TABLES as readonly string[]).includes(table), false, table);
});

let base = '';
let close: () => Promise<void>;
let admin: Session;
let nurse: Session;
let sentinelId = '';
const savedEnv = { tier: process.env.CLINICOS_ENV, dataset: process.env.DEMO_DATASET_ID };

before(async () => {
  ({ base, close } = await startApp());
  admin = await login(base, 'SIM-ADMIN');
  nurse = await login(base, 'SIM-NURSE-1');
  sentinelId = (await createPatientOwnedBy('SIM-NURSE-1', 'synthetic-guard')).id;
});

after(async () => {
  process.env.CLINICOS_ENV = savedEnv.tier;
  if (savedEnv.tier === undefined) delete process.env.CLINICOS_ENV;
  if (savedEnv.dataset === undefined) delete process.env.DEMO_DATASET_ID;
  await prisma.patient.deleteMany({ where: { id: sentinelId } });
  await close();
});

test('identità e ruolo: anonimo 401, ruolo clinico 403, amministratore 200', async () => {
  for (const [method, path] of [
    ['GET', '/admin/synthetic-data'],
    ['POST', '/admin/synthetic-data/seed'],
    ['POST', '/admin/synthetic-data/wipe'],
  ] as const) {
    const body = method === 'GET' ? undefined : { confirm: WIPE_CONFIRMATION };
    assert.equal((await call(base, null, method, path, body)).status, 401, `${method} ${path}`);
    const denied = await call(base, nurse, method, path, body);
    assert.equal(denied.status, 403, `${method} ${path}`);
    assert.equal(denied.body.code, 'capability_denied');
  }
  const status = await call(base, admin, 'GET', '/admin/synthetic-data');
  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, true);
  assert.equal(status.body.confirmation, WIPE_CONFIRMATION);
  assert.equal(typeof status.body.counts.patients, 'number');
});

test('wipe: senza la frase di conferma esatta non viene eliminato nulla', async () => {
  for (const body of [
    undefined,
    {},
    { confirm: 'si' },
    { confirm: WIPE_CONFIRMATION.toLowerCase() },
  ]) {
    const response = await call(base, admin, 'POST', '/admin/synthetic-data/wipe', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.body.code, 'confirmation_required');
  }
  assert.ok(await prisma.patient.findUnique({ where: { id: sentinelId } }), 'paziente intatto');
  // Il tentativo resta tracciato dal route gate con l'identità di chi l'ha fatto.
  const audit = await waitForAudit({ actionType: 'synthetic_data.wipe', operatorId: 'SIM-ADMIN' });
  assert.ok(audit, 'audit del tentativo di wipe');
  assert.equal(audit!.outcome, 'error');
});

test('ambiente non ammesso: seed e wipe confermato rispondono 403 e non toccano i dati', async () => {
  // Demo senza dataset sintetico dichiarato: i dati potrebbero non essere di prova.
  process.env.CLINICOS_ENV = 'demo';
  delete process.env.DEMO_DATASET_ID;
  try {
    const before = await prisma.patient.count();
    const seed = await call(base, admin, 'POST', '/admin/synthetic-data/seed', {});
    assert.equal(seed.status, 403);
    assert.equal(seed.body.code, 'synthetic_data_disabled');
    const wipe = await call(base, admin, 'POST', '/admin/synthetic-data/wipe', {
      confirm: WIPE_CONFIRMATION,
    });
    assert.equal(wipe.status, 403);
    assert.equal(wipe.body.code, 'synthetic_data_disabled');
    assert.equal(wipe.body.tier, 'demo');
    assert.equal(await prisma.patient.count(), before);
    assert.ok(await prisma.patient.findUnique({ where: { id: sentinelId } }));
    const status = await call(base, admin, 'GET', '/admin/synthetic-data');
    assert.equal(status.body.enabled, false);
  } finally {
    process.env.CLINICOS_ENV = savedEnv.tier;
    if (savedEnv.tier === undefined) delete process.env.CLINICOS_ENV;
    if (savedEnv.dataset !== undefined) process.env.DEMO_DATASET_ID = savedEnv.dataset;
  }
});
