import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { PatientTherapyAPI, TherapyScheduleAPI } from '../../types';
import {
  buildPatientTherapyDay,
  isCalendarDate,
  shiftCalendarDate,
} from '../patientTherapyCalendar';
import { readPatientCalendarTherapies } from '../patientTherapyCalendarRead';
import { localIsoDate } from '../appointmentRange';
import { setCurrentOperator } from '../operatorSession';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  setCurrentOperator(null);
});
const date = '2026-09-15'; // Tuesday
function therapy(patch: Partial<PatientTherapyAPI> = {}): PatientTherapyAPI {
  return {
    id: 'therapy-a',
    patientId: 'patient-a',
    farmacoNome: 'Farmaco sintetico A',
    dosaggio: 'Dose prescritta',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    dataInizio: '2026-01-01',
    dataFine: null,
    fasceMattina: false,
    fascePranzo: false,
    fascePomeriggio: false,
    fasceSera: false,
    fasceNotte: false,
    orarioSpecifico: null,
    prescrittore: null,
    operatoreInseritore: null,
    note: null,
    dataSomministrazione: null,
    orarioSomministrazione: null,
    schedules: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...patch,
  };
}
function schedule(time: string, num = 1, den = 1): TherapyScheduleAPI {
  return {
    id: `s-${time}`,
    therapyId: 'therapy-a',
    time,
    fascia: 'mattina',
    quantityNumerator: num,
    quantityDenominator: den,
    administrationUnit: 'compressa',
  };
}
const build = (items: PatientTherapyAPI[], day = date) =>
  buildPatientTherapyDay(items, 'patient-a', day);
const page = (items: PatientTherapyAPI[], total = items.length, cursor: string | null = null) => ({
  items,
  summary: { total, active: total, inactive: 0 },
  pageInfo: { hasMore: cursor !== null, nextCursor: cursor },
});
const read = (id = 'patient-a', timeout = 1000) =>
  readPatientCalendarTherapies(id, new AbortController().signal, timeout);

test('keeps every exact time, simultaneous medication and per-dose fraction across a full day', () => {
  const day = build([
    therapy({
      schedules: [
        schedule('23:59'),
        schedule('10:00', 1, 2),
        schedule('08:00'),
        schedule('00:00'),
        schedule('08:17', 2, 3),
      ],
      orarioSpecifico: '08:00,10:00',
    }),
    therapy({ id: 'therapy-b', farmacoNome: 'Farmaco sintetico B', orarioSpecifico: '08:00' }),
  ]);
  assert.deepEqual(
    day.events.map((event) => event.time),
    ['00:00', '08:00', '08:00', '08:17', '10:00', '23:59'],
  );
  assert.equal(day.events[4].dose, '1/2 compressa');
  assert.equal(day.events[3].dose, '2/3 compressa');
  assert.equal(day.events[2].dose, 'Dose prescritta');
  assert.equal(new Set(day.events.map((event) => event.id)).size, 6);
  assert.ok(day.events.every((event) => event.route === 'orale' && !('status' in event)));
});

test('isolates the patient and excludes suspended/concluded prescriptions', () => {
  assert.equal(
    build([
      therapy({ patientId: 'patient-b', orarioSpecifico: '08:00' }),
      therapy({ stato: 'sospesa', orarioSpecifico: '08:00' }),
      therapy({ stato: 'conclusa', orarioSpecifico: '08:00' }),
    ]).events.length,
    0,
  );
});

test('date range is inclusive and ISO weekdays are respected', () => {
  const item = therapy({
    dataInizio: date,
    dataFine: '2026-09-17',
    giorniSettimana: '2, 4',
    orarioSpecifico: '08:00',
  });
  assert.equal(build([item], '2026-09-14').events.length, 0);
  assert.equal(build([item]).events.length, 1);
  assert.equal(build([item], '2026-09-16').events.length, 0);
  assert.equal(build([item], '2026-09-17').events.length, 1);
  assert.equal(build([item], '2026-09-18').events.length, 0);
  assert.equal(
    build([therapy({ giorniSettimana: '7', orarioSpecifico: '08:00' })], '2026-09-20').events
      .length,
    1,
  );
});

test('one-time dates and legacy times work independently from the recurring date range', () => {
  const item = therapy({
    tipo: 'una_tantum',
    dataInizio: '2026-09-19',
    dataSomministrazione: date,
    orarioSomministrazione: '21:35',
    orarioSpecifico: '08:00',
  });
  assert.equal(build([item]).events[0].time, '21:35');
  assert.equal(build([item]).events[0].oneTime, true);
  assert.equal(build([item], '2026-09-16').events.length, 0);
  assert.equal(
    build([therapy({ ...item, schedules: [schedule('09:00')] })]).events[0].time,
    '09:00',
  );
});

test('PRN and fascia-only orders remain outside the grid without fabricated times or doses', () => {
  const day = build([
    therapy({ id: 'prn', tipo: 'al_bisogno', schedules: [schedule('08:00')] }),
    therapy({ id: 'fascia', fasceMattina: true, fasceNotte: true }),
    therapy({ id: 'future', tipo: 'al_bisogno', dataInizio: '2026-09-16' }),
  ]);
  assert.equal(day.events.length, 0);
  assert.equal(day.unscheduled.length, 2);
  assert.ok(day.unscheduled.some((item) => item.kind === 'as_needed'));
  assert.match(day.unscheduled.find((item) => item.id === 'fascia')!.reason, /mattina, notte/);
  assert.ok(day.unscheduled.every((item) => item.dose === 'Dose prescritta'));
});

