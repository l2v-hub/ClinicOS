// Issue #202 (Comandi vocali — Privacy voice logging). Regression proof that the VOICE path never
// leaks the transcript or spoken clinical values into logs or the persistent audit trail.
//
// AC1: no full transcript is logged.
// AC2: audit stores minimal metadata only (field NAMES, never values/transcript).
// AC3: this privacy test verifies the sanitized logs by capturing real console output + persisted events.
//
// DB-free: same injection pattern as actions.test.ts (fake writer, injected IdempotencyStore,
// setAuditPersistence spy). The test drives real orchestrate flows (confirmed create, delete refusal,
// free-text diary note) and inspects everything that was actually emitted.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCommand, executeCommand, type AgnosOperatorContext } from '../actions/orchestrate.js';
import { VoiceError, type VoiceWriter } from '../voice/execute.js';
import { IdempotencyStore } from '../voice/idempotency.js';
import { loadVoiceConfig } from '../voice/config.js';
import { setAuditPersistence, type AiAuditEventInput } from '../audit-store.js';
import type { UserContext } from '../gateway/types.js';

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

/** Capture everything written to stdout/stderr while `fn` runs; always restores the originals. */
async function captureLogs(fn: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const push = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  };
  const orig = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };
  console.log = push;
  console.error = push;
  console.warn = push;
  console.info = push;
  console.debug = push;
  try {
    await fn();
  } finally {
    console.log = orig.log;
    console.error = orig.error;
    console.warn = orig.warn;
    console.info = orig.info;
    console.debug = orig.debug;
  }
  return lines;
}

const ALLOWED_AUDIT_KEYS = new Set([
  'requestId',
  'userId',
  'patientId',
  'actionType',
  'recordId',
  'fields',
  'source',
  'channel',
  'outcome',
  'at',
]);

/** Parse the JSON payload of every `[ai-voice] {...}` audit line captured. */
function parseVoiceAuditLines(lines: string[]): Array<Record<string, unknown>> {
  return lines
    .filter((l) => l.includes('[ai-voice]'))
    .map((l) => JSON.parse(l.slice(l.indexOf('{'))) as Record<string, unknown>);
}

// ── AC1 + AC2: confirmed create (vital) never logs the transcript or spoken values ──────────────

test('#202 AC1/AC2: confirmed create — transcript & audit are sanitized; audit keys are minimal', async () => {
  const TRANSCRIPT = 'registra pressione 137 su 82 alle 9';
  const persisted: AiAuditEventInput[] = [];
  setAuditPersistence(async (evt) => {
    persisted.push(evt);
  });
  const { w, calls } = fakeWriter();
  try {
    const lines = await captureLogs(async () => {
      const r = await executeCommand(
        {
          text: TRANSCRIPT,
          channel: 'voce',
          patientId: PID,
          idempotencyKey: 'k-202-vital',
          confirmed: true,
          operatorCtx,
        },
        execDeps(w),
      );
      assert.equal(r.ok, true);
      assert.equal(r.actionType, 'create_vital_sign');
    });
    assert.deepEqual(calls, ['vital'], 'la scrittura deve avvenire (flusso reale, non un no-op)');

    const all = lines.join('\n');
    // AC1: the full transcript must never appear in any captured log line.
    assert.ok(!all.includes(TRANSCRIPT), `trascrizione trovata nei log: ${all}`);

    // AC3: an audit line was actually emitted, so the assertions above are meaningful.
    const audits = parseVoiceAuditLines(lines);
    assert.equal(audits.length, 1, `attesa 1 riga [ai-voice], trovate ${audits.length}: ${all}`);
    const entry = audits[0];

    // AC2: only the minimal metadata keys, and `fields` are NAMES (no whitespace / no transcript).
    for (const k of Object.keys(entry))
      assert.ok(ALLOWED_AUDIT_KEYS.has(k), `chiave audit non consentita: ${k}`);
    assert.equal(entry.source, 'VOICE');
    assert.equal(entry.channel, 'VOCE');
    assert.equal(entry.outcome, 'ok');
    assert.ok(Array.isArray(entry.fields));
    for (const f of entry.fields as unknown[]) {
      assert.equal(typeof f, 'string');
      assert.ok(
        !/\s/.test(f as string),
        `un field name non deve contenere spazi (sospetto valore): ${f}`,
      );
      assert.ok(
        !(f as string).includes('137') && !(f as string).includes('82'),
        `un field name non deve contenere un valore vitale: ${f}`,
      );
    }

    // AC1 (persistence): the persisted event carries no transcript and no spoken values.
    assert.equal(persisted.length, 1);
    const evtStr = JSON.stringify(persisted[0]);
    assert.ok(!evtStr.includes(TRANSCRIPT), "trascrizione presente nell'evento persistito");
    assert.deepEqual(
      persisted[0].fields.filter((f) => /\s/.test(f)),
      [],
      'nessun field persistito deve contenere spazi',
    );
  } finally {
    setAuditPersistence(null);
  }
});

