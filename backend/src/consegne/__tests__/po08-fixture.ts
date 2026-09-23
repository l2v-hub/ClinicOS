import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import consegneRouter from '../../routes/consegne.js';
import voiceRouter from '../../routes/ai-voice.js';
import actionsRouter from '../../routes/ai-actions.js';

export const marker = `po08-${Date.now()}`;
export const id = (key: string) => `${marker}-${key}`;
export const actor = { id: id('owner'), role: 'operatore' };
export const other = { id: id('other'), role: 'operatore' };
export const manager = { id: actor.id, role: 'manager' };
export const patient = id('patient');
export const foreign = id('foreign');
export const zero = id('zero');
export const history = id('history');
export const payload = (requestId: string, extra = {}) => ({
  pazienteId: patient,
  note: 'Controllare la pressione',
  requestId,
  ...extra,
});
export const headers = (who = actor) => ({
  'X-Operator-Id': who.id,
  'X-Operator-Role': who.role,
  'Content-Type': 'application/json',
});

export async function seed() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1');
  for (const [who, name] of [
    [actor, 'Ada Autrice'],
    [other, 'Bruno Collega'],
  ] as const)
    await prisma.user.create({
      data: {
        id: id(`${who.id}-user`),
        email: `${who.id}@example.test`,
        passwordHash: 'synthetic-only',
        fullName: name,
        operator: { create: { id: who.id } },
      },
    });
  await prisma.patient.createMany({
    data: [patient, foreign, zero, history].map((key) => ({
      id: key,
      medicalRecordNumber: `${key}-MRN`,
      firstName: 'Ada',
      lastName: 'Bianchi',
      registeredById: key === foreign ? other.id : actor.id,
    })),
  });
  await prisma.cartella.createMany({
    data: [
      { patientId: patient, data: { statoRicovero: 'dimesso', note: 'private-clinical' } },
      { patientId: zero, data: { statoRicovero: { invalid: true } } },
    ],
  });
}
export async function clean() {
  await prisma.consegnaCreationReceipt.deleteMany({
    where: { actorId: { in: [actor.id, other.id] } },
  });
  await prisma.consegna.deleteMany({ where: { pazienteId: { startsWith: marker } } });
  await prisma.patient.deleteMany({ where: { id: { startsWith: marker } } });
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@example.test' }, operator: { id: { in: [actor.id, other.id] } } },
  });
  await prisma.$disconnect();
}
export async function httpServer() {
  const app = express();
  app.use(express.json());
  app.use('/consegne', consegneRouter);
  app.use('/ai/voice', voiceRouter);
  app.use('/ai/actions', actionsRouter);
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  return {
    base: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
