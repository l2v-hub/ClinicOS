// Invocability + parity: drugs.search / drugs.strengths reach the SAME services as
// routes/farmaci.ts (cercaPaginaFarmaci, dosaggiInCommercio). The test DB catalog may be empty,
// so a minimal, uniquely named Farmaco (+ principio attivo) is seeded and removed afterwards.
// drugs.reload / drugs.document are not tools (external AIFA side effects) and are never called.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import farmaciRouter from '../../routes/farmaci.js';
import { invalidaIndice } from '../../services/farmaci/ricerca.js';
import { createToolRegistry } from '../registry.js';
import { drugTools } from '../capabilities/drugs.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  ctxOf,
  restoreAudit,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(drugTools);
const letters = Array.from({ length: 6 }, () =>
  String.fromCharCode(65 + Math.floor(Math.random() * 26)),
).join('');
const NAME = `ZTOOLFARM${letters}`;
const PA = `ZTOOLPRINC${letters}`;
const AIC = `9${String(Date.now()).slice(-8)}`;
let op: TestOperator;

before(async () => {
  captureAudit();
  op = await createOperator('drugs-op');
  await prisma.farmaco.create({
    data: {
      aic: AIC,
      denominazione: NAME,
      denominazioneNorm: NAME,
      descrizione: '20 COMPRESSE',
      statoAmministrativo: 'Autorizzata',
      forma: 'Compressa',
      paAssociati: PA,
      principiAttivi: {
        create: [
          { principioAttivo: PA, principioAttivoNorm: PA, quantita: 500, unitaMisura: 'mg' },
          { principioAttivo: PA, principioAttivoNorm: PA, quantita: 250, unitaMisura: 'mg' },
        ],
      },
    },
  });
  invalidaIndice();
});

after(async () => {
  restoreAudit();
  await prisma.farmaco.deleteMany({ where: { aic: AIC } });
  invalidaIndice();
  await cleanup([op], []);
});

type SearchPage = { query: string; risultati?: Array<{ aic: string }> } & Record<string, unknown>;

test('drugs.search: finds the seeded drug by name, same payload as GET /farmaci/cerca', async () => {
  const viaTool = await registry.invoke<SearchPage>(
    'drugs.search',
    { query: { q: NAME.toLowerCase() } },
    ctxOf(op),
  );
  assert.equal(viaTool.ok, true, JSON.stringify(viaTool));
  if (!viaTool.ok) return;
  assert.equal(viaTool.data.query, NAME.toLowerCase());
  assert.match(JSON.stringify(viaTool.data), new RegExp(AIC));

  const http = await serve('/farmaci', farmaciRouter);
  try {
    const response = await fetch(`${http.base}/farmaci/cerca?q=${NAME.toLowerCase()}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(viaTool.data)));
  } finally {
    await http.close();
  }
});

test('drugs.search: by active ingredient (pa=1) finds the seeded drug; invalid input → invalid_input', async () => {
  const byPa = await registry.invoke<SearchPage>(
    'drugs.search',
    { query: { q: PA, pa: '1' } },
    ctxOf(op),
  );
  assert.equal(byPa.ok, true, JSON.stringify(byPa));
  if (byPa.ok) assert.match(JSON.stringify(byPa.data), new RegExp(AIC));

  const tooLong = await registry.invoke(
    'drugs.search',
    { query: { q: 'A'.repeat(81) } },
    ctxOf(op),
  );
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.error.code, 'invalid_input');
  const badLimit = await registry.invoke(
    'drugs.search',
    { query: { q: NAME, limite: '99' } },
    ctxOf(op),
  );
  assert.equal(badLimit.ok, false);
  if (!badLimit.ok) assert.equal(badLimit.error.code, 'invalid_input');
  const badPa = await registry.invoke('drugs.search', { query: { q: NAME, pa: 'yes' } }, ctxOf(op));
  assert.equal(badPa.ok, false);
  if (!badPa.ok) assert.equal(badPa.error.code, 'invalid_input');
});

test('drugs.strengths: marketed strengths for the seeded ingredient, same payload as GET /farmaci/dosaggi', async () => {
  const viaTool = await registry.invoke<{
    principioAttivo: string;
    dosaggi: Array<{ quantita: number; unita: string }>;
  }>('drugs.strengths', { query: { pa: ` ${PA} ` } }, ctxOf(op));
  assert.equal(viaTool.ok, true, JSON.stringify(viaTool));
  if (!viaTool.ok) return;
  assert.equal(viaTool.data.principioAttivo, PA);
  assert.deepEqual(viaTool.data.dosaggi, [
    { quantita: 250, unita: 'mg' },
    { quantita: 500, unita: 'mg' },
  ]);

  const http = await serve('/farmaci', farmaciRouter);
  try {
    const response = await fetch(`${http.base}/farmaci/dosaggi?pa=${PA}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), viaTool.data);
  } finally {
    await http.close();
  }

  const tooLong = await registry.invoke(
    'drugs.strengths',
    { query: { pa: 'A'.repeat(81) } },
    ctxOf(op),
  );
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.error.code, 'invalid_input');
  const blank = await registry.invoke('drugs.strengths', { query: { pa: '   ' } }, ctxOf(op));
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.equal(blank.error.code, 'invalid_input');
});
