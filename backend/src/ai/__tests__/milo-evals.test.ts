// Prove dei casi d'uso di Milo: i controlli sono oggettivi e non lasciano passare una risposta
// sbagliata (lettura mancante, blocco assente, farmaco scelto da Milo, conferma non bloccata).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MILO_EVAL_CASES,
  evaluateCase,
  summarize,
  visibleText,
  type EvalCase,
} from '../evals/milo-cases.js';

const byId = (id: string): EvalCase => {
  const found = MILO_EVAL_CASES.find((c) => c.id === id);
  assert.ok(found, id);
  return found;
};
const failed = (testCase: EvalCase, response: unknown) =>
  evaluateCase(testCase, response)
    .checks.filter((c) => !c.pass)
    .map((c) => c.name);

test('the suite covers the five use cases with the right profiles', () => {
  assert.deepEqual(
    MILO_EVAL_CASES.map((c) => [c.id, c.role, c.expect.kind]),
    [
      ['caso-1-come-va', 'Infermiere 1', 'read'],
      ['caso-2-chi-ha-seguito', 'Supervisore 1', 'read'],
      ['caso-3-camere', 'Supervisore 1', 'read'],
      ['caso-4-registra-parametri', 'Infermiere 1', 'preview'],
      ['caso-4-valori-mancanti', 'Infermiere 1', 'preview'],
      ['caso-5-classe-di-farmaci', 'Medico 1', 'handoff'],
      ['caso-5-prescrizione-preparata', 'Medico 1', 'handoff'],
      ['caso-5-via-mancante', 'Medico 1', 'handoff'],
      ['caso-5-ruolo-senza-permesso', 'OSS 1', 'refusal'],
    ],
  );
  assert.equal(new Set(MILO_EVAL_CASES.map((c) => c.id)).size, MILO_EVAL_CASES.length);
});

const teamAnswer = {
  plan: { actionType: 'read' },
  preview: null,
  read: {
    intent: 'parameters_overview',
    mode: 'team',
    notFound: false,
    answerText: 'Negli ultimi 7 giorni la temperatura è salita a 38,4 °C [1]. NEWS2 6 [2].',
    sources: [{ id: 'a' }, { id: 'b' }],
    team: {
      members: ['clinico', 'sorveglianza'],
      tools: ['get_patient_parameters', 'get_patient_news2'],
      skills: { clinico: '1.1.0', sorveglianza: '1.1.0', coordinatore: '1.1.0' },
    },
    blocks: [
      { type: 'kpi', title: 'Da controllare (promemoria da protocollo)', items: [] },
      { type: 'parameter_trend', title: 'Andamento dei parametri' },
    ],
  },
};

test('a team answer passes and reports members and skill versions', () => {
  const result = evaluateCase(byId('caso-1-come-va'), teamAnswer);
  assert.equal(result.pass, true, summarize([result]));
  assert.equal(result.mode, 'team');
  assert.deepEqual(result.members, ['clinico', 'sorveglianza']);
  assert.equal(result.skills?.clinico, '1.1.0');
  assert.match(summarize([result]), /^OK {3}caso-1-come-va \(team · clinico\+sorveglianza\)/);
});

test('missing read, missing block, no sources and clinical judgement are caught', () => {
  const testCase = byId('caso-1-come-va');
  const read = teamAnswer.read;
  assert.deepEqual(
    failed(testCase, { ...teamAnswer, read: { ...read, team: { ...read.team, tools: [] } } }),
    ['lettura usata: get_patient_parameters'],
  );
  assert.deepEqual(
    failed(testCase, { ...teamAnswer, read: { ...read, blocks: [read.blocks[1]] } }),
    ['blocco: Da controllare (promemoria da protocollo)'],
  );
  assert.deepEqual(failed(testCase, { ...teamAnswer, read: { ...read, sources: [] } }), [
    'fonti citate ≥ 1',
  ]);
  const judgement = {
    ...read,
    answerText: `${read.answerText} Ti consiglio di aumentare il diuretico.`,
  };
  assert.equal(failed(testCase, { ...teamAnswer, read: judgement }).length, 1);
  assert.deepEqual(failed(testCase, { ...teamAnswer, read: { ...read, notFound: true } }), [
    'risposta trovata',
  ]);
});

