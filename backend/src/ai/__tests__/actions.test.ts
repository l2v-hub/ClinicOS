// SPEC-015 Increment A: unified Agnos orchestrator — CRU-only catalog, channel-agnostic
// plan/execute, delete refused at every level. No DB: preview context, writer and store are injected
// (same mocking pattern as voice.test.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGNOS_ACTION_CATALOG,
  isActionAllowed,
  listCatalog,
  type AgnosActionKind,
} from '../actions/catalog.js';
import { planCommand, executeCommand, type AgnosOperatorContext } from '../actions/orchestrate.js';
import { VoiceError, type VoiceWriter } from '../voice/execute.js';
import { IdempotencyStore } from '../voice/idempotency.js';
import { loadVoiceConfig } from '../voice/config.js';
import { setAuditPersistence, type AiAuditEventInput } from '../audit-store.js';
import type { UserContext } from '../gateway/types.js';
import type { AssistantAnswer } from '../assistant/service.js';

const PID = 'pat-1';
const gatewayCtx: UserContext = {
  userId: 'op1',
  tenantId: 'default',
  roles: ['operatore'],
  permittedPatientIds: null,
  requestId: 'test',
};
const operatorCtx: AgnosOperatorContext = {
  operatorId: 'op1',
  operatorName: 'Inf. Demo',
  gatewayCtx,
};
const noDb = { loadPreviewContext: async () => ({}) };
const emptyEnv = {} as NodeJS.ProcessEnv;

function fakeWriter() {
  const calls: string[] = [];
  const w: VoiceWriter = {
    async createVitalSign() {
      calls.push('vital');
      return 'rec-vital';
    },
    async updateDemographics() {
      calls.push('demo');
      return 'rec-demo';
    },
    async appendNarrative() {
      calls.push('narr');
      return 'rec-narr';
    },
    async addDiaryNote() {
      calls.push('diary');
      return 'rec-diary';
    },
    async createAppointment() {
      calls.push('appt-create');
      return 'rec-appt';
    },
    async updateAppointment() {
      calls.push('appt-update');
      return 'rec-appt';
    },
    async createConsegna() {
      calls.push('consegna');
      return 'rec-consegna';
    },
  };
  return { w, calls };
}

function execDeps(w: VoiceWriter, env: NodeJS.ProcessEnv = emptyEnv) {
  return {
    cfg: loadVoiceConfig(emptyEnv),
    writer: w,
    store: new IdempotencyStore(),
    env,
    nowISO: '2026-07-03T10:00:00.000Z',
  };
}

// ── CATALOG ─────────────────────────────────────────────────────────────────

test('catalog: zero delete actions, kinds are CRU-only by construction', () => {
  const entries = Object.values(AGNOS_ACTION_CATALOG);
  assert.ok(entries.length >= 5);
  const allowedKinds: AgnosActionKind[] = ['read', 'create', 'update'];
  for (const e of entries) {
    assert.ok(allowedKinds.includes(e.kind), `${e.name}: kind ${e.kind}`);
    assert.notEqual(e.kind as string, 'delete');
    assert.ok(e.description.length > 0);
  }
  // the 4 write actions + the read entry are all present
  for (const name of [
    'read',
    'create_vital_sign',
    'update_patient_demographics',
    'update_narrative_section',
    'add_diary_note',
  ]) {
    assert.ok(AGNOS_ACTION_CATALOG[name], `manca ${name}`);
  }
});

