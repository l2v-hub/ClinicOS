// Invocability + GUI parity: assessments.* tools reach the SAME services as
// routes/patient-assessments.ts (create → update → finalize with PDF → attest), with real DB rows.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import assessmentsRouter from '../../routes/patient-assessments.js';
import { PAINAD_KEYS, PAINAD_VERSION } from '../../assessments/types.js';
import { transfersInput } from '../../assessments/__tests__/transfers-fixture.js';
import { createToolRegistry } from '../registry.js';
import { assessmentTools } from '../capabilities/assessments.js';
import {
  captureAudit,
  cleanup,
  createOperator,
  createPatient,
  ctxOf,
  demoHeaders,
  restoreAudit,
  serve,
  type TestOperator,
} from './support.js';

const registry = createToolRegistry(assessmentTools);
let owner: TestOperator;
let stranger: TestOperator;
let patientId = '';
let strangerPatientId = '';

const answers = (value: 0 | 1 | 2 | null) =>
  Object.fromEntries(PAINAD_KEYS.map((key) => [key, value]));
const painadBody = (extra: Record<string, unknown> = {}) => ({
  requestId: randomUUID(),
  type: 'painad',
  formVersion: PAINAD_VERSION,
  assessedAt: '2026-09-29T08:30:00.000Z',
  answers: answers(0),
  ...extra,
});

type Assessment = {
  id: string;
  status: string;
  version: number;
  snapshotSha256: string | null;
  pdf: { status: string; documentId: string | null } | null;
};

before(async () => {
  captureAudit();
  owner = await createOperator('as-owner');
  stranger = await createOperator('as-stranger');
  patientId = (await createPatient('as-own', owner)).id;
  strangerPatientId = (await createPatient('as-foreign', stranger)).id;
});

after(async () => {
  restoreAudit();
  const patients = [patientId, strangerPatientId];
  // Final assessments, their PDFs and attestations are append-only (DB guard triggers): the test
  // bypasses the triggers only inside this cleanup transaction.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = replica`);
    await tx.$executeRaw`DELETE FROM "PatientAssessmentAttestation" WHERE "assessmentId" IN (SELECT id FROM "PatientAssessment" WHERE "patientId" = ANY(${patients}))`;
    await tx.$executeRaw`DELETE FROM "PatientDocument" WHERE "patientId" = ANY(${patients})`;
    await tx.$executeRaw`DELETE FROM "PatientAssessment" WHERE "patientId" = ANY(${patients})`;
  });
  await cleanup([owner, stranger], patients);
});

async function invokeOk<T>(name: string, input: unknown, op = owner): Promise<T> {
  const result = await registry.invoke<T>(name, input, ctxOf(op));
  assert.equal(result.ok, true, `${name}: ${JSON.stringify(result)}`);
  return (result as { data: T }).data;
}

test('assessments.catalog lists the seven scales for an own patient', async () => {
  const catalog = await invokeOk<{ items?: unknown[] } | unknown[]>('assessments.catalog', {
    patientId,
  });
  const items = Array.isArray(catalog) ? catalog : (catalog as { items: unknown[] }).items;
  const types = (items as { type: string }[]).map((item) => item.type).sort();
  assert.deepEqual(types, [
    'barthel',
    'gds15',
    'mna',
    'painad',
    'postural_transfers',
    'tinetti',
    'ucla_npi_sleep',
  ]);
});

