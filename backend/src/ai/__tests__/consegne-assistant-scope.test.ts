import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { assistantQuery } from '../assistant/service.js';
import type { UserContext } from '../gateway/types.js';
import { prisma } from '../../lib/prisma.js';

// #389 + urgency model: by default clinical identities read every handover of reachable residents.
// This suite exercises the author/assignee rule, which still applies in the restricted scope mode.
process.env.RESIDENT_SCOPE_CONFIG ??= JSON.stringify({ fallback: 'registered_by_me' });

const run = `${Date.now()}${Math.random().toString(36).slice(2)}`;
const actor = `assistant-op-${run}`;
const allowedPatient = `assistant-patient-allowed-${run}`;
const deniedPatient = `assistant-patient-denied-${run}`;

before(async () => {
  await prisma.consegna.createMany({
    data: [
      ...Array.from({ length: 510 }, (_, index) => ({
        id: `assistant-foreign-${index}-${run}`,
        pazienteId: allowedPatient,
        pazienteNome: 'Paziente Esterno',
        note: `foreign ${index}`,
        priorita: 'urgente',
        scadenza: '2026-08-28',
        operatoreAssegnato: 'Altro',
        operatoreAssegnatoId: 'foreign-operator',
        creatoDA: 'Altro',
        creatoDaId: 'foreign-operator',
        createdAt: new Date(Date.now() + index * 1_000),
      })),
      {
        id: `assistant-own-assigned-${run}`,
        pazienteId: allowedPatient,
        pazienteNome: 'Rossi, Ada',
        note: 'controllare pressione',
        priorita: 'urgente',
        scadenza: '2026-08-28',
        operatoreAssegnato: 'Operatore corrente',
        operatoreAssegnatoId: actor,
        creatoDA: 'Collega',
        creatoDaId: 'colleague',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: `assistant-own-created-${run}`,
        pazienteId: allowedPatient,
        pazienteNome: 'Verdi, Bruno',
        note: 'rivedere esami',
        priorita: 'urgente',
        scadenza: '2026-08-28',
        operatoreAssegnato: '',
        creatoDA: 'Operatore corrente',
        creatoDaId: actor,
        createdAt: new Date('2026-01-01T00:00:01.000Z'),
      },
      {
        id: `assistant-own-denied-patient-${run}`,
        pazienteId: deniedPatient,
        pazienteNome: 'Neri, Carla',
        note: 'non autorizzata',
        priorita: 'urgente',
        scadenza: '2026-08-28',
        operatoreAssegnato: 'Operatore corrente',
        operatoreAssegnatoId: actor,
        creatoDA: 'Operatore corrente',
        creatoDaId: actor,
        createdAt: new Date('2026-01-01T00:00:02.000Z'),
      },
      // UX2 W8: a normal handover is a note, never «to do».
      {
        id: `assistant-own-normal-${run}`,
        pazienteId: allowedPatient,
        pazienteNome: 'Bianchi, Dora',
        note: 'nota normale',
        scadenza: '2026-08-28',
        operatoreAssegnato: 'Operatore corrente',
        operatoreAssegnatoId: actor,
        creatoDA: 'Collega',
        creatoDaId: 'colleague',
      },
      // UX2 W8: an urgency already taken in charge (acknowledged below) leaves the queue.
      {
        id: `assistant-own-taken-${run}`,
        pazienteId: allowedPatient,
        pazienteNome: 'Gialli, Elio',
        note: 'urgenza presa in carico',
        priorita: 'urgente',
        scadenza: '2026-08-28',
        operatoreAssegnato: 'Operatore corrente',
        operatoreAssegnatoId: actor,
        creatoDA: 'Collega',
        creatoDaId: 'colleague',
      },
      // Legacy: urgent but completed under the old model → closed, not in the queue.
      {
        id: `assistant-own-legacy-${run}`,
        pazienteId: allowedPatient,
        pazienteNome: 'Rosa, Fabio',
        note: 'legacy completata',
        priorita: 'urgente',
        stato: 'completata',
        scadenza: '2026-08-28',
        operatoreAssegnato: 'Operatore corrente',
        operatoreAssegnatoId: actor,
        creatoDA: 'Collega',
        creatoDaId: 'colleague',
      },
    ],
  });
  await prisma.consegnaAcknowledgement.create({
    data: {
      consegnaId: `assistant-own-taken-${run}`,
      patientId: allowedPatient,
      operatorId: `taker-${run}`,
      operatorName: 'Chi ha capito',
      operatorRole: 'medico',
    },
  });
});
after(async () => {
  // Deleting the handover cascades its acknowledgement (the only DELETE the trigger allows).
  await prisma.consegna.deleteMany({ where: { id: { contains: run } } });
});

test('assistant applies verified actor and patient scope before bounds with exact counts', async () => {
  const ctx: UserContext = {
    userId: actor,
    tenantId: 'clinicos',
    roles: ['operatore'],
    permittedPatientIds: [allowedPatient],
    requestId: `request-${run}`,
  };
  const answer = await assistantQuery(
    'mostrami le mie consegne',
    ctx,
    { operatorName: 'Nome non usato come chiave' },
    { AI_FACILITY_QUERIES_ENABLED: 'true' },
  );
  assert.equal(answer.intent, 'operator_queue');
  const queue = answer.results[0] as {
    myLikelyConsegneCount: number;
    otherOpenConsegneCount: number;
    myLikelyConsegne: Array<{ id: string }>;
    otherOpenConsegne: Array<{ id: string }>;
  };
  assert.equal(queue.myLikelyConsegneCount, 1);
  assert.equal(queue.otherOpenConsegneCount, 1);
  assert.deepEqual(
    queue.myLikelyConsegne.map((row) => row.id),
    [`assistant-own-assigned-${run}`],
  );
  assert.deepEqual(
    queue.otherOpenConsegne.map((row) => row.id),
    [`assistant-own-created-${run}`],
  );
  assert.ok(
    [...queue.myLikelyConsegne, ...queue.otherOpenConsegne].every(
      (row) => !row.id.includes('foreign') && !row.id.includes('denied-patient'),
    ),
  );
  // UX2 W8: never the legacy stored stato in what the assistant reads.
  assert.ok(
    [...queue.myLikelyConsegne, ...queue.otherOpenConsegne].every(
      (row) =>
        !('stato' in row) && (row as { urgenza?: string }).urgenza === 'da prendere in carico',
    ),
  );
});