test('catalog: deny-by-default and AI_DISABLED_ACTIONS kill-switch', () => {
  assert.equal(isActionAllowed('create_vital_sign', emptyEnv), true);
  assert.equal(isActionAllowed('delete_patient', emptyEnv), false); // not in catalog
  assert.equal(isActionAllowed('delete_vital_sign', emptyEnv), false); // not in catalog
  assert.equal(
    isActionAllowed('create_vital_sign', {
      AI_DISABLED_ACTIONS: 'create_vital_sign',
    } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isActionAllowed('add_diary_note', {
      AI_DISABLED_ACTIONS: 'create_vital_sign, add_diary_note',
    } as NodeJS.ProcessEnv),
    false,
  );
  const listed = listCatalog({ AI_DISABLED_ACTIONS: 'add_diary_note' } as NodeJS.ProcessEnv);
  assert.equal(listed.find((e) => e.name === 'add_diary_note')?.enabled, false);
  assert.equal(listed.find((e) => e.name === 'create_vital_sign')?.enabled, true);
});

// ── PLAN (channel testo) ────────────────────────────────────────────────────

test('planCommand testo: vital command → executable create_vital_sign preview', async () => {
  const r = await planCommand(
    {
      text: 'registra pressione 130 su 80 alle 9',
      channel: 'testo',
      currentPatientId: PID,
      operatorCtx,
    },
    { loadPreviewContext: async () => ({ patientName: 'Rossi Mario' }) },
  );
  assert.equal(r.plan.actionType, 'create_vital_sign');
  assert.equal(r.plan.channel, 'testo');
  assert.equal(r.plan.patientId, PID);
  assert.deepEqual(r.plan.ambiguities, []);
  assert.equal(r.read, null);
  assert.equal(r.preview?.canExecute, true);
  assert.equal(r.preview?.patientName, 'Rossi Mario');
  assert.equal(r.preview?.title, 'Aggiungi parametro');
});

test('planCommand: read question delegates to the assistant (preview null, read populated)', async () => {
  const answer = {
    intent: 'unknown',
    results: [],
    sources: [],
    navigation: [],
    notFound: false,
    truncated: false,
  } as unknown as AssistantAnswer;
  let asked = '';
  const r = await planCommand(
    {
      text: 'Quali sono gli ultimi parametri?',
      channel: 'testo',
      currentPatientId: PID,
      operatorCtx,
    },
    {
      runRead: async (q) => {
        asked = q;
        return answer;
      },
    },
  );
  assert.equal(r.plan.actionType, 'read');
  assert.equal(r.plan.channel, 'testo');
  assert.equal(r.preview, null);
  assert.ok(r.read);
  assert.match(asked, /parametri/i);
});

test('#239 planCommand: a natural question without an explicit read verb ("che terapie…") delegates to the assistant', async () => {
  const answer = {
    intent: 'therapies',
    results: [{}],
    sources: [],
    navigation: [],
    notFound: false,
    truncated: false,
  } as unknown as AssistantAnswer;
  let asked = '';
  const r = await planCommand(
    {
      text: 'che terapie assume il paziente',
      channel: 'testo',
      currentPatientId: PID,
      operatorCtx,
    },
    {
      runRead: async (q) => {
        asked = q;
        return answer;
      },
    },
  );
  assert.ok(
    r.read,
    'la domanda deve raggiungere l’assistente (read popolato), non "Comando non riconosciuto"',
  );
  assert.equal(r.preview, null);
  assert.match(asked, /terapie/i);
});

test('#239 planCommand: non-command text (unknown) falls back to the assistant, never dead-ends as "Comando non riconosciuto"', async () => {
  const answer = {
    intent: 'unknown',
    results: [],
    sources: [],
    navigation: [],
    notFound: true,
    truncated: false,
  } as unknown as AssistantAnswer;
  let called = false;
  const r = await planCommand(
    { text: 'informazioni sul paziente', channel: 'testo', currentPatientId: PID, operatorCtx },
    {
      runRead: async () => {
        called = true;
        return answer;
      },
    },
  );
  assert.ok(called, 'testo non-comando deve essere delegato all’assistente');
  assert.ok(r.read !== null);
  assert.equal(r.preview, null);
});

// ── DELETE: refused at plan AND at execute, on every variant ────────────────

const DELETE_VARIANTS = [
  "cancella l'ultima nota",
  'rimuovi il parametro',
  'elimina il paziente',
  'togli la nota',
  'svuota il diario',
  'azzera i parametri di oggi',
  'distruggi la cartella',
  'butta via la nota di ieri',
  'deleta la nota',
  'cestina il documento',
];

test('planCommand: every delete variant → refusal pointing to the traditional UI', async () => {
  for (const text of DELETE_VARIANTS) {
    const r = await planCommand(
      { text, channel: 'testo', currentPatientId: PID, operatorCtx },
      noDb,
    );
    assert.equal(r.plan.actionType, 'refuse_forbidden', text);
    assert.equal(r.plan.refusalKind, 'delete', text);
    assert.equal(r.plan.requiresConfirmation, false, text);
    assert.match(r.preview?.refusal ?? '', /interfaccia tradizionale/i, text);
  }
});

test('executeCommand: delete variants are rejected even when confirmed — NO write happens', async () => {
  for (const text of DELETE_VARIANTS) {
    const { w, calls } = fakeWriter();
    await assert.rejects(
      () =>
        executeCommand(
          {
            text,
            channel: 'testo',
            patientId: PID,
            idempotencyKey: `k-${text}`,
            confirmed: true,
            operatorCtx,
          },
          execDeps(w),
        ),
      (e: unknown) =>
        e instanceof VoiceError && (e.kind === 'delete_forbidden' || e.kind === 'not_executable'),
      text,
    );
    assert.deepEqual(calls, [], `writer chiamato per: ${text}`);
  }
});

test('executeCommand: delete refusal uses the dedicated delete_forbidden kind', async () => {
  const { w } = fakeWriter();
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: 'elimina il paziente',
          channel: 'voce',
          patientId: PID,
          idempotencyKey: 'k-del',
          confirmed: true,
          operatorCtx,
        },
        execDeps(w),
      ),
    (e: unknown) =>
      e instanceof VoiceError &&
      e.kind === 'delete_forbidden' &&
      /interfaccia tradizionale/i.test(e.message),
  );
});

// ── ALLOWLIST at execute ────────────────────────────────────────────────────

