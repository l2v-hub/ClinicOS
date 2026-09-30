import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allToolDefinitions } from '../../tools/index.js';
import { availabilityOf, type ToolDecisions } from '../availability.js';
import { SKILL_CATALOG, skillById } from '../catalog.js';
import {
  confirmationFor,
  isExplicitCancellation,
  isExplicitConfirmation,
} from '../confirmation.js';
import {
  createAgnoInterpreter,
  deterministicInterpreter,
  extractPatientQuery,
  extractValues,
  sanitizeAgnoRoute,
} from '../interpreter.js';

const TODAY = '2026-09-30';
const toolNames = new Set(allToolDefinitions.map((tool) => tool.name));

async function interpret(message: string) {
  return deterministicInterpreter({
    message,
    available: SKILL_CATALOG,
    pending: null,
    today: TODAY,
  });
}

test('catalog: every skill composes REAL Tool Layer tools and has a stable unique id', () => {
  const ids = new Set<string>();
  for (const skill of SKILL_CATALOG) {
    assert.ok(/^[a-z]+(\.[a-z_]+)+$/.test(skill.id), skill.id);
    assert.ok(!ids.has(skill.id), `duplicate ${skill.id}`);
    ids.add(skill.id);
    for (const tool of [...skill.requiredTools, ...skill.optionalTools]) {
      assert.ok(toolNames.has(tool), `${skill.id} uses unknown tool ${tool}`);
    }
    assert.ok(skill.requiredTools.length > 0, skill.id);
    if (skill.kind === 'read') assert.equal(skill.confirmation, 'READ', skill.id);
  }
  assert.ok(SKILL_CATALOG.length >= 14);
});

test('Prompt 3 phrases select the expected skills (deterministic interpreter)', async () => {
  const cases: [string, string][] = [
    ['mostrami i parametri recenti di questo ospite', 'vitals.recent'],
    ['registra questi parametri', 'vitals.record'],
    ['aggiungi questa osservazione', 'diary.add_observation'],
    ['mostrami le informazioni disponibili su questo paziente', 'patient.overview'],
    ['aggiungi pressione 120/80', 'vitals.record'],
    ['Registra i parametri.', 'vitals.record'],
    ['crea una consegna per Rossi: controllare la diuresi', 'handover.create'],
    ['come sono le consegne?', 'handover.overview'],
    ['quanti posti letto sono occupati?', 'facility.occupancy'],
    ['prescrivi paracetamolo 1 g', 'therapy.prescribe'],
    ['quali somministrazioni ci sono oggi?', 'therapy.due_administrations'],
    ['cerca il farmaco tachipirina', 'drug.lookup'],
    ['appuntamenti di domani', 'appointments.day'],
  ];
  for (const [message, expected] of cases) {
    assert.equal((await interpret(message)).skillId, expected, message);
  }
});

test('slot extraction: values, patient reference, current patient, text, date', async () => {
  assert.deepEqual(extractValues('pressione 120/80, SpO2 97%, fc 72, temperatura 36,8'), {
    pa: '120/80',
    spo2: '97',
    fc: '72',
    temperatura: '36,8',
  });
  assert.deepEqual(extractValues('frequenza respiratoria 18 e frequenza cardiaca 80'), {
    fr: '18',
    fc: '80',
  });
  assert.deepEqual(extractValues('visita del 30/09'), {}, 'a date is not a blood pressure');
  assert.equal(extractPatientQuery('registra pressione 130/85 per Mario Rossi'), 'Mario Rossi');
  assert.equal(extractPatientQuery('aggiungi pressione 120/80'), undefined);
  const current = await interpret('mostrami i parametri recenti di questo ospite');
  assert.equal(current.currentPatient, true);
  const text = await interpret('aggiungi questa osservazione per Bianchi: "mangia poco a pranzo"');
  assert.equal(text.text, 'mangia poco a pranzo');
  assert.equal(text.patientQuery, 'Bianchi');
  assert.equal((await interpret('appuntamenti di domani')).date, '2026-10-01');
});

test('pending question: the message fills the awaited slot', async () => {
  const answer = await deterministicInterpreter({
    message: 'Rossi',
    available: SKILL_CATALOG,
    pending: { skillId: 'vitals.record', slot: 'patient' },
    today: TODAY,
  });
  assert.equal(answer.skillId, 'vitals.record');
  assert.equal(answer.patientQuery, 'Rossi');
  const values = await deterministicInterpreter({
    message: 'pressione 125/80 e saturazione 96',
    available: SKILL_CATALOG,
    pending: { skillId: 'vitals.record', slot: 'values' },
    today: TODAY,
  });
  assert.deepEqual(values.values, { pa: '125/80', spo2: '96' });
});

