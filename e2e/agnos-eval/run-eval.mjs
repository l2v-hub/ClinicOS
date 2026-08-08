#!/usr/bin/env node
// Agnos eval harness — valuta la banca di domande golden contro il contratto REALE del
// planner (POST /ai/actions/plan), non contro il testo della risposta.
//
//   node e2e/agnos-eval/run-eval.mjs [outDir] [--include-pending] [--only <id|capability>]
//
// Assume il backend su :3001 con dati (seed o DB reale). NON serve il frontend ne' Playwright:
// tutto cio' che viene asserito (intent, tool scelti, campi dei risultati, azioni di navigazione,
// rifiuti) e' contratto server-side. Le evidenze UI restano compito di e2e/agnos-cru.mjs e
// e2e/agnos-llm-reads.mjs, che questo script NON sostituisce.
//
// Perche' data-driven: aggiungere una domanda deve costare una voce JSON, non uno scenario
// Playwright scritto a mano — l'approccio attuale non scala oltre una manciata di casi.
//
// Output: report.json con verdetto per domanda, checks falliti e latenza per modalita'.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = process.env.CLINICOS_BACKEND ?? 'http://localhost:3001';
const BANK_PATH = process.env.CLINICOS_EVAL_BANK ?? join(HERE, 'golden-questions.json');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
const OUT = resolve(argv.find((a) => !a.startsWith('--') && a !== ONLY) ?? 'artifacts/agnos-eval');
mkdirSync(OUT, { recursive: true });

const bank = JSON.parse(readFileSync(BANK_PATH, 'utf8'));
const DEFAULTS = bank.defaults ?? {};

// Il backend usa DUE derivazioni del "giorno" e la banca deve ricalcolare con la stessa:
//  - dayKey() (terapie, scadenza consegne) e' UTC: new Date().toISOString().slice(0,10)
//  - appointmentsToday() e' la finestra del giorno LOCALE
// (Divergenza reale del backend: fra la mezzanotte locale e quella UTC le due non coincidono.)
const todayISO = () => new Date().toISOString().slice(0, 10);
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const minutesNow = () => new Date().getHours() * 60 + new Date().getMinutes();
const minutesOf = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