test('painad create_draft → update_draft → finalize (PDF) → get/list/current, persisted in DB', async () => {
  const created = await invokeOk<{ assessment: Assessment; replayed: boolean }>(
    'assessments.create_draft',
    { patientId, body: painadBody() },
  );
  assert.equal(created.replayed, false);
  const id = created.assessment.id;
  let row = await prisma.patientAssessment.findUniqueOrThrow({ where: { id } });
  assert.equal(row.status, 'draft');
  assert.equal(row.authorOperatorId, owner.operatorId);
  assert.equal(row.patientId, patientId);

  const updated = await invokeOk<{ assessment: Assessment }>('assessments.update_draft', {
    patientId,
    assessmentId: id,
    body: { expectedVersion: 1, assessedAt: '2026-09-29T08:45:00.000Z', answers: answers(1) },
  });
  assert.equal(updated.assessment.version, 2);
  row = await prisma.patientAssessment.findUniqueOrThrow({ where: { id } });
  assert.equal(row.version, 2);
  assert.deepEqual(row.answers, answers(1));

  const finalizeRequestId = randomUUID();
  const finalized = await invokeOk<{ assessment: Assessment; replayed: boolean }>(
    'assessments.finalize',
    { patientId, assessmentId: id, body: { requestId: finalizeRequestId, expectedVersion: 2 } },
  );
  assert.equal(finalized.replayed, false);
  assert.equal(finalized.assessment.status, 'final');
  assert.equal(finalized.assessment.pdf?.status, 'ready', JSON.stringify(finalized.assessment.pdf));
  row = await prisma.patientAssessment.findUniqueOrThrow({ where: { id } });
  assert.equal(row.status, 'final');
  assert.equal(row.pdfStatus, 'ready');
  const pdf = await prisma.patientDocument.findFirstOrThrow({ where: { assessmentId: id } });
  assert.equal(pdf.mimeType, 'application/pdf');
  assert.equal(pdf.id, finalized.assessment.pdf?.documentId);
  assert.ok(Buffer.from(pdf.dataBase64, 'base64').subarray(0, 4).toString('ascii') === '%PDF');

  const replay = await invokeOk<{ assessment: Assessment; replayed: boolean }>(
    'assessments.finalize',
    { patientId, assessmentId: id, body: { requestId: finalizeRequestId, expectedVersion: 2 } },
  );
  assert.equal(replay.replayed, true);
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: id } }), 1);

  const retried = await invokeOk<{ assessment: Assessment }>('assessments.retry_pdf', {
    patientId,
    assessmentId: id,
  });
  assert.equal(retried.assessment.pdf?.status, 'ready');
  assert.equal(await prisma.patientDocument.count({ where: { assessmentId: id } }), 1);

  const got = await invokeOk<{ assessment: Assessment }>('assessments.get', {
    patientId,
    assessmentId: id,
  });
  assert.equal(got.assessment.id, id);
  const current = await invokeOk<{ assessment: Assessment | null }>('assessments.current', {
    patientId,
    query: { type: 'painad' },
  });
  assert.equal(current.assessment?.id, id);
  const list = await invokeOk<{ items: Assessment[] }>('assessments.list', {
    patientId,
    query: { type: 'painad' },
  });
  assert.ok(list.items.some((item) => item.id === id));
});

test('postural_transfers finalize → attest → list_attestations persists the attestation', async () => {
  const draft = await invokeOk<{ assessment: Assessment }>('assessments.create_draft', {
    patientId,
    body: transfersInput(),
  });
  const final = await invokeOk<{ assessment: Assessment }>('assessments.finalize', {
    patientId,
    assessmentId: draft.assessment.id,
    body: { requestId: randomUUID(), expectedVersion: 1 },
  });
  assert.equal(final.assessment.status, 'final');
  assert.equal(final.assessment.pdf?.status, 'ready', JSON.stringify(final.assessment.pdf));
  const hash = final.assessment.snapshotSha256!;
  const attested = await invokeOk<{ attestation: { id: string; kind: string }; replayed: boolean }>(
    'assessments.attest',
    {
      patientId,
      assessmentId: draft.assessment.id,
      body: { kind: 'operator_acknowledgement', snapshotSha256: hash },
    },
  );
  assert.equal(attested.replayed, false);
  const row = await prisma.patientAssessmentAttestation.findUniqueOrThrow({
    where: { id: attested.attestation.id },
  });
  assert.equal(row.actorOperatorId, owner.operatorId);
  assert.equal(row.snapshotSha256, hash);
  const again = await invokeOk<{ replayed: boolean }>('assessments.attest', {
    patientId,
    assessmentId: draft.assessment.id,
    body: { kind: 'operator_acknowledgement', snapshotSha256: hash },
  });
  assert.equal(again.replayed, true);
  const page = await invokeOk<{ items: { id: string }[] }>('assessments.list_attestations', {
    patientId,
    assessmentId: draft.assessment.id,
  });
  assert.deepEqual(
    page.items.map((item) => item.id),
    [attested.attestation.id],
  );
});

