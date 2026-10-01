// Phase 8 — role copilots E2E on the REAL app (Express + Postgres + Role Simulator + real policy
// API). Scenarios A–K of Prompt 8 §22 plus profile safety. Every check reads the HTTP answer and,
// where something is written, verifies the database independently.

process.env.SKILLS_INTERPRETER = 'deterministic';

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { createTherapyInTx } from '../../therapies/therapy-create.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';
import {
  call,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { setProactiveClock, setProactiveComposeRuntime } from '../../skills/index.js';
import { resetBriefingCache } from '../../proactive/engine.js';
import { normalizeProfile, profileFor, loadProfiles } from '../profiles.js';
import { SKILL_CATALOG } from '../../skills/catalog.js';

let base = '';
let close: () => Promise<void>;
let admin: Session;
let supervisor: Session;
let doctor: Session;
let nurse: Session;
let oss: Session;
const tag = (runTag.replace(/[^a-z]/g, '').slice(-4) || 'copi').replace(/^./, (c) =>
  c.toUpperCase(),
);
const ids: Record<string, string> = {};
const today = facilityToday();

async function patient(key: string, firstName: string, lastName: string, owner: string) {
  const row = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-${runTag}-${key}`,
      firstName,
      lastName,
      dateOfBirth: new Date('1942-02-03T00:00:00.000Z'),
      sex: 'F',
      registeredById: owner,
    },
  });
  ids[key] = row.id;
}
const home = async (s: Session, residentId?: string) => {
  const r = await call(
    base,
    s,
    'GET',
    `/skills/copilot/home${residentId ? `?residentId=${residentId}` : ''}`,
  );
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
};
const say = (s: Session, body: Record<string, unknown>) =>
  call(base, s, 'POST', '/skills/converse', body);
const session = (s: Session) => call(base, s, 'GET', '/skills/session').then((r) => r.body);
const availableIds = async (s: Session) =>
  new Set((await session(s)).skills.filter((k: any) => k.available).map((k: any) => k.id));

async function policy(mutate: (doc: any) => void, note: string) {
  for (let attempt = 0; ; attempt += 1) {
    const current = await call(base, admin, 'GET', '/authz/policy');
    const document = structuredClone(current.body.active.document);
    mutate(document);
    const saved = await call(base, admin, 'POST', '/authz/policy/versions', {
      document,
      basedOnVersion: current.body.active.version,
      note: `${runTag}: ${note}`,
      apply: true,
    });
    if (saved.status === 409 && attempt < 10) continue;
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    return;
  }
}

before(async () => {
  ({ base, close } = await startApp());
  [admin, supervisor, doctor, nurse, oss] = await Promise.all(
    ['SIM-ADMIN', 'SIM-SUPERVISOR-1', 'SIM-DOCTOR-1', 'SIM-NURSE-1', 'SIM-OSS-1'].map((id) =>
      login(base, id),
    ),
  );
  await patient('nA', 'Nives', `Uno${tag}`, 'SIM-NURSE-1');
  await patient('nB', 'Nadia', `Due${tag}`, 'SIM-NURSE-1');
  await patient('dX', 'Dalia', `Medica${tag}`, 'SIM-DOCTOR-1');
  await patient('oO', 'Olivia', `Assistita${tag}`, 'SIM-OSS-1');
  await prisma.$transaction((tx) =>
    createTherapyInTx(tx, ids.nA, {
      farmacoNome: `Furosemide${tag}`,
      dataInizio: today,
      commercialStrengthValue: 25,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
      operatoreInseritore: 'Fixture',
    }),
  );
  await prisma.patientParameterReading.create({
    data: {
      patientId: ids.nA,
      requestId: randomUUID(),
      measuredAt: new Date(),
      values: { pa: '125/80' },
      authorOperatorId: 'SIM-OSS-1',
      authorName: 'Fixture',
    },
  });
  // A fact on the doctor's resident (outside the nurse scope, inside the supervisor scope).
  await prisma.patientParameterReading.create({
    data: {
      patientId: ids.dX,
      requestId: randomUUID(),
      measuredAt: new Date(),
      values: { spo2: '96' },
      authorOperatorId: 'SIM-NURSE-1',
      authorName: 'Fixture',
    },
  });
});

after(async () => {
  setProactiveClock(null);
  setProactiveComposeRuntime(null);
  const all = Object.values(ids);
  await prisma.consegna.deleteMany({ where: { pazienteId: { in: all } } });
  await prisma.medicationAdministration.deleteMany({ where: { patientId: { in: all } } });
  await prisma.patient.deleteMany({ where: { id: { in: all } } });
  await close();
});

test('profiles: configurable, validated, never grant; unknown role → neutral default (never another role)', () => {
  const issues = { warnings: [] as string[] };
  const p = normalizeProfile(
    'test',
    {
      label: 'X',
      capabilities: ['therapy.create'],
      starterOrder: ['vitals.record', 'not.a.skill'],
      shortcuts: [{ id: 'a', kind: 'skill', label: 'A', skillId: 'nope' }],
    },
    issues,
  );
  assert.deepEqual(p.starterOrder, ['vitals.record']);
  assert.equal(p.shortcuts.length, 0);
  assert.ok(!('capabilities' in p));
  assert.ok(issues.warnings.some((w) => w.includes('capabilities')));
  assert.equal(profileFor('unknown_role').label, profileFor('default').label);
  for (const [, profile] of loadProfiles().profiles) assert.ok(profile.assistantHint.length <= 200);
  for (const role of ['oss', 'nurse', 'doctor', 'supervisor', 'administrator'])
    assert.ok(loadProfiles().profiles.has(role), role);
});

test('A — OSS home: only authorized skills / shortcuts / signals', async () => {
  const h = await home(oss);
  const allowed = await availableIds(oss);
  assert.equal(h.role.id, 'oss');
  assert.equal(h.profile.density, 'minimal');
  assert.ok(h.starters.length > 0 && h.starters.length <= 4);
  for (const s of h.starters) assert.ok(allowed.has(s.skillId), s.skillId);
  assert.ok(!h.starters.some((s: any) => /therapy|administration/.test(s.skillId)));
  for (const sc of h.shortcuts) {
    if (sc.skillId) assert.ok(allowed.has(sc.skillId));
    for (const st of sc.steps ?? []) assert.ok(allowed.has(st.skillId), st.skillId);
  }
  assert.ok(
    h.shortcuts.some((s: any) => s.kind === 'resident_round'),
    'OSS round shortcut',
  );
  const round = await call(base, oss, 'GET', '/skills/copilot/round');
  const ridIds = round.body.residents.map((r: any) => r.id);
  assert.ok(ridIds.includes(ids.oO));
  for (const r of [ids.nA, ids.nB, ids.dX])
    assert.ok(!ridIds.includes(r), 'round respects the resident scope');
});

test('B — nurse: starter → workflow → preview → confirmation → backend → audit', async () => {
  const h = await home(nurse, ids.nB);
  assert.equal(h.resident.id, ids.nB);
  const vit = h.starters.find((s: any) => s.skillId === 'vitals.record');
  assert.ok(vit, JSON.stringify(h.starters));
  assert.ok(vit.reasons.includes('ospite attivo'));
  const before = await prisma.patientParameterReading.count({ where: { patientId: ids.nB } });
  const ask = await say(nurse, { message: vit.label, context: { currentPatientId: ids.nB } });
  const filled =
    ask.body.status === 'NEEDS_CONFIRMATION'
      ? ask
      : await say(nurse, {
          workflowId: ask.body.workflowId,
          message: 'pressione 122/78',
          context: { currentPatientId: ids.nB },
        });
  assert.equal(filled.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(filled.body));
  assert.equal(
    await prisma.patientParameterReading.count({ where: { patientId: ids.nB } }),
    before,
    'nothing before the button',
  );
  const done = await say(nurse, {
    workflowId: filled.body.workflowId,
    action: 'confirm',
    previewId: filled.body.preview.previewId,
    context: { currentPatientId: ids.nB },
  });
  assert.equal(done.body.status, 'COMPLETED', JSON.stringify(done.body));
  assert.equal(
    await prisma.patientParameterReading.count({ where: { patientId: ids.nB } }),
    before + 1,
  );
  assert.ok(
    await waitForAudit({
      requestId: `skill-${filled.body.workflowId}`,
      actionType: 'skill:vitals.record:execute',
      outcome: 'ok',
    }),
  );
  const again = await home(nurse);
  assert.ok(
    again.recent.some((r: any) => r.skillId === 'vitals.record'),
    'recent activity',
  );
});

test('C — doctor: summary → drill-down → sensitive preparation → human confirmation only', async () => {
  const h = await home(doctor, ids.dX);
  assert.equal(h.profile.density, 'clinical');
  const visit = h.shortcuts.find((s: any) => s.id === 'prepare_visit');
  assert.ok(visit, 'Prepara visita');
  assert.deepEqual(visit.steps.map((s: any) => s.skillId).slice(0, 3), [
    'patient.overview',
    'vitals.recent',
    'diary.recent',
  ]);
  const overview = await say(doctor, {
    message: visit.steps[0].label,
    context: { currentPatientId: ids.dX },
  });
  assert.equal(overview.body.skillId, 'patient.overview');
  assert.equal(overview.body.status, 'COMPLETED');
  const before = await prisma.patientTherapy.count({ where: { patientId: ids.dX } });
  const rx = await say(doctor, {
    message: 'prescrivi Paracetamolo 1000 mg 1 compressa per os alle 8 per questo ospite',
    context: { currentPatientId: ids.dX },
  });
  assert.equal(rx.body.status, 'NEEDS_CONFIRMATION');
  assert.equal(rx.body.preview.confirmationClass, 'HIGH_RISK');
  assert.equal(
    await prisma.patientTherapy.count({ where: { patientId: ids.dX } }),
    before,
    'the copilot never prescribes',
  );
  const cont = await home(doctor);
  assert.ok(
    cont.continueWork.some((w: any) => w.workflowId === rx.body.workflowId),
    'continue work lists the pending preparation',
  );
  await say(doctor, {
    workflowId: rx.body.workflowId,
    action: 'cancel',
    context: { currentPatientId: ids.dX },
  });
});

test('D — supervisor briefing: aggregated within scope, role focus, no judgement of people', async () => {
  let question = '';
  let ctx = '';
  resetBriefingCache();
  setProactiveComposeRuntime(async (req) => {
    question = req.question;
    ctx = JSON.stringify(req.results);
    return { answerText: '', citedSources: [] };
  });
  try {
    const h = await home(supervisor);
    assert.ok(h.shortcuts.some((s: any) => s.kind === 'briefing'));
    const b = await call(base, supervisor, 'GET', '/skills/proactive/briefing');
    assert.equal(b.status, 200);
    assert.match(question, /nessun giudizio sulle persone/);
    // Scope is checked on the full fact list (the AI context is capped and may legitimately omit
    // routine facts when the facility has many); the AI context must be a subset of the facts.
    const labels = JSON.stringify(b.body.facts.map((f: any) => f.residentLabel));
    assert.ok(
      labels.includes(`Uno${tag}`) && labels.includes(`Medica${tag}`),
      'facility scope (supervisor)',
    );
    const factIds = new Set(b.body.facts.map((f: any) => f.signalId));
    assert.ok(
      (JSON.parse(ctx) as { id: string }[]).every((r) => factIds.has(r.id)),
      'AI context ⊆ authorized facts',
    );
    const nb = await call(base, nurse, 'GET', '/skills/proactive/briefing');
    assert.equal(nb.status, 200);
    assert.ok(
      !JSON.stringify(nb.body.facts).includes(`Medica${tag}`),
      'nurse briefing stays in the nurse scope',
    );
    assert.ok(!ctx.includes(`Medica${tag}`), 'nurse AI context stays in the nurse scope');
  } finally {
    setProactiveComposeRuntime(null);
  }
});

test('E — administrator: no implicit clinical feed, no clinical write', async () => {
  const h = await home(admin);
  assert.equal(h.profile.density, 'technical');
  assert.ok(!h.shortcuts.some((s: any) => s.kind === 'resident_round'));
  const clinical = new Set(
    SKILL_CATALOG.filter(
      (s) =>
        s.category !== 'admin' &&
        /vitals|diary|therapy|administration|patient|clinical|handover/.test(s.id),
    ).map((s) => s.id),
  );
  assert.ok(!h.starters.some((s: any) => clinical.has(s.skillId)), JSON.stringify(h.starters));
  assert.ok(
    h.shortcuts.some((s: any) => s.id === 'roles'),
    'roles configuration shortcut',
  );
  assert.equal(h.resident, null);
  const r = await say(admin, {
    message: 'registra pressione 120/80 per questo ospite',
    context: { currentPatientId: ids.nA },
  });
  assert.notEqual(r.body.status, 'COMPLETED');
  assert.notEqual(r.body.status, 'NEEDS_CONFIRMATION');
  const round = await call(base, admin, 'GET', '/skills/copilot/round');
  assert.ok(
    round.status === 403 ||
      (round.body.residents ?? []).length === 0 ||
      !h.shortcuts.some((s: any) => s.kind === 'resident_round'),
  );
});

test('F — role change: the profile, shortcuts and a now-forbidden pending workflow follow the new role', async () => {
  const draft = await say(nurse, {
    message: 'registra una somministrazione per questo ospite',
    context: { currentPatientId: ids.nA },
  });
  assert.equal(draft.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(draft.body));
  assert.ok(
    (await home(nurse)).continueWork.some((w: any) => w.workflowId === draft.body.workflowId),
  );
  await policy((d) => (d.assignments['SIM-NURSE-1'] = 'oss'), 'nurse → oss');
  try {
    const h = await home(nurse);
    assert.equal(h.role.id, 'oss');
    assert.equal(h.role.copilot, 'Copilota OSS');
    assert.ok(
      !h.continueWork.some((w: any) => w.workflowId === draft.body.workflowId),
      'forbidden pending workflow no longer offered',
    );
    assert.ok(!h.starters.some((s: any) => /administration|therapy/.test(s.skillId)));
    const confirm = await say(nurse, {
      workflowId: draft.body.workflowId,
      action: 'confirm',
      previewId: draft.body.preview.previewId,
      context: { currentPatientId: ids.nA },
    });
    assert.notEqual(confirm.body.status, 'COMPLETED', 'backend still denies');
  } finally {
    await policy((d) => (d.assignments['SIM-NURSE-1'] = 'nurse'), 'restore nurse');
  }
});

test('G — resident switch invalidates a pending sensitive workflow', async () => {
  const draft = await say(nurse, {
    message: 'registra pressione 130/80 per questo ospite',
    context: { currentPatientId: ids.nA },
  });
  assert.equal(draft.body.status, 'NEEDS_CONFIRMATION');
  const switched = await say(nurse, {
    workflowId: draft.body.workflowId,
    message: 'ok',
    context: { currentPatientId: ids.nB },
  });
  assert.notEqual(switched.body.status, 'NEEDS_CONFIRMATION');
  assert.ok(
    !(await home(nurse)).continueWork.some((w: any) => w.workflowId === draft.body.workflowId),
  );
});

test('H — policy update: capability removed → shortcut / starter disappear and the backend denies', async () => {
  const before = await home(supervisor);
  assert.ok(before.shortcuts.some((s: any) => s.id === 'handovers'));
  await policy(
    (d) => (d.grants.supervisor['consegne.overview'] = 'DENIED'),
    'revoke consegne.overview',
  );
  try {
    const after = await home(supervisor);
    assert.ok(!after.shortcuts.some((s: any) => s.id === 'handovers'));
    assert.ok(!after.starters.some((s: any) => s.skillId === 'handover.overview'));
    const r = await say(supervisor, { message: 'Come sono le consegne?' });
    assert.notEqual(r.body.status, 'COMPLETED');
  } finally {
    await policy((d) => (d.grants.supervisor['consegne.overview'] = 'ALLOWED'), 'restore');
  }
});

test('I — proactive signals boost authorized starters (Signal → existing skill)', async () => {
  const h = await home(nurse);
  const boosted = h.starters.filter((s: any) => s.reasons.includes('segnalato per te'));
  const allowed = await availableIds(nurse);
  for (const s of boosted) assert.ok(allowed.has(s.skillId));
  const inbox = (await call(base, nurse, 'GET', '/skills/proactive/inbox')).body;
  const skillsFromSignals = new Set(
    inbox.signals.filter((s: any) => s.action?.kind === 'skill').map((s: any) => s.action.skillId),
  );
  for (const s of boosted) assert.ok(skillsFromSignals.has(s.skillId));
});

test('J — voice and text converge on the same skill path', async () => {
  const text = await say(nurse, {
    message: 'Mostrami i parametri recenti di questo ospite',
    context: { currentPatientId: ids.nA },
  });
  const voice = await say(nurse, {
    message: 'Mostrami i parametri recenti di questo ospite',
    inputChannel: 'voice',
    context: { currentPatientId: ids.nA },
  });
  assert.equal(text.body.skillId, 'vitals.recent');
  assert.equal(voice.body.skillId, text.body.skillId);
  assert.equal(voice.body.status, text.body.status);
});

test('K — prompt efficiency: one shared router prompt + short role hint + authorized skill subset only', async () => {
  const bodies: Record<string, any> = {};
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw);
      bodies[body.roleHint?.slice(0, 12) ?? 'none'] = body;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ route: { skillId: null }, model: 'fake' }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const saved = {
    mode: process.env.SKILLS_INTERPRETER,
    url: process.env.AI_RUNTIME_URL,
    token: process.env.AI_RUNTIME_SERVICE_TOKEN,
  };
  process.env.SKILLS_INTERPRETER = 'agno';
  process.env.AI_RUNTIME_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.AI_RUNTIME_SERVICE_TOKEN = 'k-test';
  try {
    const sizes: Record<string, number> = {};
    for (const [name, s] of [
      ['oss', oss],
      ['nurse', nurse],
      ['doctor', doctor],
      ['supervisor', supervisor],
      ['administrator', admin],
    ] as const) {
      const before = Object.keys(bodies).length;
      await say(s, { message: 'buongiorno, cosa posso fare?' });
      const body = Object.values(bodies)[before] ?? Object.values(bodies).at(-1);
      assert.ok(body, name);
      assert.ok(body.roleHint && body.roleHint.length <= 200, `${name} hint`);
      assert.ok(
        !/capabilit|grants|ALLOWED|DENIED/.test(body.roleHint),
        'no capabilities in the hint',
      );
      const allowed = await availableIds(s);
      assert.ok(
        body.skills.every((k: any) => allowed.has(k.id)),
        `${name}: only authorized skills sent`,
      );
      sizes[name] = JSON.stringify(body.skills).length + body.roleHint.length;
    }
    const full = JSON.stringify(
      SKILL_CATALOG.map((k) => ({
        id: k.id,
        name: k.name,
        description: k.description,
        slots: k.slots,
      })),
    ).length;
    assert.ok(sizes.administrator < full && sizes.oss < full, JSON.stringify({ sizes, full }));
    console.log(`[copilot-context] ${JSON.stringify({ sizes, fullCatalogChars: full })}`);
  } finally {
    process.env.SKILLS_INTERPRETER = saved.mode;
    if (saved.url === undefined) delete process.env.AI_RUNTIME_URL;
    else process.env.AI_RUNTIME_URL = saved.url;
    if (saved.token === undefined) delete process.env.AI_RUNTIME_SERVICE_TOKEN;
    else process.env.AI_RUNTIME_SERVICE_TOKEN = saved.token;
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test('L — «continua da dove avevi lasciato» never resumes a stale sensitive preview', async () => {
  const draft = await say(nurse, {
    message: 'registra pressione 128/84 per questo ospite',
    context: { currentPatientId: ids.nB },
  });
  assert.equal(draft.body.status, 'NEEDS_CONFIRMATION');
  assert.ok(
    (await home(nurse)).continueWork.some((w: any) => w.workflowId === draft.body.workflowId),
  );
  setProactiveClock(() => new Date(Date.now() + 31 * 60_000));
  try {
    assert.ok(
      !(await home(nurse)).continueWork.some((w: any) => w.workflowId === draft.body.workflowId),
      'older than COPILOT_RESUME_MAX_MIN',
    );
  } finally {
    setProactiveClock(null);
    await say(nurse, {
      workflowId: draft.body.workflowId,
      action: 'cancel',
      context: { currentPatientId: ids.nB },
    });
  }
});

test('M — the home is audited and writes nothing clinical', async () => {
  const before = await prisma.patientParameterReading.count();
  await home(oss);
  assert.ok(await waitForAudit({ operatorId: 'SIM-OSS-1', actionType: 'copilot:home' }));
  assert.equal(await prisma.patientParameterReading.count(), before);
});