test('executeCommand: action disabled via AI_DISABLED_ACTIONS → not_in_catalog, NO write', async () => {
  const { w, calls } = fakeWriter();
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: 'registra pressione 130 su 80 alle 9',
          channel: 'testo',
          patientId: PID,
          idempotencyKey: 'k-dis',
          confirmed: true,
          operatorCtx,
        },
        execDeps(w, { AI_DISABLED_ACTIONS: 'create_vital_sign' } as NodeJS.ProcessEnv),
      ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'not_in_catalog',
  );
  assert.deepEqual(calls, []);
});

// ── HAPPY PATH (channel testo) ──────────────────────────────────────────────

test('executeCommand testo: add_diary_note happy path writes once', async () => {
  const { w, calls } = fakeWriter();
  const r = await executeCommand(
    {
      text: 'aggiungi una nota al diario con paziente tranquillo',
      channel: 'testo',
      patientId: PID,
      idempotencyKey: 'k-diary',
      confirmed: true,
      operatorCtx,
    },
    execDeps(w),
  );
  assert.equal(r.ok, true);
  assert.equal(r.actionType, 'add_diary_note');
  assert.equal(r.recordId, 'rec-diary');
  assert.equal(r.deduped, false);
  assert.deepEqual(calls, ['diary']);
});

test('executeCommand testo: replayed idempotency key does not duplicate the write', async () => {
  const { w, calls } = fakeWriter();
  const deps = execDeps(w);
  const input = {
    text: 'aggiungi una nota al diario con paziente tranquillo',
    channel: 'testo' as const,
    patientId: PID,
    idempotencyKey: 'k-same',
    confirmed: true,
    operatorCtx,
  };
  const r1 = await executeCommand(input, deps);
  const r2 = await executeCommand(input, deps);
  assert.equal(r1.deduped, false);
  assert.equal(r2.deduped, true);
  assert.deepEqual(calls, ['diary']);
});

test('executeCommand: confirmation still mandatory on the text channel', async () => {
  const { w, calls } = fakeWriter();
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: 'registra pressione 130 su 80 alle 9',
          channel: 'testo',
          patientId: PID,
          idempotencyKey: 'k-noconf',
          confirmed: false,
          operatorCtx,
        },
        execDeps(w),
      ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'confirmation_required',
  );
  assert.deepEqual(calls, []);
});

// ── T018 (US2) — DEFENSE IN DEPTH ───────────────────────────────────────────

// (a) Planner level: EVERY Italian deletion verb, base form AND at least one inflection each,
// is refused with refusalKind 'delete' (T016 patterns).
const DELETE_LEXICAL_VARIANTS = [
  'elimina il parametro',
  'eliminare la nota di ieri',
  'cancella la nota',
  'sto cancellando il diario',
  'rimuovi il parametro',
  'rimuovere la pressione delle 9',
  'togli la nota dal diario',
  'togliere il parametro sbagliato',
  'svuota il diario',
  'svuotare la lista dei parametri',
  'azzera i parametri di oggi',
  'azzerare il diario',
  'distruggi la cartella',
  'distruggere le note vecchie',
  'butta via la nota di ieri',
  'buttare via i vecchi parametri',
  'deleta la nota',
  'deletare il record',
];

test('T018a planner: ogni variante lessicale di cancellazione (base + flessa) → refusalKind delete', async () => {
  for (const text of DELETE_LEXICAL_VARIANTS) {
    const r = await planCommand(
      { text, channel: 'testo', currentPatientId: PID, operatorCtx },
      noDb,
    );
    assert.equal(r.plan.actionType, 'refuse_forbidden', text);
    assert.equal(r.plan.refusalKind, 'delete', text);
    assert.equal(r.preview?.canExecute, false, text);
    assert.match(r.preview?.refusal ?? '', /interfaccia tradizionale/i, text);
  }
});

// (b) Executor level: an action whose kind is NOT create/update (read, unknown) is never executed.
test('T018b executor: kind non-write (read/unknown) → not_executable, writer mai chiamato', async () => {
  const nonWriteTexts = ['Quali sono gli ultimi parametri?', 'buongiorno a tutti'];
  for (const text of nonWriteTexts) {
    const { w, calls } = fakeWriter();
    await assert.rejects(
      () =>
        executeCommand(
          {
            text,
            channel: 'testo',
            patientId: PID,
            idempotencyKey: `k-nonwrite-${text}`,
            confirmed: true,
            operatorCtx,
          },
          execDeps(w),
        ),
      (e: unknown) => e instanceof VoiceError && e.kind === 'not_executable',
      text,
    );
    assert.deepEqual(calls, [], `writer chiamato per: ${text}`);
  }
});