test('write preview: values, blocked confirmation, wrong action', () => {
  const ok = {
    plan: { actionType: 'create_parameter_reading' },
    read: null,
    preview: {
      actionType: 'create_parameter_reading',
      canExecute: true,
      ambiguities: [],
      lines: [
        { label: 'Pressione', value: '128/76 mmHg' },
        { label: 'Frequenza cardiaca', value: '81 bpm' },
        { label: 'Coscienza', value: 'Vigile (A)' },
        { label: 'Evacuazione', value: 'Sì' },
        { label: 'Orario', value: 'adesso (ora della conferma)' },
      ],
    },
  };
  assert.deepEqual(failed(byId('caso-4-registra-parametri'), ok), []);
  const wrongValue = structuredClone(ok);
  wrongValue.preview.lines[1].value = '18 bpm';
  assert.deepEqual(failed(byId('caso-4-registra-parametri'), wrongValue), [
    'anteprima: Frequenza cardiaca: 81 bpm',
  ]);
  // Valori mancanti: una conferma disponibile è un errore.
  assert.ok(failed(byId('caso-4-valori-mancanti'), ok).includes('conferma bloccata'));
  const legacy = { ...ok, preview: { ...ok.preview, actionType: 'create_vital_sign' } };
  assert.ok(
    failed(byId('caso-4-registra-parametri'), legacy).includes('azione: create_parameter_reading'),
  );
});

test('prescription: a drug chosen by Milo, a missing button and a missing refusal are caught', () => {
  const handoff = (text: string, button: boolean) => ({
    plan: { actionType: 'read' },
    preview: null,
    read: {
      intent: 'prescription_handoff',
      notFound: false,
      answerText: text,
      sources: [],
      blocks: [
        {
          type: 'table',
          title: 'Prescrizione da preparare',
          rows: [
            { campo: 'Orari', valore: '06:00, 14:00, 22:00 (proposti)' },
            { campo: 'Periodo', valore: 'dal 23/11 al 27/11 (5 giorni)' },
          ],
        },
        ...(button
          ? [{ type: 'handoff', title: 't', label: 'Prepara la prescrizione', message: 'm' }]
          : []),
      ],
    },
  });
  const klass = byId('caso-5-classe-di-farmaci');
  assert.deepEqual(failed(klass, handoff('«diuretico» è una classe, non un farmaco.', false)), []);
  assert.deepEqual(
    failed(
      klass,
      handoff('«diuretico» è una classe, non un farmaco: ad esempio furosemide.', false),
    ),
    ['non contiene «furosemide»'],
  );
  assert.ok(
    failed(klass, handoff('«diuretico» è una classe, non un farmaco.', true)).includes(
      'nessun pulsante di prescrizione',
    ),
  );
  const refused = {
    plan: { actionType: 'refuse_forbidden' },
    read: null,
    preview: { refusal: 'no' },
  };
  assert.deepEqual(failed(byId('caso-5-ruolo-senza-permesso'), refused), []);
  assert.deepEqual(failed(byId('caso-5-ruolo-senza-permesso'), handoff('testo pronto', true)), [
    'tipo di risposta: refusal',
  ]);
  assert.match(visibleText(handoff('abc', true)), /Prepara la prescrizione/);
});

test('time budget is checked only when a duration was measured', () => {
  const testCase = byId('caso-1-come-va');
  assert.equal(testCase.expect.maxSeconds, 45);
  assert.equal(evaluateCase(testCase, teamAnswer).pass, true); // nei test: nessun tempo misurato
  assert.equal(evaluateCase(testCase, teamAnswer, { seconds: 22.4 }).pass, true);
  const slow = evaluateCase(testCase, teamAnswer, { seconds: 75.1 });
  assert.deepEqual(
    slow.checks.filter((c) => !c.pass).map((c) => `${c.name} → ${c.detail}`),
    ['risposta entro 45 s → 75.1 s'],
  );
});