test('scope: another owner’s patient is not reachable (service 404), nothing written', async () => {
  for (const [name, input] of [
    ['assessments.catalog', { patientId: strangerPatientId }],
    ['assessments.create_draft', { patientId: strangerPatientId, body: painadBody() }],
  ] as const) {
    const result = await registry.invoke(name, input, ctxOf(owner));
    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.error.code, 'not_found');
      assert.equal(result.error.domainCode, 'assessment_not_found');
    }
  }
  assert.equal(
    await prisma.patientAssessment.count({ where: { patientId: strangerPatientId } }),
    0,
  );
});

test('validation comes from the existing parsers (invalid_input with domain code)', async () => {
  const result = await registry.invoke(
    'assessments.create_draft',
    { patientId, body: painadBody({ requestId: 'not-a-uuid' }) },
    ctxOf(owner),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'invalid_input');
    assert.equal(result.error.domainCode, 'assessment_invalid_input');
  }
});

test('GUI == Tool: create_draft + finalize via HTTP route and via tool store the same state', async () => {
  const gui = await serve('/patients', assessmentsRouter);
  const stored = async (id: string) => {
    const row = await prisma.patientAssessment.findUniqueOrThrow({
      where: { id },
      include: { document: { select: { mimeType: true, documentType: true } } },
    });
    return {
      type: row.type,
      formVersion: row.formVersion,
      status: row.status,
      version: row.version,
      answers: row.answers,
      authorOperatorId: row.authorOperatorId,
      pdfStatus: row.pdfStatus,
      document: row.document,
      snapshotForm: (row.finalSnapshot as { form?: unknown } | null)?.form ?? null,
    };
  };
  try {
    const body = (requestId: string) => painadBody({ requestId, answers: answers(2) });
    const httpCreate = await fetch(`${gui.base}/patients/${patientId}/assessments`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(body(randomUUID())),
    });
    assert.equal(httpCreate.status, 201);
    const httpId = ((await httpCreate.json()) as { assessment: Assessment }).assessment.id;
    const toolCreate = await invokeOk<{ assessment: Assessment }>('assessments.create_draft', {
      patientId,
      body: body(randomUUID()),
    });
    const toolId = toolCreate.assessment.id;
    assert.deepEqual(await stored(toolId), await stored(httpId));

    const httpFinal = await fetch(
      `${gui.base}/patients/${patientId}/assessments/${httpId}/finalize`,
      {
        method: 'POST',
        headers: demoHeaders(owner),
        body: JSON.stringify({ requestId: randomUUID(), expectedVersion: 1 }),
      },
    );
    assert.equal(httpFinal.status, 200);
    const httpData = (await httpFinal.json()) as { assessment: Assessment; replayed: boolean };
    const toolData = await invokeOk<{ assessment: Assessment; replayed: boolean }>(
      'assessments.finalize',
      { patientId, assessmentId: toolId, body: { requestId: randomUUID(), expectedVersion: 1 } },
    );
    assert.equal(toolData.replayed, httpData.replayed);
    assert.equal(toolData.assessment.pdf?.status, httpData.assessment.pdf?.status);
    const [httpRow, toolRow] = [await stored(httpId), await stored(toolId)];
    assert.equal(toolRow.status, 'final');
    assert.equal(toolRow.pdfStatus, 'ready');
    assert.deepEqual(toolRow, httpRow);

    // Error parity: foreign patient → 404 over HTTP, not_found via tool.
    const httpForeign = await fetch(`${gui.base}/patients/${strangerPatientId}/assessments`, {
      method: 'POST',
      headers: demoHeaders(owner),
      body: JSON.stringify(body(randomUUID())),
    });
    assert.equal(httpForeign.status, 404);
  } finally {
    await gui.close();
  }
});