async function getJson(path, headers = {}) {
  const res = await fetch(`${BACKEND}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

// ── Baselines: conteggi ricalcolati direttamente dai dati, indipendenti da Agnos ──────────
// Sono il cuore dello scoring per gli aggregati: un numero e' giusto o sbagliato, non serve
// un giudice semantico. Il ricalcolo delle terapie in ritardo replica ESATTAMENTE
// frontend/src/components/operator/cartella/useRiepilogoSomministrazioni.ts — se le due logiche
// divergono, il ricalcolo qui e' la definizione di riferimento e la differenza e' un bug.
async function computeBaselines() {
  const b = {};
  const soft = async (name, fn) => {
    try {
      b[name] = await fn();
    } catch (e) {
      b[name] = null;
      b[`${name}__error`] = e instanceof Error ? e.message : String(e);
    }
  };

  await soft('__occupancy', () => getJson('/admin/rooms/occupancy'));
  b.totalBeds = b.__occupancy?.totalBeds ?? null;
  b.occupiedBeds = b.__occupancy?.occupiedBeds ?? null;
  b.freeBeds = b.__occupancy?.freeBeds ?? null;
  b.occupancyPct = b.__occupancy?.occupancyPct ?? null;
  delete b.__occupancy;

  await soft('therapiesOverdue', async () => {
    const slots = await getJson(`/therapy-slots?date=${todayISO()}`);
    const soglia = minutesNow();
    let inRitardo = 0;
    for (const slot of slots ?? [])
      for (const p of slot.patients ?? [])
        for (const a of p.administrations ?? []) {
          if (a.status === 'administered' || a.status === 'not_administered') continue;
          const m = minutesOf(a.scheduledTime);
          if (!Number.isNaN(m) && m < soglia) inRitardo++;
        }
    return inRitardo;
  });

  await soft('consegneOverdue', async () => {
    const rows = await getJson('/consegne');
    const oggi = todayISO();
    const soglia = minutesNow();
    return (rows ?? []).filter((c) => {
      if (c.stato === 'completata') return false;
      if (String(c.scadenza) < oggi) return true;
      if (String(c.scadenza) !== oggi) return false;
      const m = minutesOf(c.oraScadenza);
      return !Number.isNaN(m) && m < soglia;
    }).length;
  });

  await soft(
    'appointmentsToday',
    async () => ((await getJson(`/appointments?date=${todayLocal()}`)) ?? []).length,
  );
  await soft('staffCount', async () => ((await getJson('/operators')) ?? []).length);
  await soft('__patients', () => getJson('/patients'));
  b.__patientIds = new Set(((b.__patients ?? []) || []).map((p) => p.id));
  b.patientCount = b.__patientIds.size;
  delete b.__patients;
  return b;
}

// ── Asserzioni strutturali ────────────────────────────────────────────────────────────────
// Nessun matching sul testo libero della risposta: l'LLM riformula, il contratto no.

const rowsOf = (read) => (Array.isArray(read?.results) ? read.results : []);
const asObj = (r) => (r && typeof r === 'object' ? r : {});

// I risultati aggregati (istantanea, coda operatore) sono UNA riga con array annidati: le
// asserzioni devono poter puntare dentro la struttura, non solo al primo livello.
function pick(obj, path) {
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), obj);
}

/** Cerca una chiave a QUALSIASI profondita': serve per i campi che non devono comparire mai. */
function deepHasKey(value, key, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return false;
  if (!Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value).some((v) => deepHasKey(v, key, depth + 1));
}

function checkResults(add, exp, read) {
  const rows = rowsOf(read);
  if (exp.minCount !== undefined)
    add('results.minCount', rows.length >= exp.minCount, `${rows.length} >= ${exp.minCount}`);
  if (exp.maxCount !== undefined)
    add('results.maxCount', rows.length <= exp.maxCount, `${rows.length} <= ${exp.maxCount}`);
  const targets = exp.fieldsOn === 'each' ? rows : rows.slice(0, 1);
  for (const f of exp.requiredFields ?? []) {
    const missing = targets.filter((r) => pick(asObj(r), f) === undefined).length;
    add(
      `results.field:${f}`,
      targets.length > 0 && missing === 0,
      targets.length === 0 ? 'nessuna riga da ispezionare' : `${missing} righe senza il campo`,
    );
  }
  for (const spec of exp.arrayFields ?? []) {
    const arr = pick(asObj(rows[0]), spec.path);
    if (!Array.isArray(arr)) {
      add(`results.array:${spec.path}`, false, `${spec.path} non e' un array`);
      continue;
    }
    if (spec.minCount !== undefined)
      add(`results.array:${spec.path}.minCount`, arr.length >= spec.minCount, `${arr.length} voci`);
    for (const f of spec.fields ?? []) {
      const missing = arr.filter((r) => pick(asObj(r), f) === undefined).length;
      // Un array vuoto non prova nulla ma non e' un errore: il check resta verde e lo dichiara.
      add(
        `results.array:${spec.path}.${f}`,
        missing === 0,
        arr.length === 0 ? 'array vuoto (nulla da ispezionare)' : `${missing} voci senza ${f}`,
      );
    }
  }
  for (const f of exp.forbiddenFields ?? []) {
    const leaked = rows.filter((r) => asObj(r)[f] !== undefined).length;
    add(`results.noLeak:${f}`, leaked === 0, leaked ? `${leaked} righe espongono ${f}` : '');
  }
  for (const f of exp.forbiddenFieldsDeep ?? []) {
    const leaked = rows.filter((r) => deepHasKey(r, f)).length;
    add(
      `results.noLeakDeep:${f}`,
      leaked === 0,
      leaked ? `${leaked} righe espongono ${f} (anche annidato)` : '',
    );
  }
}

