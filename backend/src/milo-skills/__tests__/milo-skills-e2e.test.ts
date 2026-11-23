// Milo, «skill creator» end to end sull'app reale (Express + Postgres + profili simulati):
// giudizio di chi ha fatto la domanda → proposta (a mano o dal modello) → approvazione
// dell'amministratore → istruzioni inviate al servizio AI. Il servizio AI è sostituito da uno stub.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { setMiloSkillsRuntime } from '../../routes/milo-skills.js';
import { approvedOverrides, invalidateApprovedOverrides } from '../store.js';

let base = '';
let close: () => Promise<void>;
let admin: Session;
let supervisor: Session;
let nurse: Session;
let oss: Session;
const proposeCalls: Array<Record<string, unknown>> = [];
let nextProposal: { instructions: string[]; rationale: string } = {
  instructions: [],
  rationale: '',
};

const RELEASED = [
  {
    id: 'clinico',
    name: 'Clinico paziente',
    version: '1.2.0',
    role: 'Situazione clinica di un paziente',
    tools: ['get_patient_parameters'],
    instructions: ['Rispondi con i dati degli strumenti.'],
    locked: ['Non formulare diagnosi.'],
  },
  {
    id: 'struttura',
    name: 'Struttura e personale',
    version: '1.2.0',
    role: 'Turni e camere',
    tools: ['query_rooms_occupancy'],
    instructions: ['Riporta i numeri per tipo.'],
    locked: ['Non riportare dati clinici dei pazienti.'],
  },
];

before(async () => {
  ({ base, close } = await startApp());
  [admin, supervisor, nurse, oss] = await Promise.all(
    ['SIM-ADMIN', 'SIM-SUPERVISOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'].map((id) => login(base, id)),
  );
  await prisma.miloSkillVersion.deleteMany({});
  invalidateApprovedOverrides();
  setMiloSkillsRuntime({
    released: async () => RELEASED,
    propose: async (req) => {
      proposeCalls.push(req as unknown as Record<string, unknown>);
      return { skillId: req.skillId, baseVersion: '1.2.0', ...nextProposal };
    },
  });
});

after(async () => {
  setMiloSkillsRuntime(null);
  await prisma.miloSkillVersion.deleteMany({});
  await prisma.miloAnswerFeedback.deleteMany({ where: { question: { contains: runTag } } });
  invalidateApprovedOverrides();
  await close?.();
});

const feedback = (session: Session, body: Record<string, unknown>) =>
  call(base, session, 'POST', '/ai/actions/feedback', body);
const answerId = randomUUID();
const question = `Come va il paziente? ${runTag}`;

test('A — whoever asked rates the answer once: 👎 with a correction, resending updates it', async () => {
  const first = await feedback(nurse, {
    answerId,
    rating: 'down',
    question,
    correction: 'Mancava la saturazione   degli ultimi giorni',
    mode: 'team',
    intent: 'patient_status',
    members: ['clinico', 'sorveglianza', '<script>'],
    tools: ['get_patient_parameters'],
    skillVersions: { clinico: '1.2.0', altro: 'x' },
  });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.rating, 'down');
  const again = await feedback(nurse, {
    answerId,
    rating: 'down',
    question,
    correction: 'Mancava la SpO₂',
  });
  assert.equal(again.body.id, first.body.id, 'same row, no duplicate');
  const rows = await prisma.miloAnswerFeedback.findMany({ where: { answerId } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].correction, 'Mancava la SpO₂');
  assert.equal(rows[0].operatorId, 'SIM-NURSE-1');
  assert.equal(rows[0].operatorRole, 'nurse');

  // Un'altra persona sulla stessa risposta ha il suo giudizio; 👍 non porta correzione.
  const other = await feedback(oss, { answerId, rating: 'up', question, correction: 'ignorata' });
  assert.equal(other.status, 200);
  const up = await prisma.miloAnswerFeedback.findUnique({ where: { id: other.body.id } });
  assert.equal(up?.correction, null);
  assert.notEqual(other.body.id, first.body.id);

  // Dati non validi: rifiutati, nulla salvato.
  for (const bad of [
    { answerId: 'x', rating: 'down', question },
    { answerId: randomUUID(), rating: 'forse', question },
    { answerId: randomUUID(), rating: 'up', question: '   ' },
  ])
    assert.equal((await feedback(nurse, bad)).status, 400);
  assert.equal((await feedback(null as never, { answerId, rating: 'up', question })).status, 401);
});

