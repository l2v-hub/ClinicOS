import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Camera } from '../../types';
import {
  assignableBeds,
  assignableRooms,
  assignableWards,
  bedDisplayLabel,
  currentPatientPlacement,
  isValidBedSelection,
} from '../roomAssignmentModel';

const rooms: Camera[] = [
  {
    id: 'room-2',
    numero: '12',
    tipo: 'doppia',
    piano: '1',
    reparto: 'Chirurgia',
    stato: 'attiva',
    note: '',
    letti: [
      { id: 'bed-current', numero: 1, label: 'A', stato: 'occupato', pazienteId: 'patient-1' },
      { id: 'bed-other', numero: 2, label: 'B', stato: 'occupato', pazienteId: 'patient-2' },
    ],
  },
  {
    id: 'room-1',
    numero: '2',
    tipo: 'singola',
    piano: '0',
    reparto: 'Medicina',
    stato: 'attiva',
    note: '',
    letti: [{ id: 'bed-free', numero: 1, label: '12', stato: 'libero' }],
  },
  {
    id: 'room-maintenance',
    numero: '99',
    tipo: 'singola',
    piano: '2',
    reparto: 'Medicina',
    stato: 'inattiva',
    note: '',
    letti: [{ id: 'bed-hidden', numero: 1, label: 'A', stato: 'libero' }],
  },
];

test('dependent room choices expose only active rooms with a usable bed', () => {
  assert.deepEqual(assignableWards(rooms, 'patient-1'), ['Chirurgia', 'Medicina']);
  assert.deepEqual(
    assignableRooms(rooms, 'patient-1', 'Chirurgia').map((room) => room.id),
    ['room-2'],
  );
  assert.deepEqual(
    assignableBeds(rooms[0], 'patient-1').map((bed) => bed.id),
    ['bed-current'],
  );
});

test('bed labels and current placement preserve backend identity', () => {
  assert.equal(bedDisplayLabel(rooms[1].letti[0]), '12');
  assert.deepEqual(currentPatientPlacement(rooms, 'patient-1'), {
    room: rooms[0],
    bed: rooms[0].letti[0],
  });
});

test('save validity requires the exact selected bed in the selected room', () => {
  assert.equal(isValidBedSelection(rooms, 'patient-1', '12', 'bed-current'), true);
  assert.equal(isValidBedSelection(rooms, 'patient-1', '12', 'bed-other'), false);
  assert.equal(isValidBedSelection(rooms, 'patient-1', '2', 'bed-current'), false);
  assert.equal(isValidBedSelection(rooms, 'patient-1', undefined, undefined), true);
});