// (c) Catalog level: NO entry has kind 'delete' (asserted on ALL entries, both the source map and
// the inspectable listing) and an invented action is refused as not_in_catalog.
test('T018c catalogo: nessuna entry delete su TUTTE le entry + azione inventata rifiutata', async () => {
  for (const e of Object.values(AGNOS_ACTION_CATALOG)) {
    assert.notEqual(e.kind as string, 'delete', `entry ${e.name} ha kind delete`);
    assert.ok(
      (['read', 'create', 'update'] as AgnosActionKind[]).includes(e.kind),
      `entry ${e.name}: kind ${e.kind}`,
    );
    assert.ok(!e.name.startsWith('delete'), `entry ${e.name} è un'azione di cancellazione`);
  }
  for (const listed of listCatalog(emptyEnv)) {
    assert.notEqual(listed.kind as string, 'delete', `listCatalog: ${listed.name}`);
  }
  // invented / out-of-catalog action: deny-by-default
  assert.equal(isActionAllowed('purge_everything', emptyEnv), false);
  assert.equal(isActionAllowed('delete_diary_note', emptyEnv), false);
});

// (d) Audit level: a delete attempt produces a persistent audit event with kind 'refusal'
// and actionType 'refused_delete' — captured via injected spy (no real DB).
test('T018d audit: tentativo delete → recordAuditEvent riceve kind refusal / refused_delete', async () => {
  const events: AiAuditEventInput[] = [];
  setAuditPersistence(async (evt) => {
    events.push(evt);
  });
  try {
    // plan-time refusal (typed channel)
    await planCommand(
      { text: 'cancella la nota', channel: 'testo', currentPatientId: PID, operatorCtx },
      noDb,
    );
    // execute-time refusal (voice channel), even when "confirmed"
    const { w } = fakeWriter();
    await assert.rejects(
      () =>
        executeCommand(
          {
            text: 'elimina il paziente',
            channel: 'voce',
            patientId: PID,
            idempotencyKey: 'k-audit-del',
            confirmed: true,
            operatorCtx,
          },
          execDeps(w),
        ),
      (e: unknown) => e instanceof VoiceError && e.kind === 'delete_forbidden',
    );

    const refusals = events.filter((e) => e.kind === 'refusal');
    assert.equal(refusals.length, 2, JSON.stringify(events));
    for (const evt of refusals) {
      assert.equal(evt.actionType, 'refused_delete');
      assert.equal(evt.outcome, 'denied');
      assert.equal(evt.operatorId, 'op1');
      assert.deepEqual(evt.fields, []); // PHI-safe: never values, and no field names on refusals
    }
    assert.equal(refusals[0].channel, 'testo');
    assert.equal(refusals[1].channel, 'voce');
  } finally {
    setAuditPersistence(null);
  }
});

// ── T027 (US4) — APPUNTAMENTI AGENDA VIA AGNOS ──────────────────────────────

import { matchAppointmentCommand } from '../actions/appointments.js';
import type { AppointmentLookupDeps } from '../actions/appointments.js';

const MORETTI = { id: 'pat-moretti', firstName: 'Elena', lastName: 'Moretti' };

/** Injected lookups: no DB. Overrides let each test simulate conflicts / missing targets. */
function apptLookup(overrides: Partial<AppointmentLookupDeps> = {}): AppointmentLookupDeps {
  return {
    searchPatients: async (q) => (/moretti/i.test(q) ? [MORETTI] : []),
    getPatient: async (id) =>
      id === PID ? { id: PID, firstName: 'Mario', lastName: 'Rossi' } : null,
    findConflict: async () => null,
    findAppointmentAt: async () => ({ id: 'apt-1', operatorId: 'op-agenda' }),
    ...overrides,
  };
}

test('T027 matcher: crea appuntamento — tipologia, data relativa, ora e paziente dal testo', () => {
  const p = matchAppointmentCommand(
    'crea appuntamento fisioterapia domani alle 10:30 per Moretti',
    {},
    { now: new Date('2026-07-04T08:00:00') },
  );
  assert.ok(p);
  assert.equal(p.actionType, 'create_appointment');
  assert.equal(p.fields.data, '2026-07-05');
  assert.equal(p.fields.ora, '10:30');
  assert.equal(p.fields.tipologia, 'fisioterapia');
  assert.equal(p.fields.patientQuery, 'Moretti');
  assert.deepEqual(p.ambiguities, []);
  assert.equal(p.requiresConfirmation, true);
});

test('T027 matcher: varianti data/ora — dopodomani, "il GG/MM", "alle 9 e 30"', () => {
  const now = new Date('2026-07-04T08:00:00');
  const p1 = matchAppointmentCommand(
    'fissa un appuntamento di controllo dopodomani alle ore 9 per Moretti',
    {},
    { now },
  );
  assert.ok(p1);
  assert.equal(p1.fields.data, '2026-07-06');
  assert.equal(p1.fields.ora, '09:00');
  assert.equal(p1.fields.tipologia, 'controllo');
  const p2 = matchAppointmentCommand(
    'prenota appuntamento il 12/08 alle 9 e 30 per Moretti',
    {},
    { now },
  );
  assert.ok(p2);
  assert.equal(p2.fields.data, '2026-08-12');
  assert.equal(p2.fields.ora, '09:30');
  assert.equal(p2.fields.tipologia, 'visita'); // nessuna tipologia esplicita → default
});