test('invalid legacy dates/recurrence stay visible for correction instead of masquerading as empty', () => {
  for (const patch of [
    { dataInizio: '2026-02-30' },
    { dataFine: '2025-01-01' },
    { giorniSettimana: '0,2' },
    { tipo: 'una_tantum' as const, dataSomministrazione: null },
  ]) {
    const day = build([therapy({ orarioSpecifico: '08:00', ...patch })]);
    assert.equal(day.events.length, 0);
    assert.equal(day.unscheduled[0].kind, 'incomplete');
  }
});

test('mixed invalid times retain valid occurrences and surface the anomaly', () => {
  for (const patch of [
    { orarioSpecifico: '08:00,24:00,09:60,08:00' },
    { schedules: [schedule('08:00'), schedule('not-an-hour')] },
  ]) {
    const day = build([therapy(patch)]);
    assert.equal(day.events.length, 1);
    assert.equal(day.events[0].time, '08:00');
    assert.equal(day.unscheduled.length, 1);
  }
  assert.equal(
    build([therapy({ schedules: [schedule('08:00', 1, 0)] })]).events[0].dose,
    'Dose da verificare',
  );
});

test('calendar date validation/navigation respects civil days, leap years and local midnight', () => {
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2026-09-15T00:00:00Z'), false);
  assert.equal(shiftCalendarDate('2026-03-29', 1), '2026-03-30');
  assert.equal(shiftCalendarDate('2026-10-25', -1), '2026-10-24');
  assert.equal(shiftCalendarDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftCalendarDate('2028-03-01', -1), '2028-02-29');
  assert.equal(shiftCalendarDate('9999-12-31', 1), '9999-12-31');
  assert.equal(localIsoDate(new Date(2026, 8, 15, 0, 10)), date);
  assert.throws(() => build([], '2026-02-30'), /Data/);
});

test('reads all patient-scoped pages with operator headers, without returning a partial page', async () => {
  const urls: URL[] = [];
  setCurrentOperator({ id: 'qa-operator', role: 'OPERATORE' });
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    urls.push(url);
    assert.equal(new Headers(init?.headers).get('X-Operator-Id'), 'qa-operator');
    assert.equal(init?.cache, 'no-store');
    return Response.json(
      urls.length === 1
        ? page([therapy()], 2, 'next')
        : { ...page([therapy({ id: 'therapy-b' })]), summary: null },
    );
  }) as typeof fetch;
  const result = await read();
  assert.deepEqual(
    result.map((item) => item.id),
    ['therapy-a', 'therapy-b'],
  );
  assert.ok(
    urls.every(
      (url) =>
        url.pathname === '/patients/patient-a/therapies/page' &&
        url.searchParams.get('status') === 'attiva',
    ),
  );
  assert.equal(urls[1].searchParams.get('cursor'), 'next');
});

test('HTTP failure on a later page discards the whole read and a fresh retry recovers', async () => {
  let calls = 0;
  globalThis.fetch = (async () =>
    ++calls === 1
      ? Response.json(page([therapy()], 2, 'next'))
      : Response.json({}, { status: 503 })) as typeof fetch;
  await assert.rejects(read(), /503/);
  globalThis.fetch = (async () => Response.json(page([]))) as typeof fetch;
  assert.deepEqual(await read(), []);
});

test('rejects foreign patient payloads and malformed envelopes, not a false empty calendar', async () => {
  for (const payload of [
    page([therapy({ patientId: 'patient-b' })]),
    page([therapy({ schedules: [null] as never })]),
    { ...page([]), pageInfo: { hasMore: true, nextCursor: null } },
    { ...page([]), summary: null },
    { ...page([]), summary: { total: -1, active: -1, inactive: 0 } },
    page([therapy({ stato: 'sospesa' })]),
    page([therapy(), therapy()]),
  ]) {
    globalThis.fetch = (async () => Response.json(payload)) as typeof fetch;
    await assert.rejects(read());
  }
});

test('counts, cursor loops and capacity cannot silently truncate the patient regimen', async () => {
  globalThis.fetch = (async () => Response.json(page([therapy()], 2))) as typeof fetch;
  await assert.rejects(read(), /incompleto/);
  let calls = 0;
  globalThis.fetch = (async () =>
    Response.json(page([therapy({ id: `t${++calls}` })], 3, 'repeated'))) as typeof fetch;
  await assert.rejects(read(), /Paginazione/);
  globalThis.fetch = (async () => Response.json(page([], 5001))) as typeof fetch;
  await assert.rejects(read(), /limite/);
});

test('timeout aborts the read and a subsequent retry does not share the stalled request', async () => {
  globalThis.fetch = ((_input, init) =>
    new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError')),
      );
    })) as typeof fetch;
  await assert.rejects(read('patient-a', 10), { name: 'AbortError' });
  globalThis.fetch = (async () => Response.json(page([therapy()]))) as typeof fetch;
  assert.equal((await read()).length, 1);
});

test('cancelled or late ignored-abort responses cannot complete a patient read', async () => {
  const controller = new AbortController();
  let resolve!: (value: Response) => void;
  globalThis.fetch = (() =>
    new Promise<Response>((done) => {
      resolve = done;
    })) as typeof fetch;
  const pending = readPatientCalendarTherapies('patient-a', controller.signal);
  controller.abort();
  resolve(Response.json(page([therapy()])));
  await assert.rejects(pending, { name: 'AbortError' });
});
