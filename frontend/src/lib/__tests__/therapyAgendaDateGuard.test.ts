import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const operatorAgenda = readFileSync(
  new URL('../../components/operator/OperatorAgenda.tsx', import.meta.url),
  'utf8',
);
const adminAgenda = readFileSync(
  new URL('../../components/admin/AdminAgenda.tsx', import.meta.url),
  'utf8',
);
const modal = readFileSync(
  new URL('../../components/operator/TherapySlotModal.tsx', import.meta.url),
  'utf8',
);

test('weekly and monthly views never repeat one-day therapy data across calendar cells', () => {
  assert.doesNotMatch(operatorAgenda, /TherapySlotDot/);
  assert.doesNotMatch(adminAgenda, /TherapySlotDot/);
  assert.match(operatorAgenda, /Le terapie sono disponibili nella vista Giorno/);
  assert.match(adminAgenda, /Le terapie sono disponibili nella vista Giorno/);
});

test('opening a calendar day loads that exact therapy date and carries it into mutations', () => {
  for (const agenda of [operatorAgenda, adminAgenda]) {
    assert.match(agenda, /function openDay\(date: Date\)/);
    assert.match(agenda, /onLoadTherapySlots\?\.\(isoDate\(date\)\)/);
    assert.match(agenda, /date=\{isoDate\(refDate\)\}/);
  }
  assert.match(modal, /date,\s*fascia: slot\.fascia/);
});

test('changing the agenda date or view closes any therapy modal before its date can change', () => {
  for (const [agenda, activeSlotName] of [
    [operatorAgenda, 'activeSlot'],
    [adminAgenda, 'activeTherapySlot'],
  ] as const) {
    for (const transition of ['navigate', 'changeView', 'openDay', 'goToday']) {
      assert.match(
        agenda,
        new RegExp(
          `function ${transition}\\([^)]*\\) \\{[\\s\\S]{0,80}?setSelectedTherapySlotId\\(null\\)`,
        ),
      );
    }
    assert.match(agenda, new RegExp(`view === 'giornaliero' && ${activeSlotName}`));
  }
});
