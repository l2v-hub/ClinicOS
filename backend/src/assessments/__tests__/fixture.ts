import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import assessmentRouter from '../../routes/patient-assessments.js';
import documentRouter from '../../routes/patient-documents.js';
import { PAINAD_KEYS, PAINAD_VERSION, type PainadAnswers } from '../types.js';
export const marker = `po10-${randomUUID().slice(0, 8)}`;
export const id = (value: string) => `${marker}-${value}`;
export const actor = { id: id('author'), role: 'operatore' };
export const other = { id: id('other'), role: 'operatore' };
export const manager = { ...other, role: 'manager' };
export const patient = id('patient'),
  second = id('second'),
  foreign = id('foreign');
export const answers = (value: 0 | 1 | 2 | null = 0) =>
  Object.fromEntries(PAINAD_KEYS.map((key) => [key, value])) as PainadAnswers;
export const input = (extra: Record<string, unknown> = {}) => ({
  requestId: randomUUID(),
  type: 'painad',
  formVersion: PAINAD_VERSION,
  assessedAt: '2026-03-28T23:30:00.000Z',
  answers: answers(),
  ...extra,
});
export const headers = (who = actor, patientId = patient) => ({
  'Content-Type': 'application/json',
  'X-Operator-Id': who.id,
  'X-Operator-Role': who.role,
  'X-Demo-Patient-Id': patientId,
});
export async function seed() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1');
  for (const who of [actor, other])
    await prisma.user.create({
      data: {
        email: `${who.id}@example.test`,
        passwordHash: 'synthetic',
        fullName: who === actor ? 'Élodie Παπαδόπουλος' : 'Bruno Collega',
        operator: { create: { id: who.id } },
      },
    });
  await prisma.patient.createMany({
    data: [patient, second, foreign].map((patientId) => ({
      id: patientId,
      medicalRecordNumber: patientId,
      firstName: 'Zoë',
      lastName: 'D’Àngelo',
      dateOfBirth: new Date('1940-01-02T00:00:00.000Z'),
      registeredById: patientId === foreign ? other.id : actor.id,
    })),
  });
  const room = await prisma.room.create({
    data: { numero: marker, reparto: 'Reparto non proiettato', beds: { create: { label: 'A' } } },
    include: { beds: true },
  });
  await prisma.patientRoomAssignment.create({
    data: {
      patientId: patient,
      roomId: room.id,
      bedId: room.beds[0].id,
      startDate: '2026-03-29',
      endDate: '2026-03-29',
    },
  });
  await prisma.cartella.create({
    data: {
      patientId: patient,
      data: { privateNarrative: 'must-not-enter-snapshot', scalaNRS: [{ id: 'legacy', score: 4 }] },
    },
  });
}
export async function server() {
  const app = express();
  app.use(express.json());
  app.use('/patients', assessmentRouter);
  app.use('/patients', documentRouter);
  const instance = await new Promise<Server>((ok) => {
    const s = app.listen(0, '127.0.0.1', () => ok(s));
  });
  const address = instance.address();
  return {
    base: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`,
    close: async () => {
      instance.closeAllConnections();
      await new Promise<void>((ok) => instance.close(() => ok()));
    },
  };
}
