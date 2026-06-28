// backend/src/ai/__tests__/intake-confirm.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, patchDraft } from '../../intake/draft-service.js';
import { confirmDraft } from '../upload/confirm-service.js';
import { prisma } from '../../lib/prisma.js';

test('confirmDraft creates patient transactionally + is idempotent', async () => {
  const d = await createDraft({ createdById: 'op-test', source: 'manual' });
  await patchDraft(d.id, { anagrafica: { nome: 'IntakeMock', cognome: 'Sintetico', dataNascita: '1970-01-01' } });
  const payload = { patient: { firstName: 'IntakeMock', lastName: 'Sintetico', dateOfBirth: '1970-01-01' }, cartella: { statoRicovero: 'ricoverato' }, confirmDuplicate: true };
  const r1 = await confirmDraft(d.id, payload as any);
  assert.equal(r1.status, 'created');
  const r2 = await confirmDraft(d.id, payload as any); // replay
  assert.equal(r2.status, 'idempotent');
  assert.equal(r2.patient!.id, r1.patient!.id);
  // cleanup
  await prisma.cartella.deleteMany({ where: { patientId: r1.patient!.id } }).catch(()=>{});
  await prisma.patient.delete({ where: { id: r1.patient!.id } }).catch(()=>{});
  await prisma.patientIntakeDraft.delete({ where: { id: d.id } }).catch(()=>{});
});
