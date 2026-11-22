// Milo fase 1 — parti pure: pianificazione delle domande nuove, date di struttura, serie dei
// parametri, allineamento fra backend, servizio AI e registro dei permessi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:1/unit_no_db';

const { planQuery } = await import('../assistant/plan.js');
const { injectPatientId } = await import('../assistant/llm-planner.js');
const { READ_TOOLS, READ_TOOL_SCHEMA } = await import('../assistant/read-tools.js');
const { navFromSource } = await import('../assistant/nav.js');
const series = await import('../gateway/clinical-series.js');

const TODAY = '2026-11-23'; // lunedì
const onPatient = { currentPatientId: 'p1', today: TODAY };

test('new patient questions are planned to the new tools with the open patient', () => {
  const cases: Array<[string, string, string, Record<string, unknown>]> = [
    ['qual è il NEWS2 di oggi?', 'clinical_score', 'get_patient_news2', { days: 1 }],
    [
      'somministrazioni degli ultimi 3 giorni',
      'administrations',
      'get_patient_administrations',
      { days: 3 },
    ],
    ['ultima scala di Tinetti', 'assessments', 'get_patient_assessments', { type: 'tinetti' }],
    ['valutazione nutrizionale', 'assessments', 'get_patient_assessments', { type: 'mna' }],
    ['cosa dice il diario della settimana', 'diary', 'get_patient_diary', { days: 7 }],
    [
      'andamento di pressione e saturazione nell ultimo mese',
      'parameters_overview',
      'get_patient_parameters',
      { days: 30, params: ['pa', 'spo2'] },
    ],
    ['come sono i parametri?', 'parameters_overview', 'get_patient_parameters', { days: 7 }],
  ];
  for (const [question, intent, tool, args] of cases) {
    const plan = planQuery(question, onPatient);
    assert.equal(plan.intent, intent, question);
    assert.equal(plan.tools[0].tool, tool, question);
    assert.deepEqual(plan.tools[0].args, { patientId: 'p1', ...args }, question);
    assert.equal(plan.requiresCrossPatientAccess, false, question);
  }
  // A single-parameter trend keeps the existing tool (behaviour unchanged).
  assert.equal(planQuery('andamento della pressione', onPatient).intent, 'vitals_trend');
  // Clinical judgement is still refused before any read.
  assert.equal(planQuery('il NEWS2 è grave?', onPatient).intent, 'refuse_clinical');
});

test('facility questions resolve the day and never become cross-patient', () => {
  const shifts = planQuery('chi è di turno domani?', { today: TODAY });
  assert.equal(shifts.intent, 'staff_shifts');
  assert.deepEqual(shifts.tools[0], { tool: 'query_staff_shifts', args: { date: '2026-11-24' } });
  assert.deepEqual(planQuery('medici in servizio giovedì', { today: TODAY }).tools[0].args, {
    date: '2026-11-26',
    ruolo: 'medico',
  });
  // On a patient page a shift question is still a facility question.
  assert.equal(planQuery('chi è di turno stanotte', onPatient).intent, 'staff_shifts');
  const visits = planQuery('quando passa il medico domani?', { today: TODAY });
  assert.equal(visits.intent, 'agenda');
  assert.deepEqual(visits.tools[0].args, { from: '2026-11-24', to: '2026-11-24', ruolo: 'medico' });
  const week = planQuery('appuntamenti di questa settimana', { today: TODAY });
  assert.deepEqual(week.tools[0].args, { from: TODAY, to: '2026-11-29' });
  for (const plan of [shifts, visits, week]) assert.equal(plan.requiresCrossPatientAccess, false);
  // «turno» about a therapy is not a staff question.
  assert.notEqual(planQuery('terapie del turno di notte', onPatient).intent, 'staff_shifts');
});

test('dates of the facility calendar', () => {
  assert.equal(series.dayFromText('oggi', TODAY), TODAY);
  assert.equal(series.dayFromText('dopodomani', TODAY), '2026-11-25');
  assert.equal(series.dayFromText('ieri', TODAY), '2026-11-22');
  assert.equal(series.dayFromText('sabato', TODAY), '2026-11-28');
  assert.equal(series.dayFromText('lunedì', TODAY), TODAY);
  assert.equal(series.dayFromText('il 3/12', TODAY), '2026-12-03');
  assert.equal(series.dayFromText('2026-12-31', TODAY), '2026-12-31');
  assert.equal(series.dayFromText('chi lavora', TODAY), null);
  assert.equal(series.weekdayOf('2026-11-23'), 'lunedi');
});