function checkNavigation(add, exp, read, baselines) {
  const nav = Array.isArray(read?.navigation) ? read.navigation : [];
  if (exp.minCount !== undefined)
    add('nav.minCount', nav.length >= exp.minCount, `${nav.length} azioni`);
  if (exp.maxCount !== undefined)
    add('nav.maxCount', nav.length <= exp.maxCount, `${nav.length} azioni`);
  if (exp.allowedTypes) {
    const bad = nav.filter((n) => !exp.allowedTypes.includes(n.type)).map((n) => n.type);
    add('nav.allowedTypes', bad.length === 0, bad.join(','));
  }
  if (exp.patientIdsFromFixture) {
    const unknown = nav
      .map((n) => n.patientId)
      .filter((id) => id && !baselines.__patientIds.has(id));
    add(
      'nav.patientIdEsistente',
      unknown.length === 0,
      unknown.length ? `id inesistenti: ${unknown.join(',')}` : '',
    );
  }
  if (exp.forbidEmptyPatientId) {
    // patientId presente ma vuoto = azione che non porta da nessuna parte.
    const vuoti = nav.filter((n) => n.patientId === '');
    add(
      'nav.patientIdNonVuoto',
      vuoti.length === 0,
      vuoti.length ? `azioni con patientId vuoto: ${vuoti.map((n) => n.type).join(',')}` : '',
    );
  }
}

function checkGrounding(add, exp, read) {
  const rows = rowsOf(read);
  if (exp.noInventionWhenEmpty && rows.length === 0) {
    add(
      'grounding.zeroDatiZeroProsa',
      read?.composed !== true && !read?.answerText,
      read?.answerText ? `prosa senza dati: ${String(read.answerText).slice(0, 80)}` : '',
    );
  }
  if (exp.prosaRequiresSources && read?.composed === true) {
    // Limite noto: il contratto sul filo non espone `citedSources` (il composer le consuma
    // server-side, vedi composer.test.ts). Qui si verifica solo che la prosa poggi su fonti;
    // la membership citazione⊆fonti resta coperta dal test unitario.
    add(
      'grounding.prosaConFonti',
      (read.sources?.length ?? 0) > 0,
      `${read.sources?.length} fonti`,
    );
  }
}

/** Valuta l'espressione di un crossCheck su una risposta: `__resultCount`, un percorso puntato
 *  (`occupancy.occupancyPct`, `consegneOverdue.length`) o una somma di percorsi (`a+b`). */
function fieldValue(expr, read) {
  if (expr === '__resultCount') return rowsOf(read).length;
  const row = asObj(rowsOf(read)[0]);
  const parts = String(expr).split('+');
  if (parts.length === 1) return pick(row, parts[0].trim());
  let sum = 0;
  for (const p of parts) {
    const v = pick(row, p.trim());
    if (typeof v !== 'number') return undefined;
    sum += v;
  }
  return sum;
}

function checkCrossChecks(add, list, read, baselines, answers) {
  for (const cc of list ?? []) {
    const actual = fieldValue(cc.field, read);
    let expected;
    if (cc.equals !== undefined) {
      expected = cc.equals;
    } else if (String(cc.baseline).startsWith('__sameAs:')) {
      // Confronto fra due domande: STESSA espressione, risposta di riferimento diversa.
      const ref = String(cc.baseline).slice('__sameAs:'.length);
      const other = answers.get(ref);
      if (other === undefined) {
        add(`crossCheck.${cc.field}`, false, `riferimento ${ref} non eseguito`);
        continue;
      }
      expected = fieldValue(cc.field, other);
    } else {
      expected = baselines[cc.baseline];
    }
    if (expected === null || expected === undefined) {
      add(
        `crossCheck.${cc.field}`,
        false,
        `riferimento ${cc.baseline ?? cc.equals} non disponibile`,
      );
      continue;
    }
    add(`crossCheck.${cc.field}`, actual === expected, `atteso ${expected}, ottenuto ${actual}`);
  }
}

