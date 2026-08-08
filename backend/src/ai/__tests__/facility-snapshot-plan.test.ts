import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planQuery } from '../assistant/plan.js';
import { READ_TOOLS, READ_TOOL_SCHEMA, isReadTool } from '../assistant/read-tools.js';
import { ownerAgent, agentAllowsIntent } from '../assistant/agents.js';
import { navFromSource } from '../assistant/nav.js';
import {
  roomOccupancySource,
  consegnaSource,
  therapySource,
  appointmentSource,
} from '../gateway/sources.js';

// ── istantanea della struttura (domanda tipica dell'admin) ────────────────────────────────────
test('facility_snapshot: «cosa sta succedendo nella struttura?» → get_facility_snapshot', () => {
  const p = planQuery('Cosa sta succedendo nella mia struttura in questo momento?');
  assert.equal(p.intent, 'facility_snapshot');
  assert.equal(p.tools[0].tool, 'get_facility_snapshot');
  assert.deepEqual(p.tools[0].args, {});
  // lettura di struttura, non una ricerca privilegiata tra pazienti
  assert.equal(p.requiresCrossPatientAccess, false);
});

test('facility_snapshot: «riepilogo della struttura» e «situazione del reparto»', () => {
  assert.equal(planQuery('dammi un riepilogo della struttura').intent, 'facility_snapshot');
  assert.equal(planQuery('qual è la situazione del reparto?').intent, 'facility_snapshot');
});

test('facility_snapshot vale anche con una cartella aperta (resta una domanda di struttura)', () => {
  const p = planQuery('cosa sta succedendo?', { currentPatientId: 'P1' });
  assert.equal(p.intent, 'facility_snapshot');
  assert.equal(p.tools[0].tool, 'get_facility_snapshot');
});

// ── coda operatore (domanda tipica dell'operatore) ────────────────────────────────────────────
test('operator_queue: «cosa devo fare adesso?» → get_operator_queue', () => {
  const p = planQuery('Cosa devo fare adesso?');
  assert.equal(p.intent, 'operator_queue');
  assert.equal(p.tools[0].tool, 'get_operator_queue');
  assert.deepEqual(p.tools[0].args, {});
  assert.equal(p.requiresCrossPatientAccess, false);
});

test('operator_queue: varianti «cosa manca oggi», «prossima terapia», «le mie consegne»', () => {
  assert.equal(planQuery('cosa manca oggi?').intent, 'operator_queue');
  assert.equal(planQuery('qual è la prossima terapia da somministrare?').intent, 'operator_queue');
  assert.equal(planQuery('mostrami le mie consegne').intent, 'operator_queue');
  assert.equal(planQuery('quali attività da fare sono rimaste?').intent, 'operator_queue');
});

test('la coda operatore non richiede nome operatore per essere pianificata', () => {
  const conNome = planQuery('cosa devo fare adesso?', { operatorName: 'Anna Bianchi' });
  const senzaNome = planQuery('cosa devo fare adesso?');
  // il nome serve solo a ORDINARE a valle: non cambia il piano né compare negli argomenti
  assert.deepEqual(conNome.tools, senzaNome.tools);
});

// ── nessun falso positivo sugli intent già esistenti ──────────────────────────────────────────
test('le domande cliniche sul paziente aperto non diventano coda operatore', () => {
  const ctx = { currentPatientId: 'P1' };
  assert.equal(planQuery('quali allergie ha?', ctx).intent, 'allergies');
  assert.equal(planQuery('che terapie assume?', ctx).intent, 'therapies');
  assert.equal(planQuery('ultimi parametri', ctx).intent, 'vitals_recent');
});

test('occupazione e personale restano i loro intent, non l’istantanea', () => {
  assert.equal(planQuery('quanti posti letto sono occupati?').intent, 'rooms_occupancy');
  assert.equal(planQuery('elenca il personale della struttura').intent, 'staff_list');
});

test('una richiesta di consiglio clinico resta rifiutata, non diventa coda operatore', () => {
  const p = planQuery('cosa devo fare, suggerisci una terapia per la febbre');
  assert.equal(p.intent, 'refuse_clinical');
  assert.equal(p.tools.length, 0);
});

// ── QA H1: gli intent di struttura non devono sequestrare le domande su un paziente ───────────
// «cosa succede / cosa devo fare» valgono per la struttura o per il turno solo se la frase finisce
// lì o prosegue verso il qui-e-ora. Se prosegue verso un caso concreto è una domanda sul paziente.
const P1 = { currentPatientId: 'P1' };

test('H1: «cosa succede a Mario Rossi?» non è l’istantanea di struttura', () => {
  // senza contesto: nessuna risposta di struttura inventata su una domanda nominativa
  assert.notEqual(planQuery('Cosa succede a Mario Rossi?').intent, 'facility_snapshot');
  // con il paziente risolto a monte (service.ts risolve il nome), resta sul paziente
  const p = planQuery('Cosa succede a Mario Rossi?', P1);
  assert.notEqual(p.intent, 'facility_snapshot');
  assert.equal(p.scope, 'current_patient');
  assert.equal(p.requiresCrossPatientAccess, false);
});

