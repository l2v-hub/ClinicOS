// Functional and negative API audit. Use a fresh local database seeded for this audit.
// Creates only synthetic data, leaves immutable evidence in that isolated database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import CodiceFiscale from 'codice-fiscale-js';

const base = process.env.QA_BACKEND_URL ?? 'http://127.0.0.1:3101';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('This audit requires an isolated local backend');
const out = resolve(process.argv[2] ?? '/tmp/clinicos-functional-api');
mkdirSync(out, { recursive: true });
const results = [];
const evidence = {};
async function call(session, method, path, body, extra = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await r.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* PDF/empty/error text */
  }
  return { status: r.status, data, cache: r.headers.get('cache-control') };
}
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, pass: true, detail });
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
  }
}
const sessions = {};
for (const [name, id] of Object.entries({
  admin: 'SIM-ADMIN',
  supervisor: 'SIM-SUPERVISOR-1',
  doctor: 'SIM-DOCTOR-1',
  nurse: 'SIM-NURSE-1',
  oss: 'SIM-OSS-1',
})) {
  const r = await call(null, 'POST', '/auth/simulator/session', { identityId: id });
  assert.equal(r.status, 201);
  const me = await call(r.data, 'GET', '/auth/me');
  sessions[name] = { token: r.data.token, id, capabilities: me.data.capabilities };
}
const { admin, supervisor, doctor, nurse, oss } = sessions;
const seed = 'SEED-PAZ-001';
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const registry = JSON.parse(
  readFileSync(new URL('../backend/src/authz/capability-registry.json', import.meta.url)),
);
const pathOf = (path) =>
  path
    .replace(/:patientId\b/g, seed)
    .replace(/:sectionKey\b/g, 'ANAMNESIS')
    .replace(/:[A-Za-z]+/g, 'QA-missing');

// Independently exercise every mapped denied write, plus anonymous access to policy routes.
for (const cap of registry.capabilities.filter((c) => c.gate === 'policy')) {
  for (const route of cap.routes ?? []) {
    const path = pathOf(route.path);
    await check(`anonymous:${route.method}:${cap.id}:${route.path}`, async () => {
      const r = await call(null, route.method, path, route.method === 'GET' ? undefined : {});
      assert.ok([401, 403].includes(r.status), `Expected auth denial, got ${r.status}`);
      return r.status;
    });
    if (['GET', 'HEAD'].includes(route.method)) continue;
    for (const [role, s] of Object.entries(sessions)) {
      const governed = cap.governedBy ?? cap.id;
      if (s.capabilities[governed]?.allowed) continue;
      await check(`denied-write:${role}:${cap.id}:${route.path}`, async () => {
        const r = await call(s, route.method, path, {});
        assert.equal(r.status, 403, `Expected policy denial, got ${r.status}`);
        return r.status;
      });
    }
  }
}
const reads = [
  ['patients.list_page', '/patients/page?limit=2'],
  ['parameters.list_page', '/patients/parameters/page?limit=2'],
  ['patients.clinical_overview', '/patients/clinical-summary/overview'],
  ['patients.get', `/patients/${seed}`],
  ['clinical_record.get', `/patients/${seed}/cartella`],
  ['therapy.list_page', `/patients/${seed}/therapies/page?limit=2`],
  ['parameters.list_readings', `/patients/${seed}/parameter-readings?limit=2`],
  ['diary.list', `/patients/${seed}/diary?limit=2`],
  ['narrative.list', `/patients/${seed}/narrative-sections`],
  ['documents.list', `/patients/${seed}/documents`],
  ['assessments.catalog', `/patients/${seed}/assessments/catalog`],
  ['consegne.list', '/consegne?limit=2'],
  ['appointments.list', `/appointments?date=${today}`],
  ['rooms.occupancy', '/admin/rooms/occupancy'],
  ['operators.directory_page', '/operators/directory/page?limit=2'],
];
for (const [role, s] of Object.entries(sessions))
  for (const [cap, path] of reads) {
    await check(`read:${role}:${cap}`, async () => {
      const r = await call(
        s,
        'GET',
        path,
        undefined,
        path.endsWith('/documents') ? { 'X-Demo-Patient-Id': seed } : {},
      );
      const allowed = s.capabilities[cap]?.allowed;
      assert.equal(r.status, allowed ? 200 : 403, JSON.stringify(r.data).slice(0, 200));
      if (allowed) assert.match(r.cache ?? '', /no-store/);
      return r.status;
    });
  }