test('confirmation policy: classes, policy effect upgrade, explicit acts only', () => {
  assert.deepEqual(confirmationFor(skillById('vitals.recent')!, []), { mode: 'none' });
  assert.deepEqual(confirmationFor(skillById('vitals.recent')!, ['parameters.list_readings']), {
    mode: 'preview_and_confirm',
    reason: 'policy_effect',
    professional: false,
  });
  assert.equal(confirmationFor(skillById('vitals.record')!, []).mode, 'preview_and_confirm');
  assert.equal(confirmationFor(skillById('handover.create')!, []).mode, 'preview_and_confirm');
  assert.deepEqual(confirmationFor(skillById('therapy.prescribe')!, []), {
    mode: 'preview_and_confirm',
    reason: 'class',
    professional: true,
  });
  for (const yes of ['sì', 'Conferma', 'confermo.', 'ok', 'procedi'])
    assert.ok(isExplicitConfirmation(yes), yes);
  for (const notYes of ['sì ma cambia la pressione', 'forse', 'registra', '']) {
    assert.ok(!isExplicitConfirmation(notYes), notYes);
  }
  assert.ok(isExplicitCancellation('annulla'));
  assert.ok(!isExplicitCancellation('non annullare niente, registra'));
});

test('availability: required tool revoked → unavailable; optional revoked → partial', () => {
  const skill = skillById('vitals.record')!;
  const all: ToolDecisions = new Map(
    [...skill.requiredTools, ...skill.optionalTools].map((t) => [
      t,
      { allowed: true, requiresConfirmation: false },
    ]),
  );
  assert.equal(availabilityOf(skill, all).available, true);
  const noOptional = new Map(all);
  noOptional.set('parameters.list_readings', { allowed: false, requiresConfirmation: false });
  assert.deepEqual(
    { ...availabilityOf(skill, noOptional), skill: undefined },
    {
      skill: undefined,
      available: true,
      partial: true,
      missingRequired: [],
      missingOptional: ['parameters.list_readings'],
      confirmationTools: [],
    },
  );
  const revoked = new Map(all);
  revoked.set('parameters.create_reading', { allowed: false, requiresConfirmation: false });
  assert.deepEqual(availabilityOf(skill, revoked).missingRequired, ['parameters.create_reading']);
});

test('Agno route is validated: skills outside the available list and unknown keys are dropped', () => {
  const allowed = new Set(['vitals.record', 'vitals.recent']);
  const route = sanitizeAgnoRoute(
    {
      skillId: 'vitals.record',
      patientQuery: 'Rossi',
      values: { pa: '120/80', spo2: 97, hack: 'x', note: 'no' },
      confirm: true,
    },
    allowed,
  );
  assert.deepEqual(route, {
    source: 'agno',
    skillId: 'vitals.record',
    patientQuery: 'Rossi',
    values: { pa: '120/80', spo2: '97' },
  });
  assert.equal(
    sanitizeAgnoRoute({ skillId: 'therapy.prescribe' }, allowed),
    null,
    'not offered → ignored',
  );
  assert.equal(sanitizeAgnoRoute('nonsense', allowed), null);
});

test('Agno interpreter falls back to the deterministic one when the runtime is unreachable', async () => {
  const interpreter = createAgnoInterpreter(deterministicInterpreter, {
    AI_RUNTIME_URL: 'http://127.0.0.1:9',
    AI_RUNTIME_SERVICE_TOKEN: 't',
  });
  const result = await interpreter({
    message: 'registra pressione 120/80 per Rossi',
    available: SKILL_CATALOG,
    pending: null,
    today: TODAY,
  });
  assert.equal(result.source, 'deterministic');
  assert.equal(result.skillId, 'vitals.record');
});

test('bindable therapy: only classic-mapper keys; hidden fields forced or refused', async () => {
  const { bindableTherapy } = await import('../engine.js');
  const base = {
    farmacoNome: 'PARACETAMOLO',
    drugPackageRef: null,
    dataInizio: '2026-09-30',
    viaSomministrazione: 'orale',
    tipo: 'periodica',
    stato: 'attiva',
    commercialStrengthValue: 1000,
    commercialStrengthUnit: 'mg',
    allowedFractions: '1',
    schedules: [],
    giorniSettimana: '',
  };
  assert.deepEqual(bindableTherapy(base), { ...base, stato: 'attiva', drugPackageRef: null });
  assert.equal(bindableTherapy({ ...base, prescrittore: 'Dr. X' }), null);
  assert.equal(bindableTherapy({ ...base, stato: 'sospesa' }), null);
  assert.equal(bindableTherapy({ ...base, drugPackageRef: 'AIC-1' }), null);
  assert.equal(bindableTherapy({ ...base, tipo: 'una_tantum' }), null);
  assert.equal(bindableTherapy({ ...base, operatoreInseritore: 'X' }), null);
  assert.deepEqual(bindableTherapy({ ...base, prescrittore: '' }), { ...base, stato: 'attiva', drugPackageRef: null });
});