test('series: both stores, blood pressure split, daily aggregates, unreadable values skipped', () => {
  const legacy = series.legacyVitalsToReadings([
    { id: 'a', etichetta: 'PA', valore: '150/90', rilevato: '2026-11-20T08:00:00.000Z' },
    { id: 'b', etichetta: 'FC', valore: '80', rilevato: '2026-11-20T08:00:00.000Z' },
    { id: 'c', etichetta: 'Ignota', valore: '1', rilevato: '2026-11-20T08:00:00.000Z' },
    { id: 'd', etichetta: 'SpO2', valore: '96', rilevato: 'non una data' },
  ]);
  assert.equal(legacy.length, 1);
  assert.deepEqual(legacy[0].values, { pa: '150/90', fc: '80' });
  const readings = [
    ...legacy,
    {
      id: 'r1',
      measuredAt: '2026-11-21T07:00:00.000Z',
      source: 'parametri' as const,
      values: { pa: '130/80', fc: '70' },
    },
    {
      id: 'r2',
      measuredAt: '2026-11-21T19:00:00.000Z',
      source: 'parametri' as const,
      values: { pa: '140/85', fc: 'x' },
    },
  ];
  const out = series.parameterSeries(readings, ['pa', 'fc']);
  const sys = out.find((s) => s.key === 'pa_sistolica')!;
  assert.deepEqual([sys.count, sys.min, sys.max, sys.avg, sys.change], [3, 130, 150, 140, -10]);
  assert.deepEqual(
    sys.daily.map((d) => [d.day, d.count, d.avg]),
    [
      ['2026-11-20', 1, 150],
      ['2026-11-21', 2, 135],
    ],
  );
  assert.equal(out.find((s) => s.key === 'pa_diastolica')!.max, 90);
  assert.equal(out.find((s) => s.key === 'fc')!.count, 2); // «x» is not a number
});

test('the LLM planner, the runtime prompt and the permission registry know every read tool', () => {
  const runtimePrompt = readFileSync(
    new URL('../../../../clinicos-ai-runtime/clinicos_ai/agents/assistant.py', import.meta.url),
    'utf8',
  );
  const llmPlanner = readFileSync(new URL('../assistant/llm-planner.ts', import.meta.url), 'utf8');
  for (const intent of [
    'vitals_trend',
    'rooms_occupancy',
    'facility_snapshot',
    'operator_queue',
    'parameters_overview',
    'clinical_score',
    'diary',
    'assessments',
    'administrations',
    'staff_shifts',
    'agenda',
  ]) {
    assert.match(llmPlanner, new RegExp(`'${intent}'`), intent);
    assert.match(runtimePrompt, new RegExp(`\\b${intent}\\b`), intent);
  }
  const registry = JSON.parse(
    readFileSync(new URL('../../authz/capability-registry.json', import.meta.url), 'utf8'),
  ) as { capabilities: Array<{ id: string; governedBy: string | null }> };
  for (const tool of READ_TOOLS) {
    if (tool === 'query_rooms_occupancy') continue; // governed by assistant.query (route)
    const cap = registry.capabilities.find((c) => c.id === `ai.read.${tool}`);
    assert.ok(cap?.governedBy, `ai.read.${tool}`);
  }
  assert.deepEqual(READ_TOOL_SCHEMA.map((t) => t.name).sort(), [...READ_TOOLS].sort());
});

test('the open patient is imposed on every new patient tool; facility tools keep their args', () => {
  const plan = injectPatientId(
    {
      intent: 'parameters_overview',
      scope: 'current_patient',
      requiresCrossPatientAccess: false,
      tools: [
        { tool: 'get_patient_parameters', args: { patientId: 'altro' } },
        { tool: 'get_patient_news2', args: {} },
        { tool: 'get_patient_diary', args: {} },
        { tool: 'get_patient_assessments', args: {} },
        { tool: 'get_patient_administrations', args: {} },
        { tool: 'query_staff_shifts', args: { date: TODAY } },
      ],
    },
    'p1',
  );
  assert.deepEqual(
    plan.tools.map((t) => t.args.patientId),
    ['p1', 'p1', 'p1', 'p1', 'p1', undefined],
  );
});

test('navigation of the new sources', () => {
  const src = (sourceType: string, patientId = 'p1') =>
    navFromSource({ sourceType, patientId, recordId: 'r', label: 'x' } as never);
  assert.equal(src('SHIFT', '').type, 'open_staff_schedule');
  assert.equal(src('DIARY_ENTRY').type, 'open_diary');
  assert.equal(src('ADMINISTRATION').type, 'open_therapy');
  assert.equal(src('CLINICAL_SCORE').type, 'open_parameter');
});