test('B — only the administrator sees feedback and skills; the correction never reaches the audit', async () => {
  for (const session of [nurse, oss, supervisor]) {
    assert.equal((await call(base, session, 'GET', '/authz/milo/feedback')).status, 403);
    assert.equal((await call(base, session, 'GET', '/authz/milo/skills')).status, 403);
    assert.equal(
      (
        await call(base, session, 'POST', '/authz/milo/skills/clinico/proposals', {
          instructions: ['Fai come dico io.'],
        })
      ).status,
      403,
    );
  }
  const list = await call(base, admin, 'GET', '/authz/milo/feedback?status=open&rating=down');
  assert.equal(list.status, 200);
  const mine = list.body.feedback.find((f: any) => f.question === question);
  assert.ok(mine);
  assert.equal(mine.correction, 'Mancava la SpO₂');
  assert.deepEqual(mine.members, ['clinico', 'sorveglianza']); // nomi non validi scartati
  assert.deepEqual(mine.skillVersions, { clinico: '1.2.0' });
  assert.equal(mine.operatorRole, 'nurse');

  const skills = await call(base, admin, 'GET', '/authz/milo/skills');
  assert.equal(skills.body.runtimeAvailable, true);
  const clinico = skills.body.skills.find((s: any) => s.id === 'clinico');
  assert.equal(clinico.releasedVersion, '1.2.0');
  assert.deepEqual(clinico.locked, ['Non formulare diagnosi.']);
  assert.equal(clinico.approved, null);

  const audited = await prisma.aiAuditEvent.findMany({
    where: { operatorId: 'SIM-NURSE-1', createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  assert.ok(!JSON.stringify(audited).includes('Mancava'), 'no feedback text in the audit');
});

test('C — a proposal has no effect until approved; limits are enforced; approval reaches the AI service', async () => {
  // Limiti: mai più di 20 istruzioni, mai oltre 700 caratteri, mai frasi vuote.
  for (const instructions of [
    Array.from({ length: 21 }, (_, i) => `Istruzione ${i}`),
    ['x'.repeat(701)],
    ['ok', '  '],
    'una frase',
    [],
  ]) {
    const bad = await call(base, admin, 'POST', '/authz/milo/skills/clinico/proposals', {
      instructions,
    });
    assert.equal(bad.status, 400, JSON.stringify(instructions).slice(0, 60));
  }
  assert.equal(
    (await call(base, admin, 'POST', '/authz/milo/skills/altro/proposals', { instructions: ['a'] }))
      .status,
    404,
  );

  // Proposta del modello dai giudizi aperti su quello specialista.
  nextProposal = { instructions: [], rationale: 'Nessun problema nelle istruzioni.' };
  const none = await call(base, admin, 'POST', '/authz/milo/skills/clinico/proposals', {});
  assert.equal(none.status, 422);
  assert.equal(none.body.code, 'no_proposal');
  nextProposal = {
    instructions: ['Riporta sempre la saturazione degli ultimi giorni.', 'Cita le fonti.'],
    rationale: 'Il giudizio segnala la saturazione mancante.',
  };
  const proposed = await call(base, admin, 'POST', '/authz/milo/skills/clinico/proposals', {});
  assert.equal(proposed.status, 201, JSON.stringify(proposed.body));
  const proposal = proposed.body.proposal;
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.source, 'model');
  assert.equal(proposal.label, '1.2.0+r1');
  assert.equal(proposal.feedbackIds.length >= 1, true);
  // Al servizio AI vanno domanda, giudizio e correzione: mai chi l'ha scritta.
  const sent = proposeCalls[proposeCalls.length - 1] as {
    feedback: Array<Record<string, unknown>>;
  };
  assert.ok(sent.feedback.some((f) => f.correction === 'Mancava la SpO₂'));
  assert.deepEqual(Object.keys(sent.feedback[0]).sort(), ['correction', 'question', 'rating']);

  // Non approvata: il servizio AI non riceve nulla.
  invalidateApprovedOverrides();
  assert.deepEqual(await approvedOverrides(), {});

  // Solo l'amministratore decide.
  assert.equal(
    (await call(base, supervisor, 'POST', `/authz/milo/versions/${proposal.id}/approve`)).status,
    403,
  );
  const approved = await call(base, admin, 'POST', `/authz/milo/versions/${proposal.id}/approve`);
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.version.status, 'approved');
  assert.deepEqual(await approvedOverrides(), {
    clinico: {
      version: '1.2.0+r1',
      instructions: ['Riporta sempre la saturazione degli ultimi giorni.', 'Cita le fonti.'],
    },
  });
  // Il giudizio usato non è più «aperto»; una proposta decisa non si decide due volte.
  const used = await prisma.miloAnswerFeedback.findFirst({ where: { answerId, rating: 'down' } });
  assert.equal(used?.status, 'used');
  assert.equal(
    (await call(base, admin, 'POST', `/authz/milo/versions/${proposal.id}/reject`)).status,
    409,
  );
  assert.ok(
    await waitForAudit({ operatorId: 'SIM-ADMIN', actionType: 'milo_skills:approve' } as never),
  );
});

test('D — a newer approval supersedes the previous one; rejecting and restoring work', async () => {
  const manual = await call(base, admin, 'POST', '/authz/milo/skills/clinico/proposals', {
    instructions: ['Versione scritta a mano.'],
    rationale: 'Prova',
    tools: ['create_vital_sign'], // ignorato: gli strumenti non sono modificabili
  });
  assert.equal(manual.status, 201);
  assert.equal(manual.body.proposal.source, 'manual');
  assert.equal(manual.body.proposal.label, '1.2.0+r2');
  assert.equal('tools' in manual.body.proposal, false);
  const rejected = await call(
    base,
    admin,
    'POST',
    `/authz/milo/versions/${manual.body.proposal.id}/reject`,
  );
  assert.equal(rejected.body.version.status, 'rejected');
  assert.equal((await approvedOverrides()).clinico.version, '1.2.0+r1');

  const third = await call(base, admin, 'POST', '/authz/milo/skills/clinico/proposals', {
    instructions: ['Terza versione.'],
  });
  await call(base, admin, 'POST', `/authz/milo/versions/${third.body.proposal.id}/approve`);
  assert.equal((await approvedOverrides()).clinico.version, '1.2.0+r3');
  const statuses = await prisma.miloSkillVersion.findMany({
    where: { skillId: 'clinico' },
    orderBy: { version: 'asc' },
    select: { status: true },
  });
  assert.deepEqual(
    statuses.map((s) => s.status),
    ['superseded', 'rejected', 'approved'],
  );
  const skills = await call(base, admin, 'GET', '/authz/milo/skills');
  const clinico = skills.body.skills.find((s: any) => s.id === 'clinico');
  assert.equal(clinico.approved.label, '1.2.0+r3');
  assert.equal(clinico.history.length, 2);

  const restored = await call(base, admin, 'POST', '/authz/milo/skills/clinico/restore');
  assert.deepEqual(restored.body, { skillId: 'clinico', restored: true });
  assert.deepEqual(await approvedOverrides(), {});
  assert.equal((await call(base, nurse, 'POST', '/authz/milo/skills/clinico/restore')).status, 403);
});

test('E — dismissing a feedback removes it from the open list without using it', async () => {
  const id = randomUUID();
  const sent = await feedback(nurse, {
    answerId: id,
    rating: 'down',
    question,
    correction: 'Altro',
  });
  const done = await call(base, admin, 'POST', `/authz/milo/feedback/${sent.body.id}/dismiss`);
  assert.equal(done.status, 200);
  const open = await call(base, admin, 'GET', '/authz/milo/feedback?status=open');
  assert.ok(!open.body.feedback.some((f: any) => f.id === sent.body.id));
  assert.equal(
    (await call(base, admin, 'POST', `/authz/milo/feedback/${sent.body.id}/dismiss`)).status,
    404,
  );
});
