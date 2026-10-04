import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQuantity } from '../../components/operator/cartella/therapyDose';
import { emptyTherapyForm } from '../../components/operator/cartella/TherapyFormFields';
import { therapyFormIssues } from '../../components/operator/cartella/therapySaveFeedback';
import { facilityLocalDate } from '../facilityTime';
import { isConsegnaFeedResponse } from '../consegneFeed';
import { parseHandoverOverview } from '../handoverOverviewResponse';
import { navStateFromHash, routeMatchesShell } from '../navHistory';

test('quantity parser rejects exponent/hex/zero/unsafe values rather than changing their dose', () => {
  for (const text of ['1e-7', '0x10', '1/0', '0/2', '0', 'abc', '', '9007199254740992', '1/9007199254740992'])
    assert.equal(parseQuantity(text), null, text);
  assert.deepEqual(parseQuantity('0.0000001'), { num: 1, den: 10000000 });
  assert.deepEqual(parseQuantity('0,5'), { num: 1, den: 2 });
  assert.deepEqual(parseQuantity('2 / 6'), { num: 1, den: 3 });
});

test('invalid draft model blocks save; correcting the quantity removes that issue', () => {
  const value = { ...emptyTherapyForm(), farmacoNome: 'Farmaco sintetico', prescrittore: 'Medico Test',
    commercialStrengthValue: '10', schedules: [{ time: '08:00', quantityNumerator: 0,
      quantityDenominator: 1, administrationUnit: 'compressa' }] };
  assert.ok(therapyFormIssues(value).some(issue => issue.field === 'quantity'));
  value.schedules[0].quantityNumerator = 1;
  assert.ok(!therapyFormIssues(value).some(issue => issue.field === 'quantity'));
});

test('therapy dates follow Rome midnight and DST rather than UTC or device zone', () => {
  assert.equal(facilityLocalDate(new Date('2026-10-03T22:30:00Z')), '2026-10-04');
  assert.equal(facilityLocalDate(new Date('2026-01-03T23:30:00Z')), '2026-01-04');
  assert.equal(facilityLocalDate(new Date('2026-03-28T23:30:00Z')), '2026-03-29');
  assert.throws(() => facilityLocalDate(new Date('invalid')));
});

const row = { id: 'handover-test', pazienteId: 'patient-test', pazienteNome: 'Paziente Test',
  priorita: 'urgente', stato: 'aperta', tipo: 'Monitoraggio', note: 'Nota sintetica',
  scadenza: '2026-10-04', operatoreAssegnato: '', creatoDA: 'Operatore Test',
  createdAt: '2026-10-04T00:00:00Z' };
const feed = () => ({ items: [row], summary: { total: 20, urgentActive: 12, urgentTaken: 2 },
  pageInfo: { hasMore: true, nextCursor: 'test-cursor' } });

test('handover boundary rejects malformed records, false aggregate counts and cursor states', () => {
  assert.equal(isConsegnaFeedResponse(feed()), true);
  for (const items of [[null], [{ ...row, oraScadenza: {} }], [{ ...row, note: {} }],
    [{ ...row, urgency: { state: 'taken', takenBy: 'fake' } }]])
    assert.equal(isConsegnaFeedResponse({ ...feed(), items }), false);
  for (const summary of [{ total: -1, urgentActive: 0, urgentTaken: 0 },
    { total: 20, urgentActive: NaN, urgentTaken: 0 }, { total: 20, urgentActive: 12 },
    { total: 20, urgentActive: 12, urgentTaken: 10 }])
    assert.equal(isConsegnaFeedResponse({ ...feed(), summary }), false);
  assert.equal(isConsegnaFeedResponse({ ...feed(), pageInfo: { hasMore: true, nextCursor: '' } }), false);
  assert.equal(isConsegnaFeedResponse({ ...feed(), pageInfo: { hasMore: false, nextCursor: 'stale' } }), false);
  assert.throws(() => parseHandoverOverview({ scope: 'operator', summary: { total: 1, urgentActive: 2, urgentTaken: 0 },
    recentPreview: [row], urgentPreview: [row], byOperator: {} }));
});

test('hash-only routes restore ordinary pages and full patient targets without guessed routes', () => {
  const labels = { consegne: 'Consegne', pazienti: 'Pazienti' };
  assert.deepEqual(navStateFromHash('#/consegne', labels), { navKey: 'consegne' });
  assert.equal(navStateFromHash('#/unknown', labels), null);
  assert.equal(navStateFromHash('#/__proto__', labels), null);
  assert.deepEqual(navStateFromHash('#/dettaglio-paziente/test/terapia-farmacologica?sv=programmazione&t=t1&d=2026-10-04', labels), {
    navKey: 'dettaglio-paziente', pazienteId: 'test', patientTab: 'terapia-farmacologica',
    patientTarget: { therapy: { subView: 'programmazione', therapyId: 't1', date: '2026-10-04' } },
  });
});

test('hash restoration respects the pages actually rendered by each shell', () => {
  assert.equal(routeMatchesShell('admin-dashboard', 'operator'), false);
  assert.equal(routeMatchesShell('agenda-operatore', 'admin'), false);
  assert.equal(routeMatchesShell('consegne', 'operator'), true);
  assert.equal(routeMatchesShell('terapie', 'admin'), true);
});
