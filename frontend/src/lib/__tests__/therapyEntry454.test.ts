import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCurrentGiroTime, type GiroTime } from '../therapyGiro';
const time = (ora: string, pending: number): GiroTime => ({
  ora,
  pending,
  total: 1,
  patients: [],
  administered: pending ? 0 : 1,
  notAdministered: 0,
});
test('nurse entry selects pending current hour then first pending rather than completed slot', () => {
  const times = [time('08:00', 1), time('12:00', 1), time('20:00', 1)];
  assert.equal(initialCurrentGiroTime(times, '12:35'), '12:00');
  assert.equal(initialCurrentGiroTime(times, '10:00'), '08:00');
  assert.equal(initialCurrentGiroTime([time('12:00', 0), time('20:00', 1)], '12:35'), '20:00');
  assert.equal(initialCurrentGiroTime([], '00:00'), null);
});

test('current clinical band wins over an older pending night dose and preserves exact hour', () => {
  const night = time('02:00', 1),
    morning = time('08:00', 1),
    ten = time('10:00', 1);
  morning.patients = [
    { items: [{ fascia: 'mattina', a: { status: 'pending' } }] },
  ] as GiroTime['patients'];
  ten.patients = [
    { items: [{ fascia: 'mattina', a: { status: 'pending' } }] },
  ] as GiroTime['patients'];
  assert.equal(initialCurrentGiroTime([night, morning, ten], '09:45'), '08:00');
  assert.equal(initialCurrentGiroTime([night, morning, ten], '10:10'), '10:00');
  assert.equal(initialCurrentGiroTime([night, morning, ten], 'invalid'), '02:00');
});


// Render the actual entry component so a correct clock helper with incorrect page wiring fails.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TherapyRoundsPage } from '../../components/operator/TherapyRoundsPage';
import { setCurrentOperator, getCurrentOperator } from '../operatorSession';

Object.assign(globalThis, { React });
const emptyProps = {
  slots: [], loading: false, error: null,
  pageInfo: { hasMore: false, nextCursor: null, loadedTherapies: 0, completeness: 'complete' as const },
  loadingMore: false, loadMoreError: null,
  onLoad: () => {}, onLoadMore: () => {}, onConfirm: () => {}, onNotAdministered: () => {},
};

test('fresh actual Giro entry renders the facility day across device zones and calendar boundaries', (t) => {
  const previousZone = process.env.TZ;
  const previousOperator = getCurrentOperator();
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-18T22:30:00Z') });
  try {
    setCurrentOperator({ id: 'synthetic-nurse', role: 'operatore' });
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      for (const [instant, day] of [
        ['2026-10-18T22:30:00Z', '2026-10-19'],
        ['2026-12-31T23:30:00Z', '2027-01-01'],
        ['2026-06-30T22:15:00Z', '2026-07-01'],
        ['2026-03-29T01:30:00Z', '2026-03-29'],
        ['2026-10-25T01:30:00Z', '2026-10-25'],
      ]) {
        t.mock.timers.setTime(new Date(instant).getTime());
        const html = renderToStaticMarkup(React.createElement(TherapyRoundsPage, emptyProps));
        assert.match(html, /Giro terapia/);
        assert.ok(html.includes(`value="${day}"`), `${zone}: actual entry must show ${day}`);
      }
    }
  } finally {
    setCurrentOperator(previousOperator);
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
    t.mock.timers.reset();
  }
});

test('loaded days, explicit deep links and restored calendar dates keep their precedence', () => {
  const render = (patch: Partial<React.ComponentProps<typeof TherapyRoundsPage>>) =>
    renderToStaticMarkup(React.createElement(TherapyRoundsPage, { ...emptyProps, ...patch }));
  assert.ok(render({ date: '2026-02-10', entry: { requestId: 1 } }).includes('value="2026-02-10"'));
  assert.ok(render({ date: '2026-02-10', entry: { requestId: 2, date: '2026-02-11' } }).includes('value="2026-02-11"'));
  assert.ok(render({
    date: '2026-02-10', entry: { requestId: 3, date: '2026-02-11' },
    calendarState: { mode: 'giro', date: '2026-02-12', weekOf: '2026-02-09', open: null, scrollTop: 82 },
  }).includes('value="2026-02-12"'));
});

test('actual therapy entry defaults to the facility calendar day when no date source is supplied', (t) => {
  const previousZone = process.env.TZ;
  const previousOperator = getCurrentOperator();
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-18T22:30:00Z') });
  try {
    setCurrentOperator({ id: 'synthetic-nurse-default', role: 'operatore' });
    process.env.TZ = 'UTC';
    const html = renderToStaticMarkup(React.createElement(TherapyRoundsPage, emptyProps));
    assert.match(html, /value="2026-10-19"/);
  } finally {
    setCurrentOperator(previousOperator);
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
    t.mock.timers.reset();
  }
});