function evaluate(q, body, baselines, answers) {
  const checks = [];
  const add = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });
  const exp = q.expect ?? {};
  const read = body?.read ?? null;
  const refusalText = read?.refusal ?? body?.preview?.refusal ?? body?.plan?.refusalReason ?? '';

  if (exp.planActionType !== undefined)
    add(
      'plan.actionType',
      body?.plan?.actionType === exp.planActionType,
      `${body?.plan?.actionType}`,
    );

  if (exp.answerable === false) {
    const rows = rowsOf(read);
    // Un rifiuto puo' essere esplicito (testo) oppure silenzioso (nessun intent-dati prodotto,
    // come per un saluto): entrambi vanno bene, purche' NON arrivino dati.
    const silent = exp.allowSilentRefusal && (!read || read.intent === 'unknown');
    add(
      'permission.nonRisponde',
      (!!refusalText || silent) && rows.length === 0,
      `refusal="${String(refusalText).slice(0, 60)}" righe=${rows.length}`,
    );
    if (exp.refusalMatches && !silent)
      add(
        'permission.motivoRifiuto',
        new RegExp(exp.refusalMatches, 'i').test(String(refusalText)),
        String(refusalText).slice(0, 80),
      );
  } else {
    add('read.presente', !!read, read ? '' : 'body.read assente (piano di scrittura o rifiuto)');
    if (!refusalText) add('read.nessunRifiuto', true, '');
    else add('read.nessunRifiuto', false, String(refusalText).slice(0, 80));
  }

  if (exp.intent !== undefined) add('read.intent', read?.intent === exp.intent, `${read?.intent}`);
  if (exp.scope !== undefined) add('read.scope', read?.scope === exp.scope, `${read?.scope}`);
  if (exp.tools) {
    const used = (read?.plan?.tools ?? []).map((t) => t.tool);
    const missing = exp.tools.filter((t) => !used.includes(t));
    add('read.tools', missing.length === 0, `usati=[${used.join(',')}]`);
  }
  if (exp.results) checkResults(add, exp.results, read);
  if (exp.navigation) checkNavigation(add, exp.navigation, read, baselines);
  if (exp.grounding) checkGrounding(add, exp.grounding, read);
  if (exp.crossCheck) checkCrossChecks(add, exp.crossCheck, read, baselines, answers);

  return checks;
}

// ── Latenza ───────────────────────────────────────────────────────────────────────────────
// Si misura il tempo dalla richiesta inviata alla risposta di /plan ricevuta e parsata:
// e' esattamente cio' che l'utente aspetta prima di vedere la risposta. Due profili di costo
// molto diversi (planner deterministico vs planner LLM) hanno due budget distinti; la modalita'
// e' dichiarata dal backend stesso in read.mode.
const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};

// ── Esecuzione ────────────────────────────────────────────────────────────────────────────

const results = [];
// Risposte gia' ottenute, per i confronti fra domande (__sameAs).
const answers = new Map();
const latencies = { deterministic: [], llm: [] };
const baselines = await computeBaselines();

