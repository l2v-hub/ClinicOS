// Invocability + GUI parity: diary.* tools reach the SAME services as routes/patient-diary.ts
// (loadPatientDiary, createPatientDiaryEntry, createPatientDiaryEntryWithTherapy,
// parseDiaryTherapyText) and produce the same business outcome.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import patientDiaryRouter from '../../routes/patient-diary.js';
import { createToolRegistry } from '../registry.js';
import { diaryTools } from '../capabilities/diary.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  runId,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(diaryTools);
let owner: TestOperator;
let stranger: TestOperator;
let patientId = '';
let strangerPatientId = '';
let gui: Awaited<ReturnType<typeof serve>>;

before(async () => {
  captureAudit();
  owner = await createOperator('diary-owner', 'operatore', 'Medico');
  stranger = await createOperator('diary-stranger');
  patientId = (await createPatient('diary-own', owner)).id;
  strangerPatientId = (await createPatient('diary-foreign', stranger)).id;
  gui = await serve('/patients', patientDiaryRouter);
});

after(async () => {
  restoreAudit();
  await gui.close();
  // The with-therapy composition records its (best-effort) operational audit itself.
  await new Promise((resolve) => setTimeout(resolve, 300));
  const ids = [patientId, strangerPatientId];
  await prisma.aiAuditEvent.deleteMany({ where: { patientId: { in: ids } } });
  await prisma.patientDiaryEntry.deleteMany({ where: { patientId: { in: ids } } });
  await prisma.patientTherapy.deleteMany({ where: { patientId: { in: ids } } });
  await cleanup([owner, stranger], ids);
});

const entryBody = (content: string) => ({
  content,
  entryDateTime: '2026-09-29T10:00',
  priority: 'importante',
  // Spoofed authorship: accepted for compatibility and always discarded.
  authorType: 'oss',
  authorName: 'Autore Falso',
});

function therapyBody(requestId: string, farmacoNome: string) {
  return {
    requestId,
    entry: {
      content: `${farmacoNome} 5 mg 1 cp ore 8 e 20 per os dal 30/09`,
      entryDateTime: '2026-09-29T10:00',
    },
    therapy: {
      farmacoNome,
      dataInizio: '2026-09-30',
      viaSomministrazione: 'orale',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
        {
          time: '20:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
    },
  };
}

test('GUI == Tool: diary.create persists the same entry (server-authoritative author, content)', async () => {
  const res = await fetch(`${gui.base}/patients/${patientId}/diary`, {
    method: 'POST',
    headers: demoHeaders(owner),
    body: JSON.stringify(entryBody('Voce GUI')),
  });
  assert.equal(res.status, 201);
  const httpEntry = ((await res.json()) as { entry: { id: string } }).entry;

  const tool = await registry.invoke<{ entry: { id: string } }>(
    'diary.create',
    { patientId, body: entryBody('Voce GUI') },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;

  const [a, b] = await Promise.all(
    [httpEntry.id, tool.data.entry.id].map((id) =>
      prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id } }),
    ),
  );
  assert.notEqual(a.id, b.id);
  for (const row of [a, b]) {
    assert.equal(row.patientId, patientId);
    // Operator.ruolo 'Medico' normalised; name from User.fullName, never from the body.
    assert.equal(row.authorType, 'medico');
    assert.equal(row.authorName, owner.name);
    assert.equal(row.content, 'Voce GUI');
    assert.equal(row.priority, 'importante');
  }
  assert.equal(a.entryDateTime, b.entryDateTime);
  assert.equal(a.status, b.status);
  assert.equal(a.category, b.category);
});