test('T027 matcher: data/ora mancanti e paziente assente = ambiguità bloccanti', () => {
  const p = matchAppointmentCommand('crea appuntamento fisioterapia', {}, {});
  assert.ok(p);
  assert.equal(p.actionType, 'create_appointment');
  assert.ok(p.ambiguities.some((a) => /data/i.test(a)));
  assert.ok(p.ambiguities.some((a) => /orario/i.test(a)));
  assert.ok(p.ambiguities.some((a) => /paziente/i.test(a)));
});

test('T027 matcher: sposta appuntamento — orario vecchio/nuovo, paziente dal contesto', () => {
  const p = matchAppointmentCommand(
    "sposta l'appuntamento delle 15 alle 16",
    { currentPatientId: PID },
    { now: new Date('2026-07-04T08:00:00') },
  );
  assert.ok(p);
  assert.equal(p.actionType, 'update_appointment');
  assert.equal(p.fields.oldTime, '15:00');
  assert.equal(p.fields.newTime, '16:00');
  assert.equal(p.fields.data, '2026-07-04'); // senza data esplicita = oggi
  assert.equal(p.patientId, PID);
  assert.deepEqual(p.ambiguities, []);
});

test('T027 matcher: comandi non-appuntamento NON vengono intercettati', () => {
  assert.equal(
    matchAppointmentCommand('registra pressione 130 su 80 alle 9', { currentPatientId: PID }),
    null,
  );
  assert.equal(
    matchAppointmentCommand('mostra gli appuntamenti di domani', { currentPatientId: PID }),
    null,
  );
  // "aggiorna la sezione anamnesi con: appuntamento cardiologo fissato" contiene "appuntament"
  // ma nessun verbo appuntamento in forma valida (fissato ≠ fissa/fissare) → non intercettato.
  assert.equal(
    matchAppointmentCommand('aggiorna la sezione anamnesi con: appuntamento cardiologo previsto', {
      currentPatientId: PID,
    }),
    null,
  );
});

test('T027 plan: crea appuntamento per Moretti → preview eseguibile con paziente risolto', async () => {
  const r = await planCommand(
    {
      text: 'crea appuntamento fisioterapia domani alle 10:30 per Moretti',
      channel: 'testo',
      operatorCtx,
    },
    { appointmentLookup: apptLookup() },
  );
  assert.equal(r.plan.actionType, 'create_appointment');
  assert.equal(r.plan.channel, 'testo');
  assert.equal(r.plan.patientId, MORETTI.id);
  assert.equal(r.read, null);
  assert.ok(r.preview);
  assert.equal(r.preview.title, 'Crea appuntamento');
  assert.equal(r.preview.canExecute, true);
  assert.match(r.preview.patientName ?? '', /Moretti/);
  assert.ok(r.preview.lines.some((l) => l.value === '10:30'));
});

test('T027 plan: conflitto slot → ambiguità BLOCCANTE in preview (conferma disabilitata)', async () => {
  const r = await planCommand(
    {
      text: 'crea appuntamento fisioterapia domani alle 10:30 per Moretti',
      channel: 'testo',
      operatorCtx,
    },
    { appointmentLookup: apptLookup({ findConflict: async () => ({ id: 'apt-busy' }) }) },
  );
  assert.equal(r.plan.actionType, 'create_appointment');
  assert.equal(r.preview?.canExecute, false);
  assert.ok(
    r.plan.ambiguities.some((a) => /conflitto slot/i.test(a)),
    r.plan.ambiguities.join(' | '),
  );
});

test('T027 plan: paziente non trovato / ambiguo → conferma disabilitata', async () => {
  const notFound = await planCommand(
    { text: 'crea appuntamento domani alle 10 per Sconosciuto', channel: 'testo', operatorCtx },
    { appointmentLookup: apptLookup() },
  );
  assert.equal(notFound.preview?.canExecute, false);
  assert.ok(notFound.plan.ambiguities.some((a) => /non trovato/i.test(a)));
  const multi = await planCommand(
    { text: 'crea appuntamento domani alle 10 per Moretti', channel: 'testo', operatorCtx },
    {
      appointmentLookup: apptLookup({
        searchPatients: async () => [
          MORETTI,
          { id: 'p2', firstName: 'Stefano', lastName: 'Moretti' },
        ],
      }),
    },
  );
  assert.equal(multi.preview?.canExecute, false);
  assert.ok(multi.plan.ambiguities.some((a) => /più pazienti/i.test(a)));
});

