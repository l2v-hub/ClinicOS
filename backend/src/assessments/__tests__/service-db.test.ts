import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { prisma } from '../../lib/prisma.js';
import {
  createAssessment,
  finalizeAssessment,
  getAssessment,
  patchAssessment,
} from '../service.js';
import { listAssessments } from '../history.js';
import {
  actor,
  other,
  manager,
  patient,
  second,
  foreign,
  answers,
  input,
  seed,
} from './fixture.js';
before(seed);
after(() => prisma.$disconnect());
const rejects = (promise: Promise<unknown>, code: string) =>
  assert.rejects(promise, (error: any) => error.code === code);
test('concurrent create uses one immutable initial receipt and replays the edited current draft', async () => {
  const body = input();
  const rows = await Promise.all(
    Array.from({ length: 8 }, () => createAssessment(patient, body, actor)),
  );
  assert.equal(new Set(rows.map((row) => row.assessment.id)).size, 1);
  assert.equal(rows.filter((row) => !row.replayed).length, 1);
  const original = rows[0].assessment;
  assert.equal(original.assessedAt, body.assessedAt);
  const edited = await patchAssessment(
    patient,
    original.id,
    { expectedVersion: 1, assessedAt: body.assessedAt, answers: answers(1) },
    actor,
  );
  const replay = await createAssessment(patient, body, actor);
  assert.equal(replay.assessment.version, 2);
  assert.deepEqual(replay.assessment.answers, edited.answers);
  await rejects(
    createAssessment(patient, { ...body, answers: answers(2) }, actor),
    'assessment_request_conflict',
  );
  await rejects(createAssessment(second, body, actor), 'assessment_request_conflict');
  const independent = await createAssessment(patient, body, manager);
  assert.notEqual(independent.assessment.id, original.id);
});
test('draft privacy and patient scope apply to reads, writes, create replay and revocation', async () => {
  const body = input();
  const row = (await createAssessment(second, body, actor)).assessment;
  await rejects(getAssessment(second, row.id, manager), 'assessment_not_found');
  await rejects(getAssessment(second, row.id, other), 'assessment_not_found');
  await rejects(createAssessment(foreign, input(), actor), 'assessment_not_found');
  await prisma.patient.update({ where: { id: second }, data: { registeredById: other.id } });
  await rejects(createAssessment(second, body, actor), 'assessment_not_found');
  await rejects(getAssessment(second, row.id, actor), 'assessment_not_found');
  await prisma.patient.update({ where: { id: second }, data: { registeredById: actor.id } });
});
test('CAS permits one writer and incomplete finalization remains a draft', async () => {
  const body = input({ answers: answers(null) });
  const row = (await createAssessment(patient, body, actor)).assessment;
  await rejects(
    finalizeAssessment(patient, row.id, { requestId: randomUUID(), expectedVersion: 1 }, actor),
    'assessment_incomplete',
  );
  const results = await Promise.allSettled(
    [0, 1].map((value) =>
      patchAssessment(
        patient,
        row.id,
        { expectedVersion: 1, assessedAt: body.assessedAt, answers: answers(value as 0 | 1) },
        actor,
      ),
    ),
  );
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(
    (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason.code,
    'assessment_version_conflict',
  );
  assert.equal((await getAssessment(patient, row.id, actor)).version, 2);
});
test('finalize replay persists once with Rome-date identity and immutable clinical data independent of Cartella', async () => {
  const row = (await createAssessment(patient, input(), actor)).assessment;
  const request = { requestId: randomUUID(), expectedVersion: 1 };
  const finalized = await Promise.all(
    Array.from({ length: 6 }, () => finalizeAssessment(patient, row.id, request, actor)),
  );
  assert.equal(finalized.filter((result) => !result.replayed).length, 1);
  const final = finalized[0].assessment;
  assert.equal(final.status, 'final');
  assert.equal(final.version, 2);
  const [sqlTimes] = await prisma.$queryRaw<
    Array<{ createdAt: string; assessedAt: string; finalizedAt: string }>
  >`
    SELECT to_char("createdAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
      to_char("assessedAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "assessedAt",
      to_char("finalizedAt" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "finalizedAt"
    FROM "PatientAssessment" WHERE id=${row.id}`;
  assert.equal(final.createdAt, sqlTimes.createdAt);
  assert.equal(final.assessedAt, sqlTimes.assessedAt);
  assert.equal(final.finalizedAt, sqlTimes.finalizedAt);
  const [zone] = await prisma.$queryRaw<
    Array<{ zone: string }>
  >`SELECT current_setting('TimeZone') AS zone`;
  assert.equal(zone.zone, 'Europe/Rome');
  assert.equal(final.finalSnapshot!.patient.location.asOf, '2026-03-29');
  assert.equal(final.finalSnapshot!.patient.location.bed, 'A');
  assert(!JSON.stringify(final.finalSnapshot).includes('privateNarrative'));
  assert(!JSON.stringify(final.finalSnapshot).includes('Reparto non proiettato'));
  await rejects(
    finalizeAssessment(patient, row.id, { ...request, expectedVersion: 2 }, actor),
    'assessment_request_conflict',
  );
  await rejects(
    finalizeAssessment(patient, row.id, { requestId: randomUUID(), expectedVersion: 2 }, actor),
    'assessment_finalized',
  );
  await prisma.cartella.update({ where: { patientId: patient }, data: { data: { scalaNRS: [] } } });
  assert.deepEqual(
    (await getAssessment(patient, row.id, actor)).finalSnapshot,
    final.finalSnapshot,
  );
  await assert.rejects(
    prisma.patientAssessment.update({ where: { id: row.id }, data: { answers: answers(2) } }),
  );
  await assert.rejects(
    prisma.patientAssessment.update({
      where: { id: row.id },
      data: { creationPayloadHash: '0'.repeat(64) },
    }),
  );
  await assert.rejects(prisma.patientAssessment.delete({ where: { id: row.id } }));
  await assert.rejects(prisma.patient.delete({ where: { id: patient } }));
  assert.equal((await getAssessment(patient, row.id, manager)).id, row.id);
});
test('only one concurrent final correction may reference a predecessor of the same patient', async () => {
  const base = (await createAssessment(patient, input(), actor)).assessment;
  await finalizeAssessment(
    patient,
    base.id,
    { requestId: randomUUID(), expectedVersion: 1 },
    actor,
  );
  const body = input({
    predecessorId: base.id,
    correctionReason: 'Correzione orario osservazione',
  });
  await rejects(createAssessment(second, body, actor), 'assessment_not_found');
  const drafts = await Promise.all(
    [actor, manager].map((who) =>
      createAssessment(
        patient,
        input({ predecessorId: base.id, correctionReason: 'Rettifica documentata' }),
        who,
      ),
    ),
  );
  const results = await Promise.allSettled(
    drafts.map((row, index) =>
      finalizeAssessment(
        patient,
        row.assessment.id,
        { requestId: randomUUID(), expectedVersion: 1 },
        index ? manager : actor,
      ),
    ),
  );
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(
    (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason.code,
    'assessment_already_corrected',
  );
  const source = await getAssessment(patient, base.id, actor);
  assert(source.correctedById);
  const correction = await getAssessment(patient, source.correctedById!, manager);
  assert.equal(correction.finalSnapshot!.predecessor!.id, base.id);
});
test('history is bounded, scoped, stable across draft edits and excludes snapshots and answers', async () => {
  for (let n = 0; n < 29; n++) await createAssessment(second, input(), actor);
  const first = await listAssessments(second, {}, actor);
  assert.equal(first.items.length, 25);
  assert(first.pageInfo.hasMore);
  assert(!('answers' in first.items[0]));
  assert(!('finalSnapshot' in first.items[0]));
  const next = await listAssessments(second, { cursor: first.pageInfo.nextCursor! }, actor);
  assert(next.items.length >= 4);
  assert(!next.items.some((row) => first.items.some((old) => row.id === old.id)));
  assert.equal((await listAssessments(second, {}, manager)).items.length, 0);
  await rejects(listAssessments(second, { limit: '101' }, actor), 'assessment_invalid_cursor');
  await rejects(
    listAssessments(second, { cursor: first.pageInfo.nextCursor!, status: 'final' }, actor),
    'assessment_invalid_cursor',
  );
});
test('concurrent ownership change fences creation before a stale patient permission can write', async () => {
  let locked!: () => void, release!: () => void;
  const acquired = new Promise<void>((ok) => {
      locked = ok;
    }),
    gate = new Promise<void>((ok) => {
      release = ok;
    });
  const transfer = prisma.$transaction(async (tx) => {
    await tx.patient.update({ where: { id: second }, data: { registeredById: other.id } });
    locked();
    await gate;
  });
  await acquired;
  let settled = false;
  const creation = createAssessment(second, input(), actor).finally(() => {
    settled = true;
  });
  const rejected = assert.rejects(creation, (error: any) => error.code === 'assessment_not_found');
  await new Promise((ok) => setTimeout(ok, 30));
  assert.equal(settled, false);
  release();
  await transfer;
  await rejected;
  await prisma.patient.update({ where: { id: second }, data: { registeredById: actor.id } });
});
test('a new process replays the persisted creation and finalization after response loss', async () => {
  const body = input(),
    finalKey = randomUUID();
  const code =
    "const {createAssessment,finalizeAssessment}=await import('./backend/src/assessments/service.ts');const {prisma}=await import('./backend/src/lib/prisma.ts');const v=JSON.parse(process.env.PO10_PROCESS_INPUT);const c=await createAssessment(v.patient,v.body,v.actor);const f=await finalizeAssessment(v.patient,c.assessment.id,{requestId:v.finalKey,expectedVersion:1},v.actor);process.stdout.write(JSON.stringify({id:f.assessment.id,createdReplay:c.replayed,finalReplay:f.replayed}));await prisma.$disconnect();";
  const run = () =>
    new Promise<{ id: string; createdReplay: boolean; finalReplay: boolean }>((ok, fail) => {
      let out = '',
        err = '';
      const child = spawn(
        process.execPath,
        ['--import', 'tsx', '--input-type=module', '-e', code],
        {
          cwd: process.cwd(),
          windowsHide: true,
          env: {
            ...process.env,
            PO10_PROCESS_INPUT: JSON.stringify({ patient, body, actor, finalKey }),
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      child.stdout.on('data', (data) => {
        out += data;
      });
      child.stderr.on('data', (data) => {
        err += data;
      });
      child.on('error', fail);
      child.on('exit', (status) => {
        if (status !== 0) fail(new Error(err));
        else {
          try {
            ok(JSON.parse(out));
          } catch (error) {
            fail(error);
          }
        }
      });
    });
  const first = await run(),
    secondRun = await run();
  assert.equal(first.id, secondRun.id);
  assert.equal(first.createdReplay, false);
  assert.equal(secondRun.createdReplay, true);
  assert.equal(secondRun.finalReplay, true);
});
