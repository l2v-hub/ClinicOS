import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { prisma } from '../../lib/prisma.js';
import { confirmJob, confirmDraft } from '../upload/confirm-service.js';
import { actor, patient, foreign, seed } from '../../assessments/__tests__/fixture.js';
before(seed);
after(() => prisma.$disconnect());
const job = () =>
  prisma.importJob.create({
    data: {
      status: 'review_ready',
      createdById: actor.id,
      maxFiles: 5,
      maxTotalBytes: 5_000_000,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
const identity = {
  firstName: 'NRS ingresso',
  lastName: 'Sintetico',
  dateOfBirth: '1970-01-01',
  phone: '+39 333 000 0015',
};
const denied = (error: any) => error.status === 409 && error.code === 'nrs_legacy_read_only';

test('existing import rejects NRS mutation atomically and preserves both legacy arrays on equal/omitted input', async () => {
  const nrs = [
    { id: 'historical', dolore: 0, note: 'Nessun autore inventato\nΩ' },
    { id: 'missing' },
  ];
  const tinetti = [{ id: 'historical-tinetti', alzarsi: -1 }];
  await prisma.cartella.update({
    where: { patientId: patient },
    data: { data: { valutazioniNRS: nrs, valutazioniTinetti: tinetti, ordinary: 'before' } },
  });
  const pending = await job(),
    target = { patient: identity, mode: 'existing' as const, patientId: patient };
  await assert.rejects(
    confirmJob(
      pending.id,
      { ...target, cartella: { ordinary: 'reject', valutazioniNRS: [] } },
      actor,
    ),
    denied,
  );
  assert.equal(
    (await prisma.importJob.findUniqueOrThrow({ where: { id: pending.id } })).status,
    'review_ready',
  );
  assert.deepEqual(
    (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data,
    { valutazioniNRS: nrs, valutazioniTinetti: tinetti, ordinary: 'before' },
  );
  const reordered = nrs.map((row) => Object.fromEntries(Object.entries(row).reverse()));
  await confirmJob(
    pending.id,
    {
      ...target,
      cartella: {
        valutazioniNRS: reordered,
        valutazioniTinetti: tinetti,
        parametriVitali: [{ id: 'vital', etichetta: 'NRS', valore: '6' }],
      },
    },
    actor,
  );
  const saved = (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } }))
    .data as any;
  assert.deepEqual(saved.valutazioniNRS, nrs, 'merge must not duplicate key-reordered history');
  assert.deepEqual(saved.valutazioniTinetti, tinetti);
  assert.equal(saved.parametriVitali[0].valore, '6');
  const omitted = await job();
  await confirmJob(omitted.id, { ...target, cartella: { ordinary: 'after' } }, actor);
  assert.deepEqual(
    ((await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data as any)
      .valutazioniNRS,
    nrs,
  );
  assert.equal((await confirmJob(omitted.id, target, actor)).status, 'idempotent');
  const wrongScope = await job();
  await assert.rejects(
    confirmJob(wrongScope.id, { ...target, patientId: foreign }, actor),
    (error: any) => error.kind === 'not_found',
  );
});

test('NRS import has no absent/empty exception and rejected new-patient writes fully roll back', async () => {
  for (const value of [[], null, [{ id: 'injected', dolore: 2 }]]) {
    const pending = await job(),
      before = await prisma.patient.count();
    await assert.rejects(
      confirmJob(pending.id, { patient: identity, cartella: { valutazioniNRS: value } }, actor),
      denied,
    );
    assert.equal(await prisma.patient.count(), before);
    const unchanged = await prisma.importJob.findUniqueOrThrow({ where: { id: pending.id } });
    assert.equal(unchanged.status, 'review_ready');
    assert.equal(unchanged.createdPatientId, null);
  }
  for (const value of [null, []]) {
    await prisma.cartella.update({
      where: { patientId: patient },
      data: { data: { valutazioniNRS: value } },
    });
    const target = { patient: identity, mode: 'existing' as const, patientId: patient };
    const equal = await job();
    await confirmJob(equal.id, { ...target, cartella: { valutazioniNRS: value } }, actor);
    const beforeChange = (
      await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })
    ).data;
    assert.deepEqual((beforeChange as any).valutazioniNRS, value);
    const changed = await job();
    await assert.rejects(
      confirmJob(
        changed.id,
        { ...target, cartella: { valutazioniNRS: value === null ? [] : null } },
        actor,
      ),
      denied,
    );
    assert.deepEqual(
      (await prisma.cartella.findUniqueOrThrow({ where: { patientId: patient } })).data,
      beforeChange,
    );
  }
});

test('confirming an old intake draft retains pain JSON without promoting it to Cartella', async () => {
  const pain = [
    { id: 'old-draft-pain', dolore: -1, note: 'Originale\nConservato' },
    null,
    { value: 0 },
  ];
  const draft = await prisma.patientIntakeDraft.create({
    data: {
      source: 'manual',
      createdById: actor.id,
      data: { dolore: pain, ingresso: { note: 'input untouched' } },
    },
  });
  const result = await confirmDraft(
    draft.id,
    {
      patient: { ...identity, firstName: 'Draft conservato' },
      cartella: { parametriVitali: [{ id: 'nrs-vital', valore: '4', etichetta: 'NRS' }] },
    },
    actor,
  );
  assert.equal(result.status, 'created');
  const saved = await prisma.patientIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } });
  assert.equal(saved.status, 'confirmed');
  assert.deepEqual((saved.data as any).dolore, pain);
  assert.deepEqual((saved.data as any).ingresso, { note: 'input untouched' });
  const chart = (
    await prisma.cartella.findUniqueOrThrow({ where: { patientId: result.patient!.id } })
  ).data as any;
  assert(!Object.hasOwn(chart, 'valutazioniNRS'));
  assert.equal(chart.parametriVitali[0].valore, '4');
});
