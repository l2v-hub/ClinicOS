import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { createAssessment, finalizeAssessment, getAssessment } from '../service.js';
import { attestAssessment, listAttestations } from '../attestations.js';
import { retryAssessmentPdf } from '../pdf-service.js';
import { actor, other, manager, patient, foreign, seed, server, headers } from './fixture.js';
import { transfersInput } from './transfers-fixture.js';
before(seed);
after(() => prisma.$disconnect());
async function final(extra: Record<string, unknown> = {}) {
  const draft = (await createAssessment(patient, transfersInput(extra), actor)).assessment;
  return (
    await finalizeAssessment(
      patient,
      draft.id,
      { requestId: randomUUID(), expectedVersion: 1 },
      actor,
    )
  ).assessment;
}
const body = (hash: string, kind = 'operator_acknowledgement') => ({ kind, snapshotSha256: hash });
test('personal confirmations use exact DB qualification and frozen server identity, with durable replay', async () => {
  const saved = await final();
  const hash = saved.snapshotSha256!;
  await assert.rejects(
    attestAssessment(patient, saved.id, body(hash, 'physiotherapist_confirmation'), manager),
    (e: any) => e.status === 403,
  );
  await assert.rejects(
    attestAssessment(patient, saved.id, { ...body(hash), actorId: actor.id }, actor),
    (e: any) => e.status === 400,
  );
  await assert.rejects(
    attestAssessment(patient, saved.id, body('0'.repeat(64)), actor),
    (e: any) => e.code === 'assessment_snapshot_conflict',
  );
  for (const qualification of [
    'fisioterapia',
    'Fisioterapista abilitato',
    'infermiere',
    'vfisioterapistav',
  ]) {
    await prisma.operator.update({ where: { id: actor.id }, data: { qualifica: qualification } });
    await assert.rejects(
      attestAssessment(patient, saved.id, body(hash, 'physiotherapist_confirmation'), actor),
      (e: any) => e.status === 403,
    );
  }
  await assert.rejects(
    prisma.patientAssessmentAttestation.create({
      data: {
        assessmentId: saved.id,
        snapshotSha256: hash,
        kind: 'physiotherapist_confirmation',
        actorOperatorId: actor.id,
        actorName: 'Forged',
      },
    }),
  );
  const [normalized] = await prisma.$queryRaw<
    Array<{ invalid: string; valid: string }>
  >`SELECT assessment_qualification('vfisioterapistav') AS invalid,assessment_qualification(chr(11)||'Fisioterapista'||chr(11)) AS valid`;
  assert.deepEqual(normalized, { invalid: 'vfisioterapistav', valid: 'fisioterapista' });
  await prisma.operator.update({
    where: { id: actor.id },
    data: { qualifica: ' \t\u000bFisioterapista\u000b\n ' },
  });
  const confirmed = await attestAssessment(
    patient,
    saved.id,
    body(hash, 'physiotherapist_confirmation'),
    actor,
  );
  assert.equal(confirmed.replayed, false);
  assert.equal(confirmed.attestation.actor.name, 'Élodie Παπαδόπουλος');
  assert.equal(
    confirmed.attestation.actor.registeredQualification,
    ' \t\u000bFisioterapista\u000b\n ',
  );
  assert.equal(confirmed.attestation.snapshotSha256, hash);
  const attempts = await Promise.all(
    Array.from({ length: 6 }, () => attestAssessment(patient, saved.id, body(hash), actor)),
  );
  assert.equal(attempts.filter((r) => !r.replayed).length, 1);
  assert(attempts.every((r) => r.attestation.id === attempts[0].attestation.id));
  const page = await listAttestations(patient, saved.id, {}, actor);
  assert.deepEqual(page.counts, { physiotherapist_confirmation: 1, operator_acknowledgement: 1 });
  assert.equal(page.me.attestedKinds.length, 2);
  assert.equal(page.snapshotSha256, hash);
  const [time] = await prisma.$queryRaw<
    Array<{ createdAt: string }>
  >`SELECT to_char("createdAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt" FROM "PatientAssessmentAttestation" WHERE id=${confirmed.attestation.id}`;
  assert.equal(confirmed.attestation.createdAt, time.createdAt);
  await prisma.operator.update({ where: { id: actor.id }, data: { qualifica: null } });
  const replay = await attestAssessment(
    patient,
    saved.id,
    body(hash, 'physiotherapist_confirmation'),
    actor,
  );
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.attestation, confirmed.attestation);
  assert.deepEqual((await listAttestations(patient, saved.id, {}, actor)).me.allowedKinds, [
    'operator_acknowledgement',
  ]);
});
test('revoked qualification is re-read after the real operator lock before a new confirmation', async () => {
  const saved = await final();
  await prisma.operator.update({ where: { id: actor.id }, data: { qualifica: 'fisioterapista' } });
  let locked!: () => void, release!: () => void;
  const acquired = new Promise<void>((ok) => {
      locked = ok;
    }),
    gate = new Promise<void>((ok) => {
      release = ok;
    });
  const blocker = prisma.$transaction(async (tx) => {
    await tx.operator.update({ where: { id: actor.id }, data: { qualifica: null } });
    locked();
    await gate;
  });
  await acquired;
  const pending = attestAssessment(
    patient,
    saved.id,
    body(saved.snapshotSha256!, 'physiotherapist_confirmation'),
    actor,
  ).then(
    (r) => r,
    (e) => e,
  );
  try {
    const deadline = Date.now() + 2500;
    while (true) {
      const [{ waiting }] = await prisma.$queryRaw<
        Array<{ waiting: boolean }>
      >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%FOR SHARE OF o,u%') AS waiting`;
      if (waiting) break;
      assert(Date.now() < deadline, 'Expected real operator lock wait');
      await new Promise((ok) => setTimeout(ok, 20));
    }
  } finally {
    release();
    await blocker;
  }
  const rejected = await pending;
  assert.equal(rejected.status, 403);
  assert.equal(
    await prisma.patientAssessmentAttestation.count({ where: { assessmentId: saved.id } }),
    0,
  );
});
test('attestations are append-only and never rewrite the PDF or transfer to a correction', async () => {
  const saved = await final();
  const ready = await retryAssessmentPdf(patient, saved.id, actor);
  assert.equal(ready.pdf!.status, 'ready');
  const beforeDoc = await prisma.patientDocument.findUniqueOrThrow({
    where: { id: ready.pdf!.documentId! },
  });
  const event = await attestAssessment(patient, saved.id, body(saved.snapshotSha256!), manager);
  await assert.rejects(
    prisma.patientAssessmentAttestation.update({
      where: { id: event.attestation.id },
      data: { actorName: 'Forged' },
    }),
  );
  await assert.rejects(
    prisma.patientAssessmentAttestation.delete({ where: { id: event.attestation.id } }),
  );
  assert.deepEqual(
    await prisma.patientDocument.findUniqueOrThrow({ where: { id: beforeDoc.id } }),
    beforeDoc,
  );
  const unchanged = await getAssessment(patient, saved.id, actor);
  assert.equal(unchanged.version, saved.version);
  assert.deepEqual(unchanged.finalSnapshot, saved.finalSnapshot);
  const correction = await final({
    assessedAt: saved.assessedAt,
    predecessorId: saved.id,
    correctionReason: 'Verifica successiva',
  });
  assert.equal((await listAttestations(patient, saved.id, {}, actor)).correctedById, correction.id);
  assert.deepEqual((await listAttestations(patient, correction.id, {}, actor)).counts, {
    physiotherapist_confirmation: 0,
    operator_acknowledgement: 0,
  });
});
test('attestation counts, personal state and pages are bounded and current-scope protected', async () => {
  const saved = await final();
  for (let n = 0; n < 27; n++) {
    const who = { id: randomUUID(), role: 'manager' };
    await prisma.user.create({
      data: {
        email: `${who.id}@example.test`,
        fullName: `Collega ${n}`,
        passwordHash: 'synthetic',
        operator: { create: { id: who.id } },
      },
    });
    await attestAssessment(patient, saved.id, body(saved.snapshotSha256!), who);
  }
  const page = await listAttestations(patient, saved.id, {}, actor);
  assert.equal(page.items.length, 25);
  assert.equal(page.counts.operator_acknowledgement, 27);
  assert(page.pageInfo.hasMore);
  const next = await listAttestations(
    patient,
    saved.id,
    { cursor: page.pageInfo.nextCursor! },
    actor,
  );
  assert.equal(next.items.length, 2);
  assert(!next.items.some((row) => page.items.some((old) => old.id === row.id)));
  await assert.rejects(listAttestations(patient, saved.id, { limit: '101' }, actor));
  await assert.rejects(
    listAttestations(patient, saved.id, { cursor: page.pageInfo.nextCursor! }, manager),
  );
  await assert.rejects(
    listAttestations(foreign, saved.id, {}, actor),
    (e: any) => e.status === 404,
  );
  await prisma.patient.update({ where: { id: patient }, data: { registeredById: other.id } });
  await assert.rejects(
    attestAssessment(patient, saved.id, body(saved.snapshotSha256!), actor),
    (e: any) => e.status === 404,
  );
  await assert.rejects(
    listAttestations(patient, saved.id, {}, actor),
    (e: any) => e.status === 404,
  );
  await prisma.patient.update({ where: { id: patient }, data: { registeredById: actor.id } });
});
test('HTTP current and attestations expose the agreed status and identity-bound response', async () => {
  const saved = await final();
  const http = await server();
  try {
    const base = `${http.base}/patients/${patient}/assessments`;
    const current = await fetch(`${base}/current?type=postural_transfers`, { headers: headers() });
    assert.equal(current.status, 200);
    assert.equal((await current.json()).assessment.type, 'postural_transfers');
    const url = `${base}/${saved.id}/attestations`;
    assert.equal((await fetch(url)).status, 401);
    const call = () =>
      fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body(saved.snapshotSha256!)),
      });
    const first = await call();
    assert.equal(first.status, 201);
    const receipt = await first.json();
    assert.equal(receipt.attestation.assessmentId, saved.id);
    assert.equal(receipt.attestation.snapshotSha256, saved.snapshotSha256);
    const again = await call();
    assert.equal(again.status, 200);
    assert.equal((await again.json()).replayed, true);
    assert.equal(
      (await (await fetch(url, { headers: headers() })).json()).counts.operator_acknowledgement,
      1,
    );
  } finally {
    await http.close();
  }
});
