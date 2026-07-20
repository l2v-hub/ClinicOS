// backend/src/ai/__tests__/intake-confirm.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, patchDraft } from '../../intake/draft-service.js';
import { confirmDraft } from '../upload/confirm-service.js';
import { prisma } from '../../lib/prisma.js';

test('confirmDraft creates patient transactionally + is idempotent', async () => {
  const d = await createDraft({ createdById: 'op-test', source: 'manual' });
  await patchDraft(d.id, {
    anagrafica: { nome: 'IntakeMock', cognome: 'Sintetico', dataNascita: '1970-01-01' },
  });
  const payload = {
    // #294: CF sintetico valido — obbligatorio per ogni creazione paziente.
    patient: {
      firstName: 'IntakeMock',
      lastName: 'Sintetico',
      dateOfBirth: '1970-01-01',
      codiceFiscale: 'NTKSNT70A01H501G',
    },
    cartella: { statoRicovero: 'ricoverato' },
    confirmDuplicate: true,
  };
  const r1 = await confirmDraft(d.id, payload as any);
  assert.equal(r1.status, 'created');
  const r2 = await confirmDraft(d.id, payload as any); // replay
  assert.equal(r2.status, 'idempotent');
  assert.equal(r2.patient!.id, r1.patient!.id);
  // cleanup
  await prisma.cartella.deleteMany({ where: { patientId: r1.patient!.id } }).catch(() => {});
  await prisma.patient.delete({ where: { id: r1.patient!.id } }).catch(() => {});
  await prisma.patientIntakeDraft.delete({ where: { id: d.id } }).catch(() => {});
});

// #294: il CF è la chiave univoca — la conferma senza CF valido è bloccata; un CF già
// presente è un duplicato certo, non forzabile con confirmDuplicate.
test('confirmDraft: blocks a missing CF and a duplicate CF (not forcible)', async () => {
  const base = {
    firstName: 'IntakeMock',
    lastName: 'Sintetico',
    dateOfBirth: '1970-01-01',
  };

  // 1) Missing CF → hard block, nothing persisted.
  const d1 = await createDraft({ createdById: 'op-test', source: 'manual' });
  await assert.rejects(
    () => confirmDraft(d1.id, { patient: base, confirmDuplicate: true } as any),
    (err: Error) => err.message.includes('Codice fiscale mancante o non valido'),
  );
  const afterBlock = await prisma.patientIntakeDraft.findUnique({ where: { id: d1.id } });
  assert.equal(afterBlock?.status, 'draft');

  // 2) Duplicate CF → hard conflict even with confirmDuplicate (different name/dob,
  // so only the CF key can flag it).
  const cf = 'NTKSNT70A01H501G';
  const d2 = await createDraft({ createdById: 'op-test', source: 'manual' });
  const first = await confirmDraft(d2.id, {
    patient: { ...base, codiceFiscale: cf },
  } as any);
  assert.equal(first.status, 'created');

  const d3 = await createDraft({ createdById: 'op-test', source: 'manual' });
  await assert.rejects(
    () =>
      confirmDraft(d3.id, {
        patient: {
          firstName: 'Altro',
          lastName: 'Omonimo',
          dateOfBirth: '1980-05-05',
          codiceFiscale: ` ${cf.toLowerCase()} `, // normalization must still match
        },
        confirmDuplicate: true,
      } as any),
    (err: Error) => err.message.includes('Codice fiscale già presente'),
  );

  // cleanup
  const pid = first.patient!.id;
  await prisma.cartella.deleteMany({ where: { patientId: pid } }).catch(() => {});
  await prisma.patient.delete({ where: { id: pid } }).catch(() => {});
  for (const draftId of [d1.id, d2.id, d3.id])
    await prisma.patientIntakeDraft.delete({ where: { id: draftId } }).catch(() => {});
});