test('diary.create validation comes from parseDiaryCreateBody (invalid_input, nothing written)', async () => {
  const before = await prisma.patientDiaryEntry.count({ where: { patientId } });
  const res = await fetch(`${gui.base}/patients/${patientId}/diary`, {
    method: 'POST',
    headers: demoHeaders(owner),
    body: JSON.stringify({ ...entryBody('x'), priority: 'altissima' }),
  });
  assert.equal(res.status, 400);
  const tool = await registry.invoke(
    'diary.create',
    { patientId, body: { ...entryBody('x'), priority: 'altissima' } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, false);
  if (!tool.ok) assert.equal(tool.error.code, 'invalid_input');
  assert.equal(await prisma.patientDiaryEntry.count({ where: { patientId } }), before);
});

test('GUI == Tool: diary.list returns the same page', async () => {
  const http = await (
    await fetch(`${gui.base}/patients/${patientId}/diary?limit=10`, { headers: demoHeaders(owner) })
  ).json();
  const tool = await registry.invoke<{ entries: { id: string }[] }>(
    'diary.list',
    { patientId, query: { limit: '10' } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true);
  if (!tool.ok) return;
  assert.deepEqual(JSON.parse(JSON.stringify(tool.data)), http);
  assert.ok(tool.data.entries.length >= 2);
  const bad = await registry.invoke(
    'diary.list',
    { patientId, query: { limit: 'x' } },
    ctxOf(owner),
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.error.code, 'invalid_input');
});

test('GUI == Tool: diary.therapy_preview parses the same text deterministically', async () => {
  const text = 'Ramipril 5 mg 1 cp ore 8 per os dal 30/09';
  const http = await (
    await fetch(`${gui.base}/patients/${patientId}/diary/therapy-preview`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify({ text, entryDateTime: '2026-09-29T10:00' }),
    })
  ).json();
  const tool = await registry.invoke<{ source: string }>(
    'diary.therapy_preview',
    { patientId, body: { text, entryDateTime: '2026-09-29T10:00' } },
    ctxOf(owner),
  );
  assert.equal(tool.ok, true, JSON.stringify(tool));
  if (!tool.ok) return;
  assert.equal(tool.data.source, 'deterministic');
  assert.deepEqual(JSON.parse(JSON.stringify(tool.data)), http);

  // Envelope errors: route 400 ⇔ tool invalid_input.
  for (const body of [
    { text: '   ' },
    { text: 'x', extra: 1 },
    { text: 'x'.repeat(2001) },
    { text: 'x', entryDateTime: '29/09' },
  ]) {
    const res = await fetch(`${gui.base}/patients/${patientId}/diary/therapy-preview`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    const r = await registry.invoke('diary.therapy_preview', { patientId, body }, ctxOf(owner));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, 'invalid_input');
  }
});

test('diary.create_with_therapy creates entry + PatientTherapy; replay by requestId is idempotent', async () => {
  const requestId = `${runId}-dwt-1`;
  const farmaco = `ZZ${runId}-Ramipril`;
  const first = await registry.invoke<{
    entry: { id: string; therapyId: string | null; category: string | null; authorType: string };
    therapy: { id: string; farmacoNome: string } | null;
    replayed: boolean;
  }>(
    'diary.create_with_therapy',
    { patientId, body: therapyBody(requestId, farmaco) },
    ctxOf(owner),
  );
  assert.equal(first.ok, true, JSON.stringify(first));
  if (!first.ok) return;
  assert.equal(first.data.replayed, false);
  const therapy = await prisma.patientTherapy.findUniqueOrThrow({
    where: { id: first.data.therapy!.id },
  });
  assert.equal(therapy.patientId, patientId);
  assert.equal(therapy.farmacoNome, farmaco);
  const entry = await prisma.patientDiaryEntry.findUniqueOrThrow({
    where: { id: first.data.entry.id },
  });
  assert.equal(entry.therapyId, therapy.id);
  assert.equal(entry.category, 'terapia');
  assert.equal(entry.authorType, 'medico');
  assert.equal(entry.authorName, owner.name);

  const replay = await registry.invoke<{
    entry: { id: string };
    therapy: { id: string };
    replayed: boolean;
  }>(
    'diary.create_with_therapy',
    { patientId, body: therapyBody(requestId, farmaco) },
    ctxOf(owner),
  );
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.data.replayed, true);
    assert.equal(replay.data.entry.id, entry.id);
    assert.equal(replay.data.therapy.id, therapy.id);
  }
  assert.equal(
    await prisma.patientTherapy.count({ where: { patientId, farmacoNome: farmaco } }),
    1,
  );

  // Same requestId, different content → conflict (route 409), nothing new written.
  const reused = await registry.invoke(
    'diary.create_with_therapy',
    { patientId, body: therapyBody(requestId, `${farmaco}-altro`) },
    ctxOf(owner),
  );
  assert.equal(reused.ok, false);
  if (!reused.ok) {
    assert.equal(reused.error.code, 'conflict');
    assert.equal(reused.error.domainCode, 'request_id_reused');
  }
});

