import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { PatientTherapyAPI } from '../../types';
import { completeTherapySnapshot, uncoveredPrescriptions, asNeededForPeriod } from '../therapyCompleteness';
import { readCompletePatientTherapies } from '../patientTherapyCalendarRead';
import { loadAllTherapyPages } from '../therapyPages';
import { buildPatientTherapyDay } from '../patientTherapyCalendar';
import { clearCachedGet } from '../cachedFetch';
import { patientGiroTime } from '../therapyGiro';
import type { TherapySlot } from '../../types';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearCachedGet(); });
const drug = (id: string, patch: Partial<PatientTherapyAPI> = {}): PatientTherapyAPI => ({
  id, patientId: 'synthetic-patient', farmacoNome: `Farmaco sintetico ${id}`, dosaggio: 'Prescrizione sintetica',
  viaSomministrazione: 'orale', tipo: 'periodica', stato: 'attiva', dataInizio: '2026-01-01', dataFine: null,
  dataSomministrazione: null, orarioSomministrazione: null, orarioSpecifico: '08:00',
  fasceMattina: true, fascePranzo: false, fascePomeriggio: false, fasceSera: false, fasceNotte: false,
  prescrittore: null, operatoreInseritore: null, note: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...patch,
});
const envelope = (items: PatientTherapyAPI[], total = items.length, active = total, next: string | null = null) => ({
  items, summary: { total, active, inactive: total - active }, pageInfo: { hasMore: !!next, nextCursor: next },
});
const read = (status: 'tutte' | 'attiva' | 'non_attiva' = 'tutte') =>
  readCompletePatientTherapies('synthetic-patient', new AbortController().signal, status);

test('complete inventory keeps every one of 103 prescriptions, inactive and every regimen included', async () => {
  const items = Array.from({ length: 103 }, (_, i) => drug(String(i), i === 102 ? { stato: 'conclusa' } :
    i === 101 ? { tipo: 'al_bisogno' } : i === 100 ? { tipo: 'una_tantum', dataSomministrazione: '2027-02-01' } : {}));
  const requests: URL[] = [];
  globalThis.fetch = (async input => {
    const url = new URL(String(input)); requests.push(url);
    return Response.json(url.searchParams.has('cursor')
      ? { ...envelope(items.slice(100)), summary: null }
      : envelope(items.slice(0, 100), 103, 102, 'next'));
  }) as typeof fetch;
  assert.deepEqual((await read()).map(item => item.id), items.map(item => item.id));
  assert.equal(requests.length, 2);
  assert.ok(requests.every(url => url.searchParams.get('status') === 'tutte' && url.searchParams.get('limit') === '100'));
});

test('short terminal page and wrong active/inactive counts never yield a complete inventory', async () => {
  for (const value of [envelope([drug('a')], 2), envelope([drug('a')], 1, 0)]) {
    globalThis.fetch = (async () => Response.json(value)) as typeof fetch;
    await assert.rejects(read(), /incompleto/);
  }
});

test('foreign patient and repeated prescription IDs are rejected without displaying prior pages', async () => {
  for (const items of [[drug('a', { patientId: 'other' })], [drug('a'), drug('a')]]) {
    globalThis.fetch = (async () => Response.json(envelope(items))) as typeof fetch;
    await assert.rejects(read());
  }
});

test('inactive inventory validates state and zero active count', async () => {
  globalThis.fetch = (async () => Response.json(envelope([drug('a', { stato: 'sospesa' })], 1, 0))) as typeof fetch;
  assert.equal((await read('non_attiva'))[0].stato, 'sospesa');
  await assert.rejects(() => read('attiva'));
});

test('complete inventory does not return page one on a later HTTP failure', async () => {
  let calls = 0;
  globalThis.fetch = (async () => ++calls === 1 ? Response.json(envelope([drug('a')], 2, 2, 'next')) :
    Response.json({}, { status: 503 })) as typeof fetch;
  await assert.rejects(read(), /503/);
});

test('complete print read rejects a short terminal response rather than silently omitting a medicine', async () => {
  globalThis.fetch = (async () => Response.json(envelope([drug('a')], 2))) as typeof fetch;
  await assert.rejects(() => loadAllTherapyPages('synthetic-patient'), /incompleto/);
});

test('old partial or foreign-patient prefetch snapshots cannot be presented as complete', () => {
  const full = { therapies: [drug('a')], summary: { total: 1, active: 1, inactive: 0 }, nextCursor: null };
  assert.equal(completeTherapySnapshot(full, 'synthetic-patient'), full);
  assert.equal(completeTherapySnapshot({ ...full, nextCursor: 'next' }, 'synthetic-patient'), undefined);
  assert.equal(completeTherapySnapshot({ ...full, summary: { total: 2, active: 2, inactive: 0 } }, 'synthetic-patient'), undefined);
  assert.equal(completeTherapySnapshot(full, 'another-patient'), undefined);
});

test('week keeps PRN applying only later in the week once, without adding scheduled doses', () => {
  const items = [drug('prn', { tipo: 'al_bisogno', dataInizio: '2026-10-08', dataFine: '2026-10-09' }), drug('normal')];
  const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
  const period = days.map(date => buildPatientTherapyDay(items, 'synthetic-patient', date));
  assert.equal(asNeededForPeriod([period[0]]).length, 0);
  assert.deepEqual(asNeededForPeriod(period).map(item => item.therapyId), ['prn']);
  assert.ok(period.every(day => day.events.every(item => item.therapyId !== 'prn')));
});

test('loaded slot missing a prescribed drug retains it as read-only source data, not a fabricated action', () => {
  const events = buildPatientTherapyDay([drug('a'), drug('b')], 'synthetic-patient', '2026-10-08').events;
  const slots = [{ id: 'mattina', fascia: 'mattina', ora: '08:00', patients: [{ patientId: 'synthetic-patient',
    firstName: 'Sintetico', lastName: 'Test', administrations: [{ therapyId: 'a', scheduledTime: '08:00', status: 'pending' }] }],
    summary: { total: 1, administered: 0, notAdministered: 0, pending: 1 } }] as unknown as TherapySlot[];
  const missing = uncoveredPrescriptions(events, patientGiroTime(slots, 'synthetic-patient', '08:00'), 'synthetic-patient');
  assert.deepEqual(missing.map(item => item.therapyId), ['b']);
  assert.equal(missing[0], events[1]);
  assert.ok(!('administrationId' in missing[0]) && !('status' in missing[0]));
  assert.deepEqual(uncoveredPrescriptions(events, null, 'synthetic-patient'), events);
});