test('T027 plan: sposta appuntamento → target risolto e preview con orari', async () => {
  const r = await planCommand(
    {
      text: "sposta l'appuntamento delle 15 alle 16",
      channel: 'testo',
      currentPatientId: PID,
      operatorCtx,
    },
    { appointmentLookup: apptLookup() },
  );
  assert.equal(r.plan.actionType, 'update_appointment');
  assert.equal(r.plan.targetRecordId, 'apt-1');
  assert.equal(r.preview?.canExecute, true);
  assert.ok(r.preview?.lines.some((l) => l.label === 'Nuovo orario' && l.value === '16:00'));
});

test('T027 execute: crea appuntamento confermato → writer appuntamenti, idempotente al retry', async () => {
  const { w, calls } = fakeWriter();
  const deps = { ...execDeps(w), appointmentLookup: apptLookup() };
  const input = {
    text: 'crea appuntamento fisioterapia domani alle 10:30 per Moretti',
    channel: 'testo' as const,
    idempotencyKey: 'k-appt',
    confirmed: true,
    operatorCtx,
  };
  const r1 = await executeCommand(input, deps);
  assert.equal(r1.ok, true);
  assert.equal(r1.actionType, 'create_appointment');
  assert.equal(r1.recordId, 'rec-appt');
  const r2 = await executeCommand(input, deps);
  assert.equal(r2.deduped, true);
  assert.deepEqual(calls, ['appt-create']); // una sola scrittura
});

test('T027 execute: retry dopo scrittura — lo slot appena creato NON blocca il replay (deduped)', async () => {
  // Simula il mondo reale: dopo la prima esecuzione lo slot risulta occupato (dall'appuntamento
  // appena creato). Il replay con la STESSA idempotencyKey deve restituire deduped, non conflitto.
  const { w, calls } = fakeWriter();
  let written = false;
  const deps = {
    ...execDeps(w),
    appointmentLookup: apptLookup({
      findConflict: async () => (written ? { id: 'rec-appt' } : null),
    }),
  };
  const input = {
    text: 'crea appuntamento fisioterapia domani alle 10:30 per Moretti',
    channel: 'testo' as const,
    idempotencyKey: 'k-appt-replay',
    confirmed: true,
    operatorCtx,
  };
  const r1 = await executeCommand(input, deps);
  written = true;
  assert.equal(r1.ok, true);
  const r2 = await executeCommand(input, deps);
  assert.equal(r2.ok, true);
  assert.equal(r2.deduped, true);
  assert.deepEqual(calls, ['appt-create']);
});

test('T027 execute: conflitto slot rilevato al re-grounding → ambiguous, writer MAI chiamato', async () => {
  const { w, calls } = fakeWriter();
  const deps = {
    ...execDeps(w),
    appointmentLookup: apptLookup({ findConflict: async () => ({ id: 'apt-busy' }) }),
  };
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: 'crea appuntamento fisioterapia domani alle 10:30 per Moretti',
          channel: 'testo',
          idempotencyKey: 'k-appt-conf',
          confirmed: true,
          operatorCtx,
        },
        deps,
      ),
    (e: unknown) =>
      e instanceof VoiceError && e.kind === 'ambiguous' && /conflitto slot/i.test(e.message),
  );
  assert.deepEqual(calls, []);
});

test('T027: "modifica la terapia di Rossi" → rifiuto entità vietata (non delete)', async () => {
  const r = await planCommand(
    { text: 'modifica la terapia di Rossi', channel: 'testo', currentPatientId: PID, operatorCtx },
    noDb,
  );
  assert.equal(r.plan.actionType, 'refuse_forbidden');
  assert.notEqual(r.plan.refusalKind, 'delete');
  assert.match(r.preview?.refusal ?? '', /terapie/i);
});

test('T027: "cancella l\'appuntamento delle 15" → refusalKind delete su plan ED execute', async () => {
  const r = await planCommand(
    {
      text: "cancella l'appuntamento delle 15",
      channel: 'testo',
      currentPatientId: PID,
      operatorCtx,
    },
    noDb,
  );
  assert.equal(r.plan.actionType, 'refuse_forbidden');
  assert.equal(r.plan.refusalKind, 'delete');
  assert.match(r.preview?.refusal ?? '', /interfaccia tradizionale/i);

  const { w, calls } = fakeWriter();
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: "elimina l'appuntamento delle 15",
          channel: 'voce',
          idempotencyKey: 'k-appt-del',
          confirmed: true,
          operatorCtx,
        },
        { ...execDeps(w), appointmentLookup: apptLookup() },
      ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'delete_forbidden',
  );
  assert.deepEqual(calls, []);
});

test('T027 catalogo: create/update_appointment presenti, NESSUNA azione delete_appointment', () => {
  assert.equal(AGNOS_ACTION_CATALOG.create_appointment?.kind, 'create');
  assert.equal(AGNOS_ACTION_CATALOG.create_appointment?.entity, 'appointment');
  assert.equal(AGNOS_ACTION_CATALOG.update_appointment?.kind, 'update');
  assert.equal(AGNOS_ACTION_CATALOG.update_appointment?.entity, 'appointment');
  assert.equal(
    AGNOS_ACTION_CATALOG['delete_appointment' as keyof typeof AGNOS_ACTION_CATALOG],
    undefined,
  );
  assert.equal(isActionAllowed('delete_appointment', emptyEnv), false);
  // il catalogo resta CRU-only anche dopo l'estensione
  for (const e of listCatalog(emptyEnv)) assert.notEqual(e.kind as string, 'delete', e.name);
});

