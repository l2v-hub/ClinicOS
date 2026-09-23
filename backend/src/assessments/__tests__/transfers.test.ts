import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AID_KEYS, OWNED_AID_KEYS, TRANSFER_MODES } from '../types.js';
import { parseCreate } from '../input.js';
import { parseTransfersAnswers, transfersCompletion, transfersSections } from '../transfers.js';
import { emptyTransfers, completeTransfers, transfersInput } from './transfers-fixture.js';
test('Transfers has no defaults or score and covers all 384 independent transfer choices', () => {
  const empty = emptyTransfers();
  assert.deepEqual(parseTransfersAnswers(empty), empty);
  assert.equal(transfersCompletion(empty).complete, false);
  assert(transfersCompletion(empty).missingPaths.includes('painOnMovement'));
  assert.equal(
    transfersCompletion(empty).missingPaths.filter((p) => p.startsWith('aids.')).length,
    12,
  );
  let combinations = 0;
  for (const bedToWheelchair of TRANSFER_MODES)
    for (const wheelchairToBed of TRANSFER_MODES)
      for (const toilet of TRANSFER_MODES.slice(0, 6)) {
        const a = completeTransfers();
        a.transfers = {
          bedToWheelchair,
          wheelchairToBed,
          toilet: toilet as typeof a.transfers.toilet,
        };
        assert(transfersCompletion(parseTransfersAnswers(a)).complete);
        combinations++;
      }
  assert.equal(combinations, 384);
  assert.equal(
    transfersSections(completeTransfers()).find((s) => s.id === 'aids')!.rows.length,
    12,
  );
  assert(!JSON.stringify(transfersSections(completeTransfers())).includes('score'));
});
test('Transfers preserves explicit no, dependencies and every aid ownership boundary', () => {
  for (const key of OWNED_AID_KEYS)
    for (const ownership of ['personal', 'facility'] as const) {
      const a = completeTransfers();
      a.aids[key] = { selected: true, ownership };
      assert(transfersCompletion(parseTransfersAnswers(a)).complete);
      a.aids[key].ownership = null;
      assert.deepEqual(transfersCompletion(a).missingPaths, [`aids.${key}.ownership`]);
      a.aids[key] = { selected: false, ownership };
      assert.throws(() => parseTransfersAnswers(a));
    }
  for (const key of AID_KEYS.filter((k) => !(OWNED_AID_KEYS as readonly string[]).includes(k))) {
    const a: any = completeTransfers();
    a.aids[key].ownership = 'personal';
    assert.throws(() => parseTransfersAnswers(a));
  }
  for (const side of ['right', 'left'] as const)
    for (const level of ['not_allowed', 'touch_down', 'full'] as const) {
      const a = completeTransfers();
      a.operatedLegLoad = { applicable: true, side, level };
      assert(transfersCompletion(parseTransfersAnswers(a)).complete);
      a.operatedLegLoad.applicable = false;
      assert.throws(() => parseTransfersAnswers(a));
    }
  const a = completeTransfers();
  a.operatedLegLoad = { applicable: true, side: null, level: null };
  assert.deepEqual(transfersCompletion(parseTransfersAnswers(a)).missingPaths, [
    'operatedLegLoad.side',
    'operatedLegLoad.level',
  ]);
  a.painOnMovement = null;
  assert(transfersCompletion(a).missingPaths.includes('painOnMovement'));
});
test('Transfers rejects unknown/coerced options and enforces dates, text and Unicode bounds', () => {
  const mutate: Array<(a: any) => void> = [
    (a) => (a.extra = true),
    (a) => (a.transfers.toilet = 'hoist_one_operator'),
    (a) => (a.painOnMovement = 'false'),
    (a) => delete a.walking,
    (a) => (a.context.admissionDate.value = '2026-02-30'),
    (a) => (a.context.admissionDate.status = 'other'),
    (a) => (a.context.diagnosis.extra = 'x'),
    (a) => (a.notes = 'x'.repeat(4001)),
    (a) => (a.context.diagnosis.text = 'x'.repeat(1001)),
    (a) => (a.notes = 'bad\u0001'),
    (a) => (a.notes = '\ud800'),
    (a) => (a.context.diagnosis.text = '\udfff'),
    (a) => (a.aids.wheelchair.selected = 0),
  ];
  for (const edit of mutate) {
    const a = completeTransfers();
    edit(a);
    assert.throws(() => parseTransfersAnswers(a));
  }
  const a = completeTransfers();
  a.notes = 'é'.repeat(3998) + '\nΩ';
  a.context.diagnosis.text = '𓀀'.repeat(1000);
  assert.deepEqual(parseTransfersAnswers(a), a);
  assert.doesNotThrow(() => parseCreate(transfersInput({ answers: a })));
  a.context.diagnosis = { status: 'unavailable', text: '', unavailableReason: '' };
  assert.deepEqual(transfersCompletion(parseTransfersAnswers(a)).missingPaths, [
    'context.diagnosis.unavailableReason',
  ]);
  a.context.diagnosis.unavailableReason = 'Documento non disponibile';
  a.context.admissionDate = { status: 'unavailable', value: null };
  assert(transfersCompletion(parseTransfersAnswers(a)).complete);
  const body = transfersInput();
  (body as any).author = { name: 'Forged' };
  assert.throws(() => parseCreate(body));
});
test('admission civil date accepts historical years and validates Gregorian leap days', () => {
  for (const value of ['1999-12-31', '1904-02-29', '2000-02-29', '0001-01-01', '2099-12-31']) {
    const a = completeTransfers();
    a.context.admissionDate.value = value;
    assert.equal(parseTransfersAnswers(a).context.admissionDate.value, value);
  }
  for (const value of ['1900-02-29', '2100-02-29', '0000-01-01', '1999-13-01', '2026-02-30']) {
    const a = completeTransfers();
    a.context.admissionDate.value = value;
    assert.throws(() => parseTransfersAnswers(a));
  }
});
