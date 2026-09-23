import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { facilityToday } from '../../patients/parameter-reading-input.js';

export const marker = `roster-${Date.now()}`;
export const id = (key: string) => `${marker}-${key}`;
export const today = facilityToday();
export const actor = { id: id('owner'), role: 'operatore' };
export const other = { id: id('other'), role: 'operatore' };
export const caseActor = { id: id('case'), role: 'operatore' };
export const noDepartment = { id: id('none'), role: 'operatore' };
export const missing = { id: id('missing'), role: 'operatore' };
export const manager = { id: actor.id, role: 'manager' };
const labels = ['1A', '1B', '2A', '2B', '10A', '01A'];
export const rows = Array.from({ length: 84 }, (_, index) => ({
  id: id(`patient-${String(index).padStart(3, '0')}`),
  firstName: index % 2 ? 'Anna' : 'Élia',
  lastName: ['ROSSI', 'Álba', 'bianchi', 'Zanni'][index % 4],
  room: index % 8 < 6 ? id(labels[index % 8]) : null,
  bed: index % 8 < 6 ? (index % 2 ? 'B' : 'A') : null,
}));

export async function seedRoster() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, '127.0.0.1', 'synthetic loopback only');
  for (const [key, department] of [
    ['owner', id('Ward')],
    ['other', id('Ward')],
    ['case', id('ward')],
    ['none', null],
  ] as const) {
    await prisma.user.create({
      data: {
        id: id(`${key}-user`),
        email: `${id(key)}@example.test`,
        passwordHash: 'synthetic-only',
        fullName: key,
        operator: { create: { id: id(key), department } },
      },
    });
  }
  await prisma.patient.createMany({
    data: [
      ...rows.map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        medicalRecordNumber: `${row.id}-MRN`,
        registeredById: actor.id,
        sex: 'F',
      })),
      {
        id: id('foreign'),
        firstName: 'External',
        lastName: 'Hidden',
        medicalRecordNumber: id('foreign-MRN'),
        registeredById: other.id,
        sex: 'M',
      },
    ],
  });
  for (const label of labels) {
    await prisma.room.create({
      data: {
        id: id(`room-${label}`),
        numero: id(label),
        beds: { create: ['A', 'B'].map((bed) => ({ id: id(`bed-${label}-${bed}`), label: bed })) },
      },
    });
  }
  await prisma.patientRoomAssignment.createMany({
    data: rows.flatMap((row, index) =>
      row.room
        ? [
            {
              id: id(`assignment-${index}`),
              patientId: row.id,
              roomId: id(`room-${labels[index % 8]}`),
              bedId: id(`bed-${labels[index % 8]}-${row.bed}`),
              startDate: '2020-01-01',
            },
          ]
        : [],
    ),
  });
  await prisma.cartella.createMany({
    data: rows.map((row) => ({
      patientId: row.id,
      data: {
        cameraNumero: row.room ? 'STALE-999' : null,
        lettoNumero: null,
        note: 'private-clinical-fixture',
      },
    })),
  });
  await prisma.patientTherapy.createMany({
    data: [
      ...rows.flatMap((row) =>
        [0, 1].map((index) => ({
          id: `${row.id}-therapy-${index}`,
          patientId: row.id,
          farmacoNome: 'Synthetic medicine',
          dosaggio: '1',
          dataInizio: '2020-01-01',
          fasceMattina: true,
        })),
      ),
      {
        id: id('foreign-therapy'),
        patientId: id('foreign'),
        farmacoNome: 'Hidden medicine',
        dosaggio: '1',
        dataInizio: '2020-01-01',
        fasceMattina: true,
      },
    ],
  });
}

export async function cleanRoster() {
  await prisma.patient.deleteMany({ where: { id: { startsWith: marker } } });
  await prisma.room.deleteMany({ where: { id: { startsWith: marker } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: marker } } });
  await prisma.rosterContext.deleteMany({
    where: { departmentKey: { startsWith: `department:${marker}` } },
  });
  await prisma.$disconnect();
}

const fold = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function natural(a: string, b: string) {
  const left = fold(a).match(/[0-9]+|[^0-9]+/g) ?? [];
  const right = fold(b).match(/[0-9]+|[^0-9]+/g) ?? [];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const x = left[i],
      y = right[i];
    const nx = /^[0-9]+$/.test(x),
      ny = /^[0-9]+$/.test(y);
    const value =
      nx && ny
        ? BigInt(x) < BigInt(y)
          ? -1
          : BigInt(x) > BigInt(y)
            ? 1
            : 0
        : nx !== ny
          ? nx
            ? -1
            : 1
          : cmp(x, y);
    if (value) return value;
  }
  return left.length - right.length;
}
export function expectedIds(criterion: 'name' | 'location', direction: 'asc' | 'desc') {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows]
    .sort((a, b) => {
      if (criterion === 'location') {
        const roomMissing = Number(a.room === null) - Number(b.room === null);
        if (roomMissing) return roomMissing;
        const room = natural(a.room ?? '', b.room ?? '') * sign;
        if (room) return room;
        const bedMissing = Number(a.bed === null) - Number(b.bed === null);
        if (bedMissing) return bedMissing;
        const bed = natural(a.bed ?? '', b.bed ?? '') * sign;
        if (bed) return bed;
      }
      const names =
        cmp(fold(a.lastName), fold(b.lastName)) || cmp(fold(a.firstName), fold(b.firstName));
      return names * (criterion === 'name' ? sign : 1) || cmp(a.id, b.id);
    })
    .map((row) => row.id);
}