for (const q of bank.questions) {
  const persona = { ...DEFAULTS.persona, ...(q.persona ?? {}) };
  const context = { ...DEFAULTS.context, ...(q.context ?? {}) };
  const row = {
    id: q.id,
    capability: q.capability,
    phrasing: q.phrasing,
    persona: persona.role,
    text: q.text,
    verdict: 'PASS',
    latencyMs: null,
    mode: null,
    intent: null,
    checks: [],
  };

  const skip = (reason) => {
    row.verdict = 'SKIP';
    row.skipReason = reason;
    results.push(row);
  };

  if (ONLY && q.id !== ONLY && q.capability !== ONLY) continue;
  if (q.status === 'pending-implementation' && !flags.has('--include-pending')) {
    skip(`tool non ancora implementato — ${q.assumes ?? 'in attesa'}`);
    continue;
  }
  if (q.precondition) {
    const v = baselines[q.precondition.baseline];
    if (v !== q.precondition.equals) {
      skip(`precondizione non soddisfatta: ${q.precondition.baseline}=${v}`);
      continue;
    }
  }

  const t0 = performance.now();
  let body;
  try {
    const res = await fetch(`${BACKEND}/ai/actions/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Id': persona.id ?? 'eval-agnos',
        'X-Operator-Role': persona.role,
        'X-Operator-Name': persona.name ?? 'Eval Agnos',
      },
      body: JSON.stringify({
        text: q.text,
        channel: 'testo',
        currentPatientId: context.currentPatientId ?? undefined,
        navKey: context.navKey ?? undefined, // AC4: campo additivo, ignorato finche' non e' letto
        agent: context.agent ?? undefined,
      }),
    });
    body = await res.json();
    row.httpStatus = res.status;
  } catch (e) {
    row.verdict = 'FAIL';
    row.checks = [
      { name: 'rete', pass: false, detail: e instanceof Error ? e.message : String(e) },
    ];
    results.push(row);
    continue;
  }
  row.latencyMs = Math.round(performance.now() - t0);
  row.mode = body?.read?.mode ?? 'deterministic';
  row.intent = body?.read?.intent ?? null;
  answers.set(q.id, body?.read ?? null);

  const budget = DEFAULTS.latency?.[row.mode] ?? DEFAULTS.latency?.deterministic ?? {};
  const hardMs = q.latencyBudgetMs ?? budget.hardMs;
  row.checks = evaluate(q, body, baselines, answers);
  if (hardMs)
    row.checks.push({
      name: `latenza<${hardMs}ms`,
      pass: row.latencyMs <= hardMs,
      detail: `${row.latencyMs}ms (${row.mode})`,
    });
  latencies[row.mode]?.push(row.latencyMs);

  row.verdict = row.checks.every((c) => c.pass) ? 'PASS' : 'FAIL';
  results.push(row);
  const failed = row.checks.filter((c) => !c.pass);
  console.log(
    `${row.verdict.padEnd(4)} ${q.id} [${row.latencyMs}ms ${row.mode}]` +
      (failed.length ? ` — ${failed.map((c) => `${c.name}:${c.detail}`).join(' | ')}` : ''),
  );
}

for (const r of results.filter((x) => x.verdict === 'SKIP'))
  console.log(`SKIP ${r.id} — ${r.skipReason}`);

const byCapability = {};
for (const r of results) {
  const c = (byCapability[r.capability] ??= { pass: 0, fail: 0, skip: 0 });
  if (r.verdict === 'PASS') c.pass++;
  else if (r.verdict === 'FAIL') c.fail++;
  else c.skip++;
}
const latencyReport = Object.fromEntries(
  Object.entries(latencies).map(([mode, arr]) => [
    mode,
    {
      count: arr.length,
      p50: pct(arr, 50),
      p95: pct(arr, 95),
      max: arr.length ? Math.max(...arr) : null,
      budgetMs: DEFAULTS.latency?.[mode]?.budgetMs ?? null,
      hardMs: DEFAULTS.latency?.[mode]?.hardMs ?? null,
      p95OverBudget:
        arr.length && DEFAULTS.latency?.[mode]?.budgetMs
          ? pct(arr, 95) > DEFAULTS.latency[mode].budgetMs
          : null,
    },
  ]),
);

const passed = results.filter((r) => r.verdict === 'PASS').length;
const failed = results.filter((r) => r.verdict === 'FAIL').length;
const skipped = results.filter((r) => r.verdict === 'SKIP').length;

writeFileSync(
  join(OUT, 'report.json'),
  JSON.stringify(
    {
      ranAt: new Date().toISOString(),
      backend: BACKEND,
      bank: BANK_PATH,
      schemaVersion: bank.schemaVersion,
      passed,
      failed,
      skipped,
      total: results.length,
      byCapability,
      latency: latencyReport,
      baselines: { ...baselines, __patientIds: undefined },
      results,
    },
    null,
    2,
  ),
);

console.log(
  `\n${passed} PASS · ${failed} FAIL · ${skipped} SKIP su ${results.length} — report in ${OUT}`,
);
if (failed > 0) process.exit(1);
