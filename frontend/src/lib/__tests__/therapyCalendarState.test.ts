import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { parseTherapyCalendarState, rememberTherapyCalendarState } from '../therapyCalendarState';
import { therapyLanding } from '../therapyView';
const original = (globalThis as { window?: unknown }).window;
afterEach(() => {
  (globalThis as { window?: unknown }).window = original;
});
const snapshot = {
  mode: 'calendario' as const,
  date: '2026-10-04',
  weekOf: '2026-09-28',
  open: { date: '2026-10-03', time: '08:30' },
  scrollTop: 350,
};
test('Back calendar snapshot preserves minute precision, week, dialog and scroll', () => {
  assert.deepEqual(parseTherapyCalendarState(snapshot), snapshot);
  assert.equal(parseTherapyCalendarState({ ...snapshot, date: '2026-02-30' }), undefined);
  assert.equal(
    parseTherapyCalendarState({ ...snapshot, open: { date: '2026-10-03', time: '24:00' } }),
    undefined,
  );
  assert.equal(parseTherapyCalendarState({ ...snapshot, mode: 'untrusted' }), undefined);
  assert.equal(parseTherapyCalendarState({ ...snapshot, scrollTop: Infinity })?.scrollTop, 0);
  const patientSnapshot = { ...snapshot, open: { ...snapshot.open, patientId: 'patient-test' } };
  assert.deepEqual(parseTherapyCalendarState(patientSnapshot), patientSnapshot);
  for (const patientId of ['', 12, {}, 'x'.repeat(129)]) {
    assert.equal(
      parseTherapyCalendarState({ ...snapshot, open: { ...snapshot.open, patientId } }),
      undefined,
    );
  }
});
test('calendar remembers this ward history entry without names or changing patient entry', () => {
  const calls: unknown[] = [];
  const fakeWindow = {
    location: { hash: '#/terapie' },
    history: {
      state: { navKey: 'terapie', prevLabel: 'Turno' },
      replaceState(state: unknown) {
        calls.push(state);
      },
    },
  };
  (globalThis as { window?: unknown }).window = fakeWindow;
  rememberTherapyCalendarState(snapshot);
  assert.deepEqual(calls, [{ navKey: 'terapie', prevLabel: 'Turno', therapyCalendar: snapshot }]);
  fakeWindow.location.hash = '#/dettaglio-paziente/p1/terapia-farmacologica';
  rememberTherapyCalendarState(snapshot);
  assert.equal(calls.length, 1);
  fakeWindow.location.hash = '#/terapie';
  fakeWindow.history.state = {} as typeof fakeWindow.history.state;
  rememberTherapyCalendarState(snapshot);
  assert.deepEqual(calls[1], { navKey: 'terapie', therapyCalendar: snapshot });
});
test('active prescription links have their own tab, dose links keep calendar', () => {
  assert.equal(therapyLanding('programmazione', { hasDrug: true }).view, 'attivi');
  assert.equal(therapyLanding(undefined, { hasDrug: true }).view, 'attivi');
  assert.equal(therapyLanding('calendario', { hasDrug: true }).view, 'calendario');
});
