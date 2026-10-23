import test from 'node:test';
import assert from 'node:assert/strict';
import { therapyDrugReferences } from '../useAnomalieReparto';
import { parseTherapySlots } from '../../../../lib/therapySlotPage';

test('catalog lookup includes read-only verification drug references once per patient with null dose', () => {
  const groups = parseTherapySlots([
    {
      kind: 'verification',
      id: 'therapy-verification',
      label: 'Da verificare',
      date: '2030-01-01',
      fascia: null,
      ora: null,
      summary: { total: 2, verification: 2 },
      patients: [
        {
          patientId: 'p1',
          firstName: 'Ada',
          lastName: 'Synthetic',
          items: ['t1', 't2'].map((therapyId) => ({
            therapyId,
            drugName: 'Synthetic catalog drug',
            dosage: null,
            quantityLabel: null,
            scheduledTime: null,
            status: 'to_verify',
            reason: 'missing_time',
            canAdminister: false,
          })),
        },
      ],
    },
  ]);
  const result = therapyDrugReferences(groups);
  assert.deepEqual(result.righe, [{ farmacoNome: 'Synthetic catalog drug', dosaggio: null }]);
  assert.deepEqual(result.perPaziente.get('p1'), result.righe);
  assert.equal(result.therapyIds.get('p1|Synthetic catalog drug'), 't1');
  assert.equal('fascia' in result.righe[0], false);
  assert.equal('scheduledTime' in result.righe[0], false);
});