let patientId;
await check('patient:create/duplicate/reload', async () => {
  const nonce = parseInt(randomUUID().slice(0, 8), 16);
  const day = 1 + (nonce % 28),
    month = 1 + (Math.floor(nonce / 28) % 12),
    year = 1900 + (Math.floor(nonce / 336) % 90);
  const dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const cf = CodiceFiscale.compute({
    name: 'Mario',
    surname: 'Rossi',
    gender: 'M',
    day,
    month,
    year,
    birthplace: 'Roma',
    birthplaceProvincia: 'RM',
  });
  const input = {
    firstName: 'Mario',
    lastName: 'Rossi QA sintetico',
    dateOfBirth,
    sex: 'M',
    codiceFiscale: cf,
    phone: '+39 333 0000010',
  };
  const r = await call(doctor, 'POST', '/patients', input);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  patientId = r.data.id;
  assert.equal((await call(doctor, 'POST', '/patients', input)).status, 409);
  assert.equal((await call(nurse, 'GET', `/patients/${patientId}`)).data.codiceFiscale, cf);
  evidence.patientId = patientId;
});
if (patientId) {
  await check('patient:invalid-calendar-date', async () => {
    const r = await call(doctor, 'PATCH', `/patients/${patientId}`, { dateOfBirth: '2026-02-30' });
    assert.equal(r.status, 400, JSON.stringify(r.data));
  });
  await check('patient:malformed-email-is-a-client-error', async () => {
    const r = await call(doctor, 'PATCH', `/patients/${patientId}`, {
      email: { unexpected: 'object' },
    });
    evidence.malformedEmail = r;
    assert.equal(
      r.status,
      400,
      'Malformed optional field reached persistence instead of validation',
    );
  });
  await check('parameters:idempotency/changed-replay/persisted-patient', async () => {
    const body = {
      requestId: randomUUID(),
      measuredAt: new Date().toISOString(),
      values: { pa: '120/80', fc: '70', temperatura: '37,5', note: 'QA sintetico' },
    };
    const first = await call(nurse, 'POST', `/patients/${patientId}/parameter-readings`, body);
    assert.equal(first.status, 201, JSON.stringify(first.data));
    const replay = await call(nurse, 'POST', `/patients/${patientId}/parameter-readings`, body);
    assert.equal(replay.status, 200);
    assert.equal(first.data.reading.id, replay.data.reading.id);
    assert.equal(
      (
        await call(nurse, 'POST', `/patients/${patientId}/parameter-readings`, {
          ...body,
          values: { fc: '71' },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(nurse, 'POST', `/patients/${patientId}/parameter-readings`, {
          ...body,
          requestId: randomUUID(),
          values: { pa: '120/800' },
        })
      ).status,
      400,
    );
    const listed = await call(nurse, 'GET', `/patients/${patientId}/parameter-readings?limit=1`);
    assert.equal(listed.data.readings[0].patientId, patientId);
    evidence.parameterReading = first.data.reading.id;
  });
  await check('parameters:concurrent-same-request', async () => {
    const input = {
      requestId: randomUUID(),
      measuredAt: new Date().toISOString(),
      values: { fc: '72' },
    };
    const rs = await Promise.all(
      Array.from({ length: 4 }, () =>
        call(nurse, 'POST', `/patients/${patientId}/parameter-readings`, input),
      ),
    );
    assert.ok(
      rs.every((r) => [200, 201].includes(r.status)),
      JSON.stringify(rs),
    );
    assert.equal(new Set(rs.map((r) => r.data.reading.id)).size, 1);
  });
  await check('narrative:original-immutable/reviewed-edit', async () => {
    const path = `/patients/${patientId}/narrative-sections/ANAMNESIS`;
    const first = await call(doctor, 'PUT', path, {
      originalText: 'Originale sintetico',
      reviewedText: 'Revisione 1',
      reviewStatus: 'reviewed',
    });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    const second = await call(doctor, 'PUT', path, {
      originalText: 'Tentativo sostituzione originale',
      reviewedText: 'Revisione 2',
      reviewStatus: 'reviewed',
    });
    assert.equal(second.data.originalText, 'Originale sintetico');
    assert.equal(second.data.displayText, 'Revisione 2');
  });
  await check('narrative:explicit-empty-edit', async () => {
    const path = `/patients/${patientId}/narrative-sections/ANAMNESIS`;
    const r = await call(doctor, 'PUT', path, { reviewedText: '', reviewStatus: 'reviewed' });
    evidence.emptyNarrative = r.data;
    assert.equal(r.data.displayText, '', 'Clearing reviewed text resurrected the original');
  });
  let therapy;
  await check('therapy:create/authoritative-read/nurse-denied', async () => {
    const input = {
      farmacoNome: 'QA Farmaco sintetico',
      dataInizio: today,
      dosaggio: '500 mg',
      viaSomministrazione: 'orale',
      tipo: 'periodica',
      fasceMattina: true,
    };
    const r = await call(doctor, 'POST', `/patients/${patientId}/therapies`, input);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    therapy = r.data;
    assert.equal(
      (await call(nurse, 'POST', `/patients/${patientId}/therapies`, input)).status,
      403,
    );
    evidence.therapy = therapy;
  });
  await check('therapy:invalid-weekdays-must-not-become-daily', async () => {
    const r = await call(doctor, 'POST', `/patients/${patientId}/therapies`, {
      farmacoNome: 'QA Invalid weekday',
      dataInizio: today,
      tipo: 'periodica',
      fasceMattina: true,
      giorniSettimana: '0,8,x',
    });
    evidence.invalidWeekdays = r;
    assert.equal(r.status, 400, 'Invalid weekday input was persisted as daily therapy');
  });
  await check('therapy:two-times-in-same-band-preserve-both-doses', async () => {
    const body = {
      farmacoNome: 'QA Two morning doses',
      dataInizio: today,
      tipo: 'periodica',
      commercialStrengthValue: 100,
      commercialStrengthUnit: 'mg',
      pharmaceuticalForm: 'compressa',
      viaSomministrazione: 'orale',
      schedules: [
        {
          time: '08:00',
          quantityNumerator: 1,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
        {
          time: '10:00',
          quantityNumerator: 2,
          quantityDenominator: 1,
          administrationUnit: 'compressa',
        },
      ],
    };
    const r = await call(doctor, 'POST', `/patients/${patientId}/therapies`, body);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const feed = await call(nurse, 'GET', `/therapy-slots?date=${today}`);
    assert.equal(feed.status, 200, JSON.stringify(feed.data));
    const slots = feed.data.slots ?? feed.data;
    const doses = slots
      .flatMap((s) => s.patients ?? [])
      .filter((p) => p.patientId === patientId)
      .flatMap((p) => p.administrations ?? [])
      .filter((a) => a.therapyId === r.data.id);
    evidence.sameBandSchedules = { therapy: r.data, doses };
    assert.equal(doses.length, 2, 'Two valid morning schedules collapsed into one dose');
  });
  if (therapy)
    await check('administration:confirmation/duplicate/actor-authority', async () => {
      const body = {
        patientId,
        therapyId: therapy.id,
        date: today,
        fascia: 'mattina',
        farmacoNome: 'SPOOF',
        farmacoDose: '9999 mg',
        operatoreId: 'SIM-DOCTOR-1',
      };
      const r = await call(nurse, 'POST', '/therapy-slots/confirm', { ...body, confirmed: true });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      evidence.administration = r.data;
      assert.notEqual(r.data.farmacoNome, 'SPOOF');
      const duplicate = await call(nurse, 'POST', '/therapy-slots/confirm', {
        ...body,
        confirmed: true,
      });
      assert.ok([200, 409].includes(duplicate.status));
      assert.equal((await call(doctor, 'POST', '/therapy-slots/confirm', body)).status, 403);
    });
  await check('appointments:concurrent-slot-conflict/update/delete', async () => {
    const body = {
      patientId,
      operatorId: doctor.id,
      data: today,
      ora: '23:00',
      durata: 30,
      tipologia: 'visita',
      note: 'QA sintetico',
    };
    const rs = await Promise.all([
      call(doctor, 'POST', '/appointments', body),
      call(doctor, 'POST', '/appointments', body),
    ]);
    assert.deepEqual(rs.map((r) => r.status).sort(), [201, 409], JSON.stringify(rs));
    const created = rs.find((r) => r.status === 201).data;
    assert.equal(
      (await call(doctor, 'PATCH', `/appointments/${created.id}`, { ora: '22:00' })).status,
      200,
    );
    assert.equal((await call(doctor, 'DELETE', `/appointments/${created.id}`)).status, 204);
  });
  await check('assessment:PAINAD/version-conflict/final-PDF/immutable', async () => {
    const answers = {
      respiration: 0,
      negativeVocalization: 1,
      facialExpression: 1,
      bodyLanguage: 1,
      consolability: 0,
    };
    const body = {
      requestId: randomUUID(),
      type: 'painad',
      formVersion: 'painad-it-2026-09-22-v1',
      assessedAt: new Date().toISOString(),
      answers,
    };
    const created = await call(nurse, 'POST', `/patients/${patientId}/assessments`, body);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const a = created.data.assessment;
    const path = `/patients/${patientId}/assessments/${a.id}`;
    const changed = await call(nurse, 'PATCH', path, {
      answers: { ...answers, respiration: 1 },
      assessedAt: body.assessedAt,
      expectedVersion: a.version,
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.data));
    assert.equal(
      (
        await call(nurse, 'PATCH', path, {
          answers,
          assessedAt: body.assessedAt,
          expectedVersion: a.version,
        })
      ).status,
      409,
    );
    const final = await call(nurse, 'POST', path + '/finalize', {
      requestId: randomUUID(),
      expectedVersion: changed.data.assessment.version,
    });
    assert.equal(final.status, 200, JSON.stringify(final.data));
    evidence.assessment = final.data;
    assert.equal(final.data.assessment.status, 'final');
    assert.equal(final.data.assessment.pdf.status, 'ready');
    const pdf = await call(
      nurse,
      'GET',
      `/patients/${patientId}/documents/${final.data.assessment.pdf.documentId}/content`,
      undefined,
      { 'X-Demo-Patient-Id': patientId },
    );
    assert.equal(pdf.status, 200, JSON.stringify(pdf.data).slice(0, 200));
    assert.ok(String(pdf.data).startsWith('%PDF'));
    const locked = await call(nurse, 'PATCH', path, {
      answers,
      assessedAt: body.assessedAt,
      expectedVersion: final.data.assessment.version,
    });
    assert.equal(locked.status, 409);
  });
  await check('handover:request-replay/urgency/self-ack/assignee-ack', async () => {
    const body = {
      pazienteId: patientId,
      priorita: 'urgente',
      tipo: 'assistenza',
      note: 'QA sintetico urgente',
      operatoreAssegnatoId: oss.id,
      requestId: randomUUID(),
    };
    const first = await call(nurse, 'POST', '/consegne', body);
    assert.equal(first.status, 201, JSON.stringify(first.data));
    const replay = await call(nurse, 'POST', '/consegne', body);
    assert.equal(replay.data.id, first.data.id);
    assert.equal((await call(nurse, 'POST', `/consegne/${first.data.id}/ack`, {})).status, 409);
    const ack = await call(oss, 'POST', `/consegne/${first.data.id}/ack`, {});
    assert.ok([200, 201].includes(ack.status), JSON.stringify(ack.data));
    evidence.handover = first.data.id;
  });
  await check('beds:two-patients-concurrent-one-bed', async () => {
    const room = await call(admin, 'POST', '/admin/rooms', {
      numero: 'QA-' + randomUUID().slice(0, 8),
      tipo: 'singola',
    });
    assert.equal(room.status, 201, JSON.stringify(room.data));
    const bedId = room.data.beds[0].id;
    const body = { bedId, startDate: today, note: 'QA solo dati sintetici' };
    const rs = await Promise.all([
      call(supervisor, 'POST', `/patients/${patientId}/room-assignments`, body),
      call(supervisor, 'POST', '/patients/SEED-PAZ-008/room-assignments', body),
    ]);
    assert.deepEqual(rs.map((r) => r.status).sort(), [201, 409], JSON.stringify(rs));
    evidence.bedRace = rs.map((r) => ({ status: r.status, id: r.data.id }));
    const own = await call(supervisor, 'GET', `/admin/rooms/${room.data.id}/beds`);
    assert.equal(own.status, 200);
  });
  await check('assistant:read/policy-denial/preview-cancel-no-write', async () => {
    const context = { currentPatientId: patientId };
    const read = await call(doctor, 'POST', '/skills/converse', {
      message: 'Dimmi tutto su questo ospite',
      context,
    });
    assert.equal(read.status, 200);
    assert.equal(read.data.status, 'COMPLETED', JSON.stringify(read.data));
    assert.equal(read.data.skillId, 'patient.overview');
    const denied = await call(oss, 'POST', '/skills/converse', {
      message: 'prescrivi Paracetamolo 1000 mg per questo ospite',
      context,
    });
    assert.equal(denied.data.status, 'DENIED', JSON.stringify(denied.data));
    const count = async () =>
      (await call(nurse, 'GET', `/patients/${patientId}/parameter-readings?limit=100`)).data
        .readings.length;
    const before = await count();
    const preview = await call(nurse, 'POST', '/skills/converse', {
      message: 'registra pressione 120/80 per questo ospite',
      context,
    });
    assert.equal(preview.data.status, 'NEEDS_CONFIRMATION', JSON.stringify(preview.data));
    assert.equal(await count(), before);
    const cancel = await call(nurse, 'POST', '/skills/converse', {
      workflowId: preview.data.workflowId,
      action: 'cancel',
      context,
    });
    assert.equal(cancel.data.status, 'CANCELLED');
    const late = await call(nurse, 'POST', '/skills/converse', {
      workflowId: preview.data.workflowId,
      action: 'confirm',
      previewId: preview.data.preview.previewId,
      context,
    });
    assert.equal(late.data.status, 'CANCELLED');
    assert.equal(await count(), before);
  });
}
await check('session:tamper/logout/revoked-token', async () => {
  assert.equal((await call({ ...oss, token: oss.token + 'x' }, 'GET', '/auth/me')).status, 401);
  assert.equal((await call(oss, 'POST', '/auth/simulator/logout', {})).status, 204);
  assert.equal((await call(oss, 'GET', '/auth/me')).status, 401);
});
writeFileSync(resolve(out, 'results.json'), JSON.stringify({ results, evidence }, null, 2));
const failures = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    { total: results.length, pass: results.length - failures.length, failures },
    null,
    2,
  ),
);
process.exitCode = failures.length ? 1 : 0;