// ── AC1 + AC2: free-text diary note — the note CONTENT (PHI) never reaches the logs ──────────────

test('#202 AC1/AC2: free-text diary note content never appears in logs or persisted audit', async () => {
  // Distinctive alphabetic sentinels that cannot collide with ids/timestamps.
  const SENTINEL = 'mariazzrossi anticoagulantexyz warfarinzz999';
  const TRANSCRIPT = `aggiungi una nota al diario con ${SENTINEL}`;
  const persisted: AiAuditEventInput[] = [];
  setAuditPersistence(async (evt) => {
    persisted.push(evt);
  });
  const { w, calls } = fakeWriter();
  try {
    const lines = await captureLogs(async () => {
      const r = await executeCommand(
        {
          text: TRANSCRIPT,
          channel: 'voce',
          patientId: PID,
          idempotencyKey: 'k-202-diary',
          confirmed: true,
          operatorCtx,
        },
        execDeps(w),
      );
      assert.equal(r.ok, true);
      assert.equal(r.actionType, 'add_diary_note');
    });
    assert.deepEqual(calls, ['diary']);

    const all = lines.join('\n');
    // AC1: neither the full transcript nor any distinctive PHI token from the note content is logged.
    assert.ok(!all.includes(TRANSCRIPT), 'trascrizione diario nei log');
    for (const token of ['mariazzrossi', 'anticoagulantexyz', 'warfarinzz999']) {
      assert.ok(!all.toLowerCase().includes(token), `token PHI "${token}" trovato nei log: ${all}`);
    }

    // AC1 (persistence): same guarantee for the persisted event.
    const evtStr = JSON.stringify(persisted).toLowerCase();
    for (const token of ['mariazzrossi', 'anticoagulantexyz', 'warfarinzz999']) {
      assert.ok(!evtStr.includes(token), `token PHI "${token}" nell'evento persistito`);
    }
  } finally {
    setAuditPersistence(null);
  }
});

// ── AC1: a refused delete on the voice channel logs no transcript, and audit fields stay empty ───

test('#202 AC1/AC2: refused delete (voice) — no transcript logged, audit fields empty', async () => {
  const TRANSCRIPT = 'elimina la cartella di mariazzrossi';
  const persisted: AiAuditEventInput[] = [];
  setAuditPersistence(async (evt) => {
    persisted.push(evt);
  });
  const { w, calls } = fakeWriter();
  try {
    const lines = await captureLogs(async () => {
      await assert.rejects(
        () =>
          executeCommand(
            {
              text: TRANSCRIPT,
              channel: 'voce',
              patientId: PID,
              idempotencyKey: 'k-202-del',
              confirmed: true,
              operatorCtx,
            },
            execDeps(w),
          ),
        (e: unknown) => e instanceof VoiceError && e.kind === 'delete_forbidden',
      );
    });
    assert.deepEqual(calls, [], 'nessuna scrittura su rifiuto');

    const all = lines.join('\n').toLowerCase();
    assert.ok(!all.includes(TRANSCRIPT.toLowerCase()), 'trascrizione delete nei log');
    assert.ok(!all.includes('mariazzrossi'), 'nome paziente nei log di rifiuto');

    // The refusal is audited PHI-safe: kind refusal, empty fields, no transcript.
    const refusals = persisted.filter((e) => e.kind === 'refusal');
    assert.ok(refusals.length >= 1);
    for (const evt of refusals) {
      assert.deepEqual(evt.fields, [], 'i rifiuti non devono avere field names');
      assert.ok(
        !JSON.stringify(evt).toLowerCase().includes('mariazzrossi'),
        "PHI nell'evento di rifiuto",
      );
    }
  } finally {
    setAuditPersistence(null);
  }
});

// ── Plan-time is silent too: planning a delete must not emit the transcript ──────────────────────

test('#202 AC1: plan-time delete refusal emits no transcript', async () => {
  const TRANSCRIPT = 'cancella la nota di mariazzrossi warfarinzz999';
  const lines = await captureLogs(async () => {
    const r = await planCommand(
      { text: TRANSCRIPT, channel: 'voce', currentPatientId: PID, operatorCtx },
      { loadPreviewContext: async () => ({}) },
    );
    assert.equal(r.plan.actionType, 'refuse_forbidden');
  });
  const all = lines.join('\n').toLowerCase();
  assert.ok(!all.includes('warfarinzz999'), `token PHI nei log di plan: ${all}`);
  assert.ok(!all.includes(TRANSCRIPT.toLowerCase()), 'trascrizione nei log di plan');
});
