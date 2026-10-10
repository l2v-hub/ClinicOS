import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeSkill, type SkillInvoke } from '../executors.js';
import type { WorkflowState } from '../types.js';

const now = new Date('2033-04-05T07:00:00Z');
const administration = {
  therapyId: 'synthetic-therapy',
  fascia: 'mattina',
  date: '2033-04-05',
  drugName: 'Synthetic medicine',
  dosage: '2 compressa',
  route: 'orale',
  scheduledTime: '10:00',
};
const state: WorkflowState = {
  id: 'synthetic-workflow',
  operatorId: 'synthetic-nurse',
  roleId: 'nurse',
  skillId: 'administration.record',
  status: 'EXECUTING',
  slots: { patient: { id: 'synthetic-patient', label: 'Synthetic patient' }, administration },
  pending: null,
  candidates: [],
  preview: null,
  writeRequestId: null,
  result: null,
  error: null,
  interpreter: 'deterministic',
  contextPatientId: 'synthetic-patient',
  version: 1,
  turns: 1,
  history: [],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  expiresAt: '2033-04-05T08:00:00Z',
};

test('assistant confirms the selected later dose rather than the first same-band prescription', async () => {
  const writes: unknown[] = [];
  const invoke: SkillInvoke = async (tool, input, options) => {
    if (tool === 'administration.list_slots')
      return {
        ok: true,
        data: [
          {
            fascia: 'mattina',
            patients: [
              {
                patientId: 'synthetic-patient',
                administrations: [
                  {
                    ...administration,
                    scheduledTime: '08:00',
                    dosage: '1 compressa',
                    status: 'pending',
                  },
                  { ...administration, status: 'pending' },
                ],
              },
            ],
          },
        ],
      };
    assert.equal(tool, 'administration.confirm');
    assert.equal(options?.confirmed, true);
    writes.push(input);
    return { ok: true, data: { id: 'synthetic-second-dose' } };
  };
  const result = await executeSkill(state, invoke, new Set(), now);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(writes, [
    {
      body: {
        patientId: 'synthetic-patient',
        therapyId: administration.therapyId,
        date: administration.date,
        fascia: 'mattina',
        scheduledTime: '10:00',
      },
    },
  ]);
});

test('another pending dose cannot substitute a removed selected hour, even with identical drug and quantity', async () => {
  let writes = 0;
  const invoke: SkillInvoke = async (tool) => {
    if (tool === 'administration.list_slots')
      return {
        ok: true,
        data: [
          {
            fascia: 'mattina',
            patients: [
              {
                patientId: 'synthetic-patient',
                administrations: [{ ...administration, scheduledTime: '08:00', status: 'pending' }],
              },
            ],
          },
        ],
      };
    writes++;
    return { ok: true, data: { id: 'unexpected' } };
  };
  const result = await executeSkill(state, invoke, new Set(), now);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.domainCode, 'preview_stale');
  assert.equal(writes, 0);
});
