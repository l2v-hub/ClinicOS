import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Camera } from '../../types';
import {
  assignableBeds,
  assignableRooms,
  assignableWards,
  bedDisplayLabel,
  currentPatientPlacement,
  patientPlacementValues,
  isValidBedSelection,
  canSaveStay,
  dischargeBedNotice,
  needsDischargeConfirmation,
  saveStay,
  statoRicoveroLabel,
  stayBedTarget,
  stayCartellaUpdate,
  stayDialogHint,
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

test('placement display prefers the current assigned bed over stale cartella labels', () => {
  const placement = currentPatientPlacement(rooms, 'patient-1');
  assert.deepEqual(patientPlacementValues(placement, { cameraNumero: '99', lettoNumero: 'Z' }), {
    room: '12',
    bed: 'A',
  });
  const customized = { ...placement!, bed: { ...placement!.bed, label: ' 12-B ' } };
  assert.equal(patientPlacementValues(customized, {}).bed, '12-B');
});

test('placement display preserves valid cartella labels when current room data is absent', () => {
  assert.deepEqual(
    patientPlacementValues(undefined, { cameraNumero: ' 204 ', lettoNumero: ' 3 ' }),
    {
      room: '204',
      bed: '3',
    },
  );
  assert.deepEqual(patientPlacementValues(undefined, { cameraNumero: '18', lettoNumero: ' ' }), {
    room: '18',
    bed: undefined,
  });
});

test('empty placement values stay absent rather than becoming blank or saved fallback labels', () => {
  for (const value of [undefined, null, '', '   ']) {
    assert.deepEqual(
      patientPlacementValues(undefined, { cameraNumero: value, lettoNumero: value } as any),
      {
        room: undefined,
        bed: undefined,
      },
    );
  }
});

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

// ── Stato del ricovero e dimissione ───────────────────────────────────────────────────────────

/** Registra le chiamate di `saveStay` nell'ordine in cui avvengono. */
function stayHarness(options: {
  canManageBeds: boolean;
  canSaveChart: boolean;
  bedOk?: boolean;
  chartOk?: boolean;
}) {
  const calls: Array<
    { kind: 'bed'; room?: string; bedId?: string } | { kind: 'chart'; updates: object }
  > = [];
  return {
    calls,
    deps: {
      canManageBeds: options.canManageBeds,
      canSaveChart: options.canSaveChart,
      assignBed: async (room?: string, bedId?: string) => {
        calls.push({ kind: 'bed', room, bedId });
        return { ok: options.bedOk ?? true, lettoLabel: room ? 'B' : undefined };
      },
      saveChart: async (updates: object) => {
        calls.push({ kind: 'chart', updates });
        return options.chartOk ?? true;
      },
    },
  };
}

test('discharge by a role with both permissions closes the bed, then saves statoRicovero dimesso', async () => {
  const { calls, deps } = stayHarness({ canManageBeds: true, canSaveChart: true });
  const saved = await saveStay(
    deps,
    { statoRicovero: 'dimesso', cameraNumero: '12', lettoNumero: 'A', repartoRicovero: 'Medicina' },
    'bed-current',
  );
  assert.equal(saved, true);
  assert.deepEqual(calls, [
    { kind: 'bed', room: undefined, bedId: undefined },
    {
      kind: 'chart',
      updates: {
        statoRicovero: 'dimesso',
        cameraNumero: undefined,
        lettoNumero: undefined,
        repartoRicovero: 'Medicina',
      },
    },
  ]);
});

test('discharge from the Dimissione tab sends statoRicovero dimesso', async () => {
  const { calls, deps } = stayHarness({ canManageBeds: true, canSaveChart: true });
  assert.equal(await saveStay(deps, { statoRicovero: 'dimesso' }, ''), true);
  const chart = calls.find((call) => call.kind === 'chart');
  assert.equal((chart?.updates as { statoRicovero?: string }).statoRicovero, 'dimesso');
});

test('discharge does not change the stay status when the bed cannot be closed', async () => {
  const { calls, deps } = stayHarness({ canManageBeds: true, canSaveChart: true, bedOk: false });
  assert.equal(await saveStay(deps, { statoRicovero: 'dimesso' }, ''), false);
  assert.deepEqual(
    calls.map((call) => call.kind),
    ['bed'],
  );
});

test('a role that cannot manage beds discharges by status only and never touches the bed', async () => {
  const { calls, deps } = stayHarness({ canManageBeds: false, canSaveChart: true });
  const saved = await saveStay(
    deps,
    { statoRicovero: 'dimesso', cameraNumero: '12', lettoNumero: 'A' },
    'bed-current',
  );
  assert.equal(saved, true);
  assert.deepEqual(calls, [{ kind: 'chart', updates: { statoRicovero: 'dimesso' } }]);
});

test('a role that manages beds but cannot edit the chart saves the bed only', async () => {
  const { calls, deps } = stayHarness({ canManageBeds: true, canSaveChart: false });
  assert.equal(await saveStay(deps, { statoRicovero: 'dimesso', cameraNumero: '12' }, 'b'), true);
  assert.deepEqual(calls, [{ kind: 'bed', room: undefined, bedId: undefined }]);
  const none = stayHarness({ canManageBeds: false, canSaveChart: false });
  assert.equal(await saveStay(none.deps, { statoRicovero: 'dimesso' }, ''), false);
  assert.deepEqual(none.calls, []);
});

test('a non-discharge save still assigns the chosen bed before the chart', async () => {
  const { calls, deps } = stayHarness({ canManageBeds: true, canSaveChart: true });
  await saveStay(deps, { statoRicovero: 'ricoverato', cameraNumero: '2' }, 'bed-free');
  assert.deepEqual(calls, [
    { kind: 'bed', room: '2', bedId: 'bed-free' },
    {
      kind: 'chart',
      updates: { statoRicovero: 'ricoverato', cameraNumero: '2', lettoNumero: 'B' },
    },
  ]);
});

test('stay rules: bed target, chart update and save validity', () => {
  assert.deepEqual(stayBedTarget({ statoRicovero: 'dimesso', cameraNumero: '12' }, 'bed'), {
    room: undefined,
    bedId: undefined,
  });
  assert.equal(stayBedTarget({ statoRicovero: 'dimesso' }, 'bed', false), null);
  assert.deepEqual(stayCartellaUpdate({ cameraNumero: '12' }, 'A', false), {});
  // «Dimesso» si salva senza camera e letto; gli altri stati richiedono il letto esatto.
  assert.equal(canSaveStay(rooms, 'patient-1', { statoRicovero: 'dimesso' }), true);
  assert.equal(canSaveStay(rooms, 'patient-1', { statoRicovero: 'ricoverato' }), false);
  assert.equal(
    canSaveStay(
      rooms,
      'patient-1',
      { statoRicovero: 'ricoverato', cameraNumero: '12' },
      'bed-current',
    ),
    true,
  );
  assert.equal(
    canSaveStay(rooms, 'patient-1', { statoRicovero: 'ambulatoriale' }, undefined, false),
    true,
  );
});

test('discharge confirmation is required only when the status becomes dimesso', () => {
  assert.equal(needsDischargeConfirmation('ricoverato', 'dimesso'), true);
  assert.equal(needsDischargeConfirmation(undefined, 'dimesso'), true);
  assert.equal(needsDischargeConfirmation('dimesso', 'dimesso'), false);
  assert.equal(needsDischargeConfirmation('dimesso', 'ricoverato'), false);
  assert.equal(needsDischargeConfirmation('ricoverato', 'day_hospital'), false);
});

test('stay labels and notices say what really happens to the bed', () => {
  assert.equal(statoRicoveroLabel('day_hospital'), 'Day Hospital');
  assert.equal(statoRicoveroLabel(undefined), 'Non indicato');
  assert.equal(statoRicoveroLabel('toString'), 'Non indicato');
  const bed = { placementKnown: true, room: '102', bed: 'A' };
  assert.match(dischargeBedNotice({ canManageBeds: true, ...bed }), /camera 102, letto A.*chiusa/);
  assert.match(dischargeBedNotice({ canManageBeds: false, ...bed }), /resta assegnato/);
  assert.equal(dischargeBedNotice({ canManageBeds: true, placementKnown: true }), '');
  assert.equal(dischargeBedNotice({ canManageBeds: false, placementKnown: true }), '');
  // Disponibilità delle camere non letta: chi non gestisce i letti viene comunque avvisato.
  assert.match(
    dischargeBedNotice({ canManageBeds: false, placementKnown: false }),
    /eventuale posto letto resta assegnato/,
  );
  assert.match(dischargeBedNotice({ canManageBeds: true, placementKnown: false }), /eventuale/);
  assert.match(
    stayDialogHint({ canManageBeds: false, canSaveChart: true, discharging: true }),
    /non gestisce i posti letto/,
  );
  assert.match(
    stayDialogHint({ canManageBeds: true, canSaveChart: false, discharging: true }),
    /viene chiusa/,
  );
  assert.equal(stayDialogHint({ canManageBeds: true, canSaveChart: true, discharging: false }), '');
  assert.match(
    stayDialogHint({ canManageBeds: true, canSaveChart: false, discharging: true, hasBed: false }),
    /nulla da chiudere/,
  );
});
