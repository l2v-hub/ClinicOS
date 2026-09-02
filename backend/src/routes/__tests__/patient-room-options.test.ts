import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { toPatientRoomOptions } from '../patient-room-option-model.js';

test('patient room options reveal availability without another occupant identity', () => {
  const result = toPatientRoomOptions(
    [
      {
        id: 'room-1',
        numero: '101',
        tipo: 'doppia',
        piano: '1',
        reparto: 'Medicina',
        stato: 'attiva',
        beds: [
          {
            id: 'bed-current',
            label: 'A',
            stato: 'libero',
            assignments: [{ patientId: 'patient-current' }],
          },
          {
            id: 'bed-other',
            label: 'B',
            stato: 'libero',
            assignments: [{ patientId: 'patient-secret' }],
          },
        ],
      },
    ],
    'patient-current',
  );

  assert.equal(result[0].beds[0].availability, 'current');
  assert.equal(result[0].beds[1].availability, 'occupied');
  assert.doesNotMatch(JSON.stringify(result), /patient-secret|patient-current/);
});

test('patient room options route is authenticated, scoped and no-store', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../patient-room-options.ts', import.meta.url)),
    'utf8',
  );
  assert.match(source, /router\.use\(requireOperator\)/);
  assert.match(source, /room-options', requirePatientScope/);
  assert.match(source, /Cache-Control', 'private, no-store'/);
  assert.match(source, /where: \{ stato: 'attiva' \}/);
  assert.doesNotMatch(source, /firstName: true|lastName: true/);
});
