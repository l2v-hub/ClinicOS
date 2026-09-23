import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import express from 'express';
import {
  actor, prisma, drafts, confirm, session, twoGroups, resultFor, lifecycle, PDFDocument,
} from '../fixtures/po05-backend.mts';
import { seedDrugCatalog } from '../fixtures/drug-catalog.mjs';
import { painadEmpty, painadComplete } from '../fixtures/po10-assessments.mjs';
import { therapyFormToInput } from '../../frontend/src/components/shared/intake/therapyFormPayload.ts';

/** Prepared during PO13; run only after PO15. Providers and live patients are never contacted. */
test('one synthetic patient round preserves identity, import, schedule, readings and immutable assessment archive', { timeout: 120000 }, async () => {
  const trace: object[] = [];
  const modules = await Promise.all([
    import('../../backend/src/routes/patients.js'),
    import('../../backend/src/routes/admin-rooms.js'),
    import('../../backend/src/routes/roster-order.js'),
    import('../../backend/src/routes/therapy.js'),
    import('../../backend/src/routes/consegne.js'),
    import('../../backend/src/routes/patient-assessments.js'),
    import('../../backend/src/routes/patient-documents.js'),
    import('../../backend/src/patients/parameter-readings.js'),
    import('../../backend/src/patients/parameter-reading-input.js'),
  ]);
  const [patients, rooms, roster, therapy, consegne, assessments, documents, readings, dates] = modules;
  const app = express(); app.use(express.json());
  app.use('/patients', rooms.patientAssignmentRouter);
  app.use('/patients', documents.default); app.use('/patients', assessments.default);
  app.use('/patients', patients.default); app.use('/me', roster.meRosterOrderRouter);
  app.use('/therapy-slots', therapy.default); app.use('/consegne', consegne.default);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(ok => server.once('listening', ok));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const headers = (patientId = '') => ({ 'Content-Type': 'application/json',
    'X-Operator-Id': actor.id, 'X-Operator-Role': actor.role, 'X-Demo-Patient-Id': patientId });
  async function http(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
    const response = await fetch(`${origin}${path}`, { method,
      headers: headers(path.match(/^\/patients\/([^/]+)/)?.[1]),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }
  const ok = (response: any, status = 200) => {
    assert.equal(response.status, status, JSON.stringify(response.body)); return response.body;
  };
  const today = dates.facilityToday(), instant = `${today}T06:30:00.000Z`;
  try {
    await seedDrugCatalog(prisma);
    const context = await prisma.rosterContext.create({ data: {
      departmentKey: `po16-${randomUUID()}`, label: 'Reparto sintetico PO16',
      defaultCriterion: 'location', defaultDirection: 'asc',
    } });
    await prisma.operator.update({ where: { id: actor.id }, data: { rosterContextId: context.id } });
    const intake = await drafts.createDraft({ source: 'manual', createdById: actor.id });
    const entered = await confirm.confirmDraft(intake.id, { patient: { firstName: 'Anna', lastName: 'Giro sintetico' } }, actor);
    assert.equal(entered.status, 'created'); const patientId = entered.patient.id;
    const rawPatient = await prisma.patient.findUniqueOrThrow({ where: { id: patientId } });
    assert.equal(rawPatient.dateOfBirth, null); assert.equal(rawPatient.codiceFiscale, null);
    assert.ok(!rawPatient.phone); assert.equal(rawPatient.registeredById, actor.id);
    ok(await http(`/patients/${patientId}`, { dateOfBirth: '1950-06-15', codiceFiscale: 'RSSMRA70A01H501S', phone: '+39 333 000 0000', sex: 'F' }, 'PATCH'));
    trace.push({ step: 'progressive-intake', patientId, missingValuesPreservedAsNull: true, laterCompleted: true });

    let job = await twoGroups(await session(30));
    const edit = { requestId: randomUUID(), expectedRevision: job.manifest.revision,
      groups: job.manifest.groups,
      pages: [...job.manifest.pages].reverse().map((p: any, index: number) => ({ id: p.id, groupId: p.groupId, sortOrder: Math.floor(index / 2) })) };
    job = await lifecycle.editManifest(job.id, edit);
    assert.equal((await lifecycle.editManifest(job.id, edit)).manifest.revision, job.manifest.revision);
    await assert.rejects(lifecycle.editManifest(job.id, { ...edit, requestId: randomUUID() }));
    const [firstGroup, secondGroup] = job.manifest.groups.map((g: any) => g.id);
    const extraction = await resultFor(job, {
      [firstGroup]: '## TERAPIA\nTACHIPIRINA CPR 1000 MG (OS) 1 Cpr ore 16:00; controllare PA alle 22:00',
      [secondGroup]: '## DECORSO\nOsservazione sintetica del giro reparto.',
    }, {
      [firstGroup]: { anagrafica: {}, cartella: {} }, [secondGroup]: { anagrafica: {}, cartella: {} },
    });
    let imported = await drafts.seedDraftFromImport(job.id, { createdById: actor.id });
    assert.equal(imported.data.terapiaImport.length, 1);
    const originalRow = imported.data.terapiaImport[0];
    assert.match(originalRow.originalText, /16:00/); assert.match(originalRow.note, /22:00/);
    const selected: any = {
      farmacoNome: 'TACHIPIRINA', drugPackageRef: '012745170', pharmaceuticalForm: 'compressa',
      commercialStrengthValue: '1000', commercialStrengthUnit: 'mg', allowedFractions: ['1'],
      viaSomministrazione: 'orale', tipo: 'periodica', stato: 'attiva', dataInizio: today, dataFine: '',
      schedules: [{ time: '20:00', quantityNumerator: 1, quantityDenominator: 1, administrationUnit: 'compressa' }],
      giorniSettimana: [], prescrittore: '', note: originalRow.note, dataSomministrazione: '', orarioSomministrazione: '',
    };
    imported = await drafts.patchDraft(imported.id, { expectedDraftVersion: imported.version,
      terapiaImport: [{ ...originalRow, stato: 'ok', reviewedTherapy: selected }] });
    const input = { ...therapyFormToInput(selected), intakeSource: { type: 'import', index: 0 } };
    const payload = { mode: 'existing', patientId, patient: { firstName: 'Anna', lastName: 'Giro sintetico' },
      therapies: [input], _importSource: extraction._source };
    assert.equal((await confirm.confirmDraft(imported.id, payload, actor)).patient.id, patientId);
    assert.equal((await confirm.confirmDraft(imported.id, payload, actor)).status, 'idempotent');
    const therapies = await prisma.patientTherapy.findMany({ where: { patientId }, include: { schedules: true } });
    assert.equal(therapies.length, 1); assert.equal(therapies[0].drugPackageRef, '012745170');
    assert.deepEqual(therapies[0].schedules.map((s: any) => s.time), ['20:00']);
    assert.match(therapies[0].note, /22:00/);
    const sourceDocuments = await prisma.patientDocument.findMany({ where: { patientId } });
    assert.equal(sourceDocuments.length, 3);
    const pageCounts = await Promise.all(sourceDocuments.map(async (d: any) =>
      (await PDFDocument.load(Buffer.from(d.dataBase64, 'base64'))).getPageCount()));
    assert.deepEqual(pageCounts.sort((a: number, b: number) => a - b), [15, 15, 30]);
    const pageOrder=[];
    for(const document of sourceDocuments){
      const manifest=document.sourceManifest;
      const widths=(await PDFDocument.load(Buffer.from(document.dataBase64,'base64'))).getPages().map((page:any)=>page.getWidth());
      const expected=manifest.kind==='original'?Array.from({length:30},(_,i)=>201+i):
        manifest.groupId===firstGroup?Array.from({length:15},(_,i)=>229-i*2):Array.from({length:15},(_,i)=>230-i*2);
      assert.deepEqual(widths,expected,`Imported PDF page order ${manifest.kind}/${manifest.groupId??'original'}`);
      pageOrder.push({kind:manifest.kind,groupId:manifest.groupId??null,widths});
    }
    trace.push({ step: 'long-import', pages: 30, letters: 2, archivedPageCounts: pageCounts,
      pageOrder,extraction: 'synthetic-injected-no-provider', correctedTime: '20:00', noteTime: '22:00', therapyId: therapies[0].id });

    const room = await prisma.room.create({ data: { numero: 'PO16-01', beds: { create: { label: 'A' } } }, include: { beds: true } });
    ok(await http(`/patients/${patientId}/room-assignments`, { bedId: room.beds[0].id, startDate: today }), 201);
    const preference = ok(await http('/me/roster-order'));
    const ordered = ok(await http('/me/roster-order', { contextId: preference.context.id,
      override: { criterion: 'name', direction: 'asc' }, expectedVersion: preference.revision }, 'PATCH'));
    ok(await http('/me/roster-order', { contextId: preference.context.id,
      override: { criterion: 'location', direction: 'asc' }, expectedVersion: ordered.revision }, 'PATCH'));
    const rosterPage = ok(await http('/patients/page?sort=location&direction=asc&limit=10'));
    assert.equal(rosterPage.items.find((p: any) => p.id === patientId).location.room, 'PO16-01');
    const slots = ok(await http(`/therapy-slots?date=${today}`));
    assert.deepEqual(slots.flatMap((s: any) => s.patients).filter((p: any) => p.patientId === patientId)
      .flatMap((p: any) => p.administrations).map((a: any) => a.scheduledTime), ['20:00']);
    const administrationBody = { patientId, therapyId: therapies[0].id, date: today, fascia: 'sera' };
    const administration = ok(await http('/therapy-slots/confirm', administrationBody));
    assert.equal(administration.patientId, patientId); assert.equal(administration.ora, '20:00');
    assert.equal((await http('/therapy-slots/confirm', administrationBody)).status, 409);
    const readingBody = { requestId: randomUUID(), measuredAt: instant,
      values: { pa: '120/80', fc: '72', temperatura: '36.5', note: 'Nota sintetica giro reparto' } };
    const reading = await readings.createParameterReading(patientId, readingBody, actor);
    assert.equal((await readings.createParameterReading(patientId, readingBody, actor)).reading.id, reading.reading.id);
    const history = await readings.listParameterReadings(patientId, { date: today }, actor);
    assert.equal(history.readings.length, 1); assert.equal(history.readings[0].measuredAt, instant);
    assert.equal(reading.summary.noteCount, 1);
    trace.push({ step: 'round', room: 'PO16-01', bed: 'A', readingId: reading.reading.id,
      readingInstant: instant, administrationId: administration.id, duplicateAdministrationRejected: true });

    const roundIds = [patientId];
    for (let index = 1; index < 5; index++) {
      const peer = await drafts.createDraft({ source: 'manual', createdById: actor.id });
      const saved = await confirm.confirmDraft(peer.id, { patient: { firstName: `Persona${index}`, lastName: 'Giro sintetico' } }, actor);
      roundIds.push(saved.patient.id);
    }
    for (const [index, id] of roundIds.entries()) {
      const body = { requestId: randomUUID(), pazienteId: id, priorita: 'normale', tipo: 'Monitoraggio',
        note: `Consegna sintetica ${index + 1}`, scadenza: today };
      const saved = ok(await http('/consegne', body), 201);
      assert.equal(saved.pazienteId, id); const replay=ok(await http('/consegne', body),201);
      assert.equal(replay.id,saved.id);assert.equal(replay.replayed,true);
      const peerReadings = await readings.listParameterReadings(id, { date: today }, actor);
      assert.equal(peerReadings.readings.length, index === 0 ? 1 : 0);
    }
    const handoverCounts=await Promise.all(roundIds.map(id=>prisma.consegna.count({where:{pazienteId:id}})));
    assert.deepEqual(handoverCounts,[1,1,1,1,1]);
    trace.push({ step: 'handover-five-patients', patientIds: roundIds, counts: handoverCounts });

    const assessmentPath = `/patients/${patientId}/assessments`;
    const createBody = { requestId: randomUUID(), type: 'painad', formVersion: 'painad-it-2026-09-22-v1', assessedAt: instant, answers: painadEmpty };
    let assessment = ok(await http(assessmentPath, createBody), 201).assessment;
    assert.equal((await http(`${assessmentPath}/${assessment.id}/finalize`, { requestId: randomUUID(), expectedVersion: assessment.version })).status, 422);
    assessment = ok(await http(`${assessmentPath}/${assessment.id}`, { assessedAt: instant, expectedVersion: assessment.version, answers: painadComplete }, 'PATCH')).assessment;
    const finalBody = { requestId: randomUUID(), expectedVersion: assessment.version };
    const final = ok(await http(`${assessmentPath}/${assessment.id}/finalize`, finalBody)).assessment;
    assert.equal(ok(await http(`${assessmentPath}/${assessment.id}/finalize`, finalBody)).assessment.id, final.id);
    const correction = ok(await http(assessmentPath, { ...createBody, requestId: randomUUID(),
      answers: { ...painadComplete, respiration: 0 }, predecessorId: final.id, correctionReason: 'Rettifica sintetica giro' }), 201).assessment;
    const corrected = ok(await http(`${assessmentPath}/${correction.id}/finalize`, { requestId: randomUUID(), expectedVersion: correction.version })).assessment;
    assert.equal(final.result.total, 10); assert.equal(corrected.result.total, 8);
    assert.equal(corrected.assessedAt, final.assessedAt);
    assert.deepEqual(ok(await http(`${assessmentPath}/${final.id}`)).assessment.finalSnapshot, final.finalSnapshot);
    const archived = ok(await http(`/patients/${patientId}/documents`)).documents;
    assert.equal(archived.length, 5);
    for (const record of [final, corrected]) {
      const document = archived.find((d: any) => d.id === record.pdf.documentId);
      assert.equal(document.assessment.id, record.id);
      const response = await fetch(`${origin}/patients/${patientId}/documents/${document.id}/content`, { headers: headers(patientId) });
      assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(createHash('sha256').update(bytes).digest('hex'), document.sha256);
    }
    trace.push({ step: 'assessment-and-archive', type: 'painad', finalId: final.id, correctionId: corrected.id,
      originalUnchanged: true, documentCount: archived.length });

    const beforeDischarge = ok(await http(`/patients/${patientId}/cartella`)).data;
    assert.ok(!beforeDischarge.dimissione?.compilatoAt);
    const discharge = { data: today, ora: '10:00', condizioni: 'stabili', destinazione: 'domicilio',
      istruzioni: 'Conclusione del collaudo tecnico sintetico.', operatore: 'Operatore sintetico',
      compilatoAt: new Date().toISOString() };
    const savedDischarge = ok(await http(`/patients/${patientId}/cartella`, { data: { ...beforeDischarge, dimissione: discharge } }, 'PUT'));
    assert.equal(savedDischarge.data.dimissione.compilatoAt, discharge.compilatoAt);
    assert.equal((await readings.listParameterReadings(patientId, { date: today }, actor)).readings.length, 1);
    assert.equal(ok(await http(`/patients/${patientId}/documents`)).documents.length, 5);
    assert.equal(await prisma.patientTherapy.count({ where: { patientId } }), 1);
    trace.push({ step: 'explicit-discharge-section-save', preserved: ['reading', 'therapy', 'source-documents', 'assessment-documents'] });
    await writeFile('artifacts/task-validation/po-16-giro/integrated-round-receipt.json', JSON.stringify({
      data: 'synthetic-only', transport: 'loopback-http-and-production-services', trace,
      limitations: ['OCR extraction injected, not a live provider or physical scanner', 'Native print dialog and clinical operator observation not exercised by this test'],
    }, null, 2));
  } finally {
    server.closeAllConnections(); await new Promise<void>(ok => server.close(() => ok()));
  }
});
