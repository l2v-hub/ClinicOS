import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AID_KEYS,
  emptyTransfersAnswers,
  transfersCompletion,
  assertTransfersAnswers,
  transfersSnapshotSections,
  TRANSFER_OPTIONS,
} from '../assessments/transfersDefinition';
import {
  OWNED_AID_KEYS,
  PLAIN_AID_KEYS,
  type TransfersAnswers,
} from '../assessments/transfersTypes';
import { assertAssessment, assessmentPage } from '../assessments/assessmentValidation';
import { completeTransfers, transfersAssessment } from './transfers.fixtures';

test('new transfers form contains only explicitly unresolved choices; No completes a verified field', () => {
  const a = emptyTransfersAnswers();
  assertTransfersAnswers(a);
  assert.equal(transfersCompletion(a).complete, false);
  assert.equal(AID_KEYS.length, 12);
  assert.ok(AID_KEYS.every((key) => a.aids[key].selected === null));
  assert.equal(a.painOnMovement, null);
  assert.equal(transfersCompletion(completeTransfers()).complete, true);
  const complete = completeTransfers();
  complete.painOnMovement = null;
  assert.ok(transfersCompletion(complete).missingPaths.includes('painOnMovement'));
  complete.painOnMovement = false;
  assert.equal(transfersCompletion(complete).complete, true);
});

test('all 8x8x6 transfer combinations are independent and complete without a score', () => {
  let combinations = 0;
  for (const [outbound] of TRANSFER_OPTIONS)
    for (const [inbound] of TRANSFER_OPTIONS)
      for (const [toilet] of TRANSFER_OPTIONS.slice(0, 6)) {
        const a = completeTransfers();
        a.transfers = {
          bedToWheelchair: outbound,
          wheelchairToBed: inbound,
          toilet: toilet as TransfersAnswers['transfers']['toilet'],
        };
        assertTransfersAnswers(a);
        assert.equal(transfersCompletion(a).complete, true);
        const row = transfersAssessment({ answers: a });
        assert.equal(row.result, null);
        assertAssessment(row, 'patient-a');
        combinations++;
      }
  assert.equal(combinations, 384);
  for (const mode of ['hoist_one_operator', 'hoist_two_operators']) {
    const a = completeTransfers();
    Object.assign(a.transfers, { toilet: mode });
    assert.throws(() => assertTransfersAnswers(a));
  }
});

test('nine owned aids require property only when present; three plain aids reject property', () => {
  for (const key of OWNED_AID_KEYS) {
    const a = completeTransfers();
    a.aids[key].selected = true;
    assert.ok(transfersCompletion(a).missingPaths.includes(`aids.${key}.ownership`));
    for (const ownership of ['personal', 'facility'] as const) {
      a.aids[key].ownership = ownership;
      assertTransfersAnswers(a);
      assert.equal(transfersCompletion(a).complete, true);
    }
    a.aids[key].selected = false;
    assert.throws(() => assertTransfersAnswers(a));
  }
  for (const key of PLAIN_AID_KEYS) {
    const a = completeTransfers();
    Object.assign(a.aids[key], { ownership: 'facility' });
    assert.throws(() => assertTransfersAnswers(a));
  }
});

test('load, context and unknown field dependencies are validated without assuming unavailable means absent', () => {
  const a = completeTransfers();
  a.operatedLegLoad = { applicable: true, side: null, level: null };
  assertTransfersAnswers(a);
  assert.equal(transfersCompletion(a).complete, false);
  for (const side of ['right', 'left'] as const)
    for (const level of ['not_allowed', 'touch_down', 'full'] as const) {
      a.operatedLegLoad = { applicable: true, side, level };
      assert.equal(transfersCompletion(a).complete, true);
    }
  a.operatedLegLoad.applicable = false;
  assert.throws(() => assertTransfersAnswers(a));
  for (const mutate of [
    (a: TransfersAnswers) => {
      a.context.admissionDate.value = '2026-02-30';
    },
    (a: TransfersAnswers) => {
      a.context.admissionDate.status = 'unavailable';
    },
    (a: TransfersAnswers) => {
      a.context.diagnosis.status = 'unavailable';
    },
    (a: TransfersAnswers) => {
      Object.assign(a.transfers, { extra: 'independent' });
    },
    (a: TransfersAnswers) => {
      Object.assign(a, { score: 5 });
    },
  ]) {
    const value = completeTransfers();
    mutate(value);
    assert.throws(() => assertTransfersAnswers(value));
  }
  const unavailable = completeTransfers();
  unavailable.context = {
    admissionDate: { status: 'unavailable', value: null },
    diagnosis: { status: 'unavailable', text: '', unavailableReason: '' },
  };
  assertTransfersAnswers(unavailable);
  assert.equal(transfersCompletion(unavailable).complete, false);
  unavailable.context.diagnosis.unavailableReason = 'Motivo sintetico';
  assert.equal(transfersCompletion(unavailable).complete, true);
});

test('text preserves whitespace/newlines and bounds Unicode by code point', () => {
  const a = completeTransfers();
  a.notes = '😀'.repeat(4000);
  a.context.diagnosis.text = '😀'.repeat(1000);
  assertTransfersAnswers(a);
  a.notes += 'x';
  assert.throws(() => assertTransfersAnswers(a));
  const original = completeTransfers();
  assert.ok(
    transfersSnapshotSections(original)
      .flatMap((section) => section.rows)
      .some((row) => row.value === original.notes),
  );
});

test('transfer DTO validates server completion and immutable sections without accepting scores or another type', () => {
  const final = transfersAssessment({ status: 'final' });
  assertAssessment(final, 'patient-a', 'transfers-a', 'postural_transfers');
  assert.equal(final.result, null);
  const page = { items: [final], pageInfo: { loadedCount: 1, hasMore: false, nextCursor: null } };
  assessmentPage(page, 'patient-a', 'postural_transfers');
  assert.throws(() => assessmentPage(page, 'patient-a', 'painad'));
  for (const mutate of [
    (r: typeof final) => {
      r.patientId = 'patient-b';
    },
    (r: typeof final) => {
      r.completion = { complete: false, missingPaths: [] };
    },
    (r: typeof final) => {
      Object.assign(r, { result: { total: 0, band: 'none', label: 'Nessun dolore rilevato' } });
    },
    (r: typeof final) => {
      r.finalSnapshot!.sections[0].rows[0].value = 'Data sostituita';
    },
    (r: typeof final) => {
      r.finalSnapshot!.sections[3].rows.pop();
    },
    (r: typeof final) => {
      r.finalSnapshot!.signatureLabels = ['Altra firma', 'Firma Operatori'];
    },
    (r: typeof final) => {
      r.snapshotSha256 = 'not-hash';
    },
  ]) {
    const row = transfersAssessment({ status: 'final' });
    mutate(row);
    assert.throws(() => assertAssessment(row, 'patient-a'));
  }
});