test('T027 isolamento delete: nessun modulo sotto src/ai importa uiOnlyDeleteAppointment', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const aiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  async function* walk(dir: string): AsyncGenerator<string> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(full);
      else if (entry.name.endsWith('.ts')) yield full;
    }
  }
  for await (const file of walk(aiRoot)) {
    if (file.endsWith('actions.test.ts')) continue; // questo file cita il nome solo nel test
    const src = await readFile(file, 'utf8');
    assert.ok(
      !src.includes('uiOnlyDeleteAppointment'),
      `delete UI-only importato da modulo AI: ${file}`,
    );
  }
});

// ── ISSUE #130 — CONSEGNE VIA AGNOS (voce+chat) ─────────────────────────────

import { matchConsegnaCommand } from '../actions/consegne.js';
import type { ConsegnaLookupDeps } from '../actions/consegne.js';

/** Injected lookups: no DB. */
function consegnaLookup(overrides: Partial<ConsegnaLookupDeps> = {}): ConsegnaLookupDeps {
  return {
    searchPatients: async (q) => (/moretti/i.test(q) ? [MORETTI] : []),
    getPatient: async (id) =>
      id === PID ? { id: PID, firstName: 'Mario', lastName: 'Rossi' } : null,
    ...overrides,
  };
}

test('I130 matcher: consegna con paziente e testo dal comando', () => {
  const p = matchConsegnaCommand(
    'Aggiungi una consegna per Elena Moretti: controllare la pressione dopo cena',
  );
  assert.ok(p);
  assert.equal(p.actionType, 'create_consegna');
  assert.equal(p.fields.patientQuery, 'Elena Moretti');
  assert.equal(p.fields.note, 'controllare la pressione dopo cena');
  assert.deepEqual(p.ambiguities, []);
  assert.equal(p.requiresConfirmation, true);
});

test('I130 matcher: varianti verbo e variante "consegna per X …" senza verbo', () => {
  const p1 = matchConsegnaCommand('crea una consegna per Moretti: misurare la glicemia');
  assert.ok(p1);
  assert.equal(p1.fields.note, 'misurare la glicemia');
  const p2 = matchConsegnaCommand('scrivi la consegna per Elena Moretti, controllare medicazione');
  assert.ok(p2);
  assert.equal(p2.fields.patientQuery, 'Elena Moretti');
  assert.equal(p2.fields.note, 'controllare medicazione');
  const p3 = matchConsegnaCommand('consegna per Moretti: idratazione ogni 2 ore');
  assert.ok(p3);
  assert.equal(p3.fields.patientQuery, 'Moretti');
  assert.equal(p3.fields.note, 'idratazione ogni 2 ore');
});

test('I130 matcher: paziente dal contesto quando non indicato nel testo', () => {
  const p = matchConsegnaCommand('aggiungi una consegna: controllare la ferita', {
    currentPatientId: PID,
  });
  assert.ok(p);
  assert.equal(p.patientId, PID);
  assert.equal(p.fields.note, 'controllare la ferita');
  assert.deepEqual(p.ambiguities, []);
});

test('I130 matcher: testo vuoto e paziente assente = ambiguità bloccanti', () => {
  const noText = matchConsegnaCommand('aggiungi una consegna per Elena Moretti');
  assert.ok(noText);
  assert.ok(noText.ambiguities.some((a) => /testo della consegna/i.test(a)));
  const noPatient = matchConsegnaCommand('aggiungi una consegna: controllare la pressione', {});
  assert.ok(noPatient);
  assert.ok(noPatient.ambiguities.some((a) => /paziente non identificato/i.test(a)));
});

test('I130 matcher: comandi non-consegna NON vengono intercettati', () => {
  assert.equal(
    matchConsegnaCommand('registra pressione 130 su 80 alle 9', { currentPatientId: PID }),
    null,
  );
  assert.equal(matchConsegnaCommand('mostra le consegne di oggi', { currentPatientId: PID }), null);
  // il payload di una nota diario che cita "consegna" non è un comando consegna
  assert.equal(
    matchConsegnaCommand('aggiungi una nota al diario con ha ricevuto la consegna dei documenti', {
      currentPatientId: PID,
    }),
    null,
  );
});