test('GUI == Tool: diary.create_with_therapy same outcome and same validation class as the route', async () => {
  const farmaco = `ZZ${runId}-Bisoprololo`;
  const res = await fetch(`${gui.base}/patients/${patientId}/diary/with-therapy`, {
    method: 'POST',
    headers: demoHeaders(owner),
    body: JSON.stringify(therapyBody(`${runId}-dwt-gui`, farmaco)),
  });
  assert.equal(res.status, 201);
  const http = (await res.json()) as { entry: { id: string }; therapy: { id: string } };
  const tool = await registry.invoke<{ entry: { id: string }; therapy: { id: string } }>(
    'diary.create_with_therapy',
    { patientId, body: therapyBody(`${runId}-dwt-tool`, farmaco) },
    // Same actor shape requireOperator builds in AUTH_MODE=demo for a non-seed id (no `name`):
    // operatoreInseritore = actor.name || actor.id, so parity needs the same identity.
    { identity: { operatorId: owner.operatorId, role: owner.role }, origin: 'test' },
  );
  assert.equal(tool.ok, true);
  if (!tool.ok) return;
  const pick = async (entryId: string, therapyId: string) => {
    const e = await prisma.patientDiaryEntry.findUniqueOrThrow({ where: { id: entryId } });
    const t = await prisma.patientTherapy.findUniqueOrThrow({
      where: { id: therapyId },
      include: { schedules: { orderBy: { time: 'asc' } } },
    });
    return {
      entry: [e.authorType, e.authorName, e.content, e.category, e.entryDateTime],
      therapy: [
        t.farmacoNome,
        t.viaSomministrazione,
        t.operatoreInseritore,
        t.schedules.map((s) => s.time),
      ],
    };
  };
  assert.deepEqual(
    await pick(tool.data.entry.id, tool.data.therapy.id),
    await pick(http.entry.id, http.therapy.id),
  );

  // Missing schedules on a periodic therapy: route 400 schedule_required ⇔ tool invalid_input.
  const bad = therapyBody(`${runId}-dwt-bad`, `${farmaco}-bad`);
  (bad.therapy as Record<string, unknown>).schedules = [];
  const badRes = await fetch(`${gui.base}/patients/${patientId}/diary/with-therapy`, {
    method: 'POST',
    headers: demoHeaders(owner),
    body: JSON.stringify(bad),
  });
  assert.equal(badRes.status, 400);
  const badHttp = (await badRes.json()) as { code?: string };
  const badTool = await registry.invoke(
    'diary.create_with_therapy',
    { patientId, body: bad },
    ctxOf(owner),
  );
  assert.equal(badTool.ok, false);
  if (!badTool.ok) {
    assert.equal(badTool.error.code, 'invalid_input');
    assert.equal(badTool.error.domainCode, badHttp.code);
  }
  assert.equal(
    await prisma.patientTherapy.count({ where: { patientId, farmacoNome: `${farmaco}-bad` } }),
    0,
  );
});

test('scope: an operatore cannot reach another owner’s patient through diary tools', async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['diary.list', { patientId: strangerPatientId }],
    ['diary.create', { patientId: strangerPatientId, body: entryBody('intrusione') }],
    ['diary.therapy_preview', { patientId: strangerPatientId, body: { text: 'Ramipril 5 mg' } }],
    [
      'diary.create_with_therapy',
      { patientId: strangerPatientId, body: therapyBody(`${runId}-dwt-x`, `ZZ${runId}-x`) },
    ],
  ];
  for (const [name, input] of cases) {
    const result = await registry.invoke(name, input, ctxOf(owner));
    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.error.code, 'not_found', name);
      assert.equal(result.error.domainCode, 'patient_not_found', name);
    }
  }
  assert.equal(
    await prisma.patientDiaryEntry.count({ where: { patientId: strangerPatientId } }),
    0,
  );
  assert.equal(await prisma.patientTherapy.count({ where: { patientId: strangerPatientId } }), 0);
});