test('H1: «cosa sta succedendo al paziente?» non è l’istantanea di struttura', () => {
  const p = planQuery('Cosa sta succedendo al paziente?', P1);
  assert.notEqual(p.intent, 'facility_snapshot');
  assert.equal(p.scope, 'current_patient');
});

test('H1: «qual è la prossima terapia di Mario Rossi?» → terapie del paziente', () => {
  const p = planQuery('Qual è la prossima terapia di Mario Rossi?', P1);
  assert.equal(p.intent, 'therapies');
  assert.equal(p.tools[0].tool, 'get_patient_therapies');
  assert.deepEqual(p.tools[0].args, { patientId: 'P1' });
});

test('H1: «cosa devo fare per la medicazione di Rossi?» non è la coda operatore', () => {
  const p = planQuery('Cosa devo fare per la medicazione di Rossi?', P1);
  assert.notEqual(p.intent, 'operator_queue');
  assert.equal(p.scope, 'current_patient');
});

test('H1: «cosa succede se sospendo il farmaco?» è un ipotetico clinico → rifiuto', () => {
  const p = planQuery('Cosa succede se sospendo il farmaco?', P1);
  assert.equal(p.intent, 'refuse_clinical');
  assert.equal(p.refusalReason, 'clinical_advice_not_allowed');
  assert.equal(p.tools.length, 0);
});

test('H1: le domande dell’evidenza AC-R1/AC-R2 continuano a instradare come prima', () => {
  // testo identico a quello usato nell'evidenza runtime del ciclo
  assert.equal(
    planQuery('Cosa sta succedendo nella mia struttura in questo momento?').intent,
    'facility_snapshot',
  );
  assert.equal(planQuery('Cosa devo fare adesso?').intent, 'operator_queue');
  // e le varianti già coperte dai test sopra restano valide
  assert.equal(planQuery('cosa sta succedendo?', P1).intent, 'facility_snapshot');
  assert.equal(planQuery('che cosa devo fare?').intent, 'operator_queue');
});

// ── navigazione dell'istantanea: le fonti di struttura non aprono una scheda paziente ─────────
test('la fonte occupazione dell’istantanea naviga ai posti letto, non a un paziente vuoto', () => {
  const nav = navFromSource(roomOccupancySource('12/20 letti occupati', new Date().toISOString()));
  assert.equal(nav.type, 'open_beds');
  assert.equal(nav.label, 'Apri posti letto');
  // regressione: prima ricadeva sul default generico → open_patient con patientId vuoto
  assert.notEqual(nav.type, 'open_patient');
  assert.equal(nav.patientId, undefined);
});

test('le altre fonti di struttura dell’istantanea restano sulle loro schermate di reparto', () => {
  assert.equal(navFromSource(therapySource('', 'T1', 'terapia')).type, 'open_therapies_today');
  assert.equal(navFromSource(appointmentSource('', 'A1', 'visita')).type, 'open_agenda');
  assert.equal(navFromSource(consegnaSource('', 'C1', 'consegna')).type, 'open_consegne');
});

test('con un paziente la navigazione resta sulla scheda paziente', () => {
  const nav = navFromSource(therapySource('P1', 'T1', 'terapia'));
  assert.equal(nav.type, 'open_therapy');
  assert.equal(nav.patientId, 'P1');
});

// ── allowlist + dominio degli agenti ──────────────────────────────────────────────────────────
test('i due nuovi tool sono in allowlist di SOLA lettura', () => {
  for (const t of ['get_facility_snapshot', 'get_operator_queue']) {
    assert.ok(READ_TOOLS.includes(t), `manca ${t}`);
    assert.equal(isReadTool(t), true);
    const schema = READ_TOOL_SCHEMA.find((s) => s.name === t);
    assert.ok(schema, `manca lo schema di ${t}`);
    // nessun argomento: né il perimetro della lettura né l'identità dell'operatore
    // possono essere proposti dal modello
    assert.deepEqual(schema.args, {});
  }
});

test('l’istantanea è di dominio facility; la coda operatore è condivisa fra gli agenti', () => {
  assert.equal(ownerAgent('facility_snapshot'), 'facility');
  assert.equal(agentAllowsIntent('facility', 'facility_snapshot'), true);
  assert.equal(agentAllowsIntent('clinical', 'facility_snapshot'), false);

  assert.equal(ownerAgent('operator_queue'), null);
  assert.equal(agentAllowsIntent('facility', 'operator_queue'), true);
  assert.equal(agentAllowsIntent('clinical', 'operator_queue'), true);
});