test('I130 plan: consegna per Moretti → preview eseguibile con paziente risolto', async () => {
  const r = await planCommand(
    {
      text: 'Aggiungi una consegna per Elena Moretti: controllare la pressione dopo cena',
      channel: 'voce',
      operatorCtx,
    },
    { consegnaLookup: consegnaLookup() },
  );
  assert.equal(r.plan.actionType, 'create_consegna');
  assert.equal(r.plan.channel, 'voce');
  assert.equal(r.plan.patientId, MORETTI.id);
  assert.equal(r.read, null);
  assert.ok(r.preview);
  assert.equal(r.preview.title, 'Aggiungi consegna');
  assert.equal(r.preview.canExecute, true);
  assert.match(r.preview.patientName ?? '', /Moretti/);
  assert.ok(
    r.preview.lines.some((l) => l.label === 'Testo' && /pressione dopo cena/.test(l.value)),
  );
});

test('I130 plan: paziente non trovato → conferma disabilitata', async () => {
  const r = await planCommand(
    {
      text: 'aggiungi una consegna per Sconosciuto: controllare qualcosa',
      channel: 'testo',
      operatorCtx,
    },
    { consegnaLookup: consegnaLookup() },
  );
  assert.equal(r.preview?.canExecute, false);
  assert.ok(r.plan.ambiguities.some((a) => /non trovato/i.test(a)));
});

test('I130 execute: consegna confermata → writer consegne, idempotente al retry', async () => {
  const { w, calls } = fakeWriter();
  const deps = { ...execDeps(w), consegnaLookup: consegnaLookup() };
  const input = {
    text: 'Aggiungi una consegna per Elena Moretti: controllare la pressione dopo cena',
    channel: 'voce' as const,
    idempotencyKey: 'k-consegna',
    confirmed: true,
    operatorCtx,
  };
  const r1 = await executeCommand(input, deps);
  assert.equal(r1.ok, true);
  assert.equal(r1.actionType, 'create_consegna');
  assert.equal(r1.recordId, 'rec-consegna');
  const r2 = await executeCommand(input, deps);
  assert.equal(r2.deduped, true);
  assert.deepEqual(calls, ['consegna']); // una sola scrittura
});

test('I130 execute: senza conferma → confirmation_required, writer MAI chiamato', async () => {
  // paziente dal contesto: il grounding (lookup per nome) avviene solo a comando confermato,
  // ma la conferma resta comunque obbligatoria PRIMA di qualsiasi scrittura (AC5).
  const { w, calls } = fakeWriter();
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: 'aggiungi una consegna: controllare la pressione',
          channel: 'voce',
          patientId: PID,
          idempotencyKey: 'k-consegna-noconf',
          confirmed: false,
          operatorCtx,
        },
        { ...execDeps(w), consegnaLookup: consegnaLookup() },
      ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'confirmation_required',
  );
  assert.deepEqual(calls, []);
});

test('I130: "cancella la consegna" → refusalKind delete su plan ED execute', async () => {
  const r = await planCommand(
    {
      text: 'cancella la consegna di Elena Moretti',
      channel: 'testo',
      currentPatientId: PID,
      operatorCtx,
    },
    noDb,
  );
  assert.equal(r.plan.actionType, 'refuse_forbidden');
  assert.equal(r.plan.refusalKind, 'delete');
  assert.match(r.preview?.refusal ?? '', /interfaccia tradizionale/i);

  const { w, calls } = fakeWriter();
  await assert.rejects(
    () =>
      executeCommand(
        {
          text: 'elimina la consegna di Elena Moretti',
          channel: 'voce',
          idempotencyKey: 'k-consegna-del',
          confirmed: true,
          operatorCtx,
        },
        { ...execDeps(w), consegnaLookup: consegnaLookup() },
      ),
    (e: unknown) => e instanceof VoiceError && e.kind === 'delete_forbidden',
  );
  assert.deepEqual(calls, []);
});

test('I130 catalogo: create_consegna presente, NESSUNA azione delete_consegna, catalogo CRU-only', () => {
  assert.equal(AGNOS_ACTION_CATALOG.create_consegna?.kind, 'create');
  assert.equal(AGNOS_ACTION_CATALOG.create_consegna?.entity, 'consegna');
  assert.equal(
    AGNOS_ACTION_CATALOG['delete_consegna' as keyof typeof AGNOS_ACTION_CATALOG],
    undefined,
  );
  assert.equal(isActionAllowed('delete_consegna', emptyEnv), false);
  for (const e of listCatalog(emptyEnv)) assert.notEqual(e.kind as string, 'delete', e.name);
});

test('I130 diario: la frase esatta della issue («Scrivi nel diario di …: …») → add_diary_note', async () => {
  const r = await planCommand(
    {
      text: 'Scrivi nel diario di Elena Moretti: paziente tranquillo, nessun dolore riferito',
      channel: 'voce',
      currentPatientId: PID,
      operatorCtx,
    },
    noDb,
  );
  assert.equal(r.plan.actionType, 'add_diary_note');
  assert.equal(r.plan.patientId, PID); // paziente dal contesto corrente
  assert.equal(r.plan.fields.content, 'paziente tranquillo, nessun dolore riferito');
  assert.deepEqual(r.plan.ambiguities, []);
  assert.equal(r.preview?.canExecute, true);
});
