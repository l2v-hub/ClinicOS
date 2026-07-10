#!/usr/bin/env node
// Task 8 (Agnos Knowledge Base) — evidenza UI reale dei 7 nuovi intent read + rooms_occupancy +
// clarify + invarianti di sicurezza, su stack locale (Postgres Podman + backend :3001 + frontend
// :5173, DB seeded con 15 pazienti sintetici + seed aggiuntivo di questo harness: turni operatore
// QA, 2 PA sintetiche su SEED-PAZ-008, 1 Braden sintetico, 1 nota diario sintetica, 1 consegna
// sintetica di oggi — vedi task-8-report.md per i comandi di seed eseguiti).
// Pattern ripreso da e2e/issue-239-plan-routing.mjs: intercetta POST /ai/actions/plan in una Map
// per testo richiesta, assert su request/response + assert UI + screenshot, trace+video, PASS/FAIL
// collector, exit 1 se qualche assert fallisce.
//
// IMPORTANTE (trasparenza): rooms_occupants (Gap 1) e' stato risolto per allinearlo alla spec §2
// (nomi visibili a entrambi i ruoli, gate = canFacilityRead + permittedPatientIds, non il gate
// cross-patient) — vedi Scenario 2 sotto. operators_on_duty (Gap 2) e' stato RISOLTO DA CAMBIO
// SPEC (decisione utente 2026-07-10): i turni sono un dato organizzativo non clinico (nessun dato
// paziente), quindi l'intent e' ora disponibile a entrambi i ruoli — il check `admin`-only in
// queryOperators() e' stato rimosso (era strutturalmente morto per chiunque passasse dalla route
// pubblica, che fissa sempre roles=['operatore'] per design: privilege never from public header).
// Vedi Scenario 8 sotto e validation-report.md. Questo harness asserisce il comportamento REALE
// osservato, cosi' la evidenza resta onesta e verificabile.
//   node e2e/agnos-kb.mjs [outDir]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const BACKEND = process.env.CLINICOS_BACKEND ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? 'artifacts/task-validation/agnos-knowledge-base';
mkdirSync(join(OUT, 'screenshots'), { recursive: true });
mkdirSync(join(OUT, 'video'), { recursive: true });
mkdirSync(join(OUT, 'trace'), { recursive: true });
mkdirSync(join(OUT, 'logs'), { recursive: true });

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

// Registra request+response del planner per testo — la UI usa esattamente questo contratto
// (POST /ai/actions/plan → { plan, preview, read }).
const planByText = new Map();
// Solo warning React nested-button preesistenti (non introdotti da questo task) sono filtrati.
const KNOWN_NOISE = /descendant of|nested|hydration/i;
const consoleErrors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: join(OUT, 'video'), size: { width: 1366, height: 768 } } });
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await ctx.newPage();
page.on('dialog', (d) => { void d.dismiss().catch(() => {}); }); // niente auto-accept: nessuno scenario qui apre un confirm() nativo
page.on('console', (m) => { if (m.type() === 'error' && !KNOWN_NOISE.test(m.text())) consoleErrors.push(m.text()); });
page.on('response', async (r) => {
  if (!r.url().endsWith('/ai/actions/plan')) return;
  try {
    const req = JSON.parse(r.request().postData() ?? '{}');
    const body = await r.json();
    planByText.set(req.text, { status: r.status(), body, reqText: req.text });
  } catch { /* ignore */ }
});
const shot = (n) => page.screenshot({ path: join(OUT, 'screenshots', n) });
async function clickText(t) { await page.locator(`text="${t}"`).first().click(); await page.waitForTimeout(500); }
async function ask(text) {
  await page.fill('.agnos-input', text);
  await page.click('.ai-asst__send');
  await page.waitForTimeout(3000);
}
const uiText = () => page.locator('.agnos-panel').innerText();
async function openPanel() { await page.locator('.ai-fab').click(); await page.waitForSelector('.agnos-panel'); }
async function closePanel() { await page.locator('.ai-drawer__scrim').click().catch(() => {}); await page.waitForTimeout(300); }

try {
  // ═══════════════════════════════════════════════════════════════════════
  // Sessione OPERATORE — scenari 1-7, 8a, 9, 10
  // ═══════════════════════════════════════════════════════════════════════
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await clickText('Operatore');
  await page.waitForLoadState('networkidle');
  await clickText('Pazienti');
  await page.waitForTimeout(500);
  await openPanel();
  await shot('00-before-agnos-open.png');

  // ── Scenario 1: rooms_occupancy (aggregato, nessun paziente in contesto) ──
  await ask('quante camere sono occupate oggi');
  const s1 = planByText.get('quante camere sono occupate oggi');
  const r1 = s1?.body?.read;
  ok('S1 HTTP 200', s1?.status === 200, `status=${s1?.status}`);
  ok('S1 intent == rooms_occupancy', r1?.intent === 'rooms_occupancy', `intent=${r1?.intent}`);
  ok('S1 notFound == false', r1?.notFound === false, `notFound=${r1?.notFound}`);
  ok('S1 occupiedBeds numerico', typeof r1?.results?.[0]?.occupiedBeds === 'number', `occupiedBeds=${r1?.results?.[0]?.occupiedBeds}`);
  const s1phi = /nome|cognome|"name"|patient/i.test(JSON.stringify(r1?.results ?? []));
  ok('S1 nessun nome paziente nell aggregato camere (no-PHI)', !s1phi, `phiLeak=${s1phi}`);
  await shot('01-rooms-occupancy.png');
  writeFileSync(join(OUT, 'logs', 'no-phi-rooms-occupancy-proof.log'),
    `request.text = ${s1?.reqText}\nresponse.read.results = ${JSON.stringify(r1?.results)}\nPHI (nome/cognome/name/patient) presente: ${s1phi}\n`);

  // ── Scenario 2: rooms_occupants — camera reale 102 (occupata, verificato via GET /admin/rooms/occupancy) ──
  // FIX (Gap 1 risolto, spec §2): rooms_occupants non porta più requiresCrossPatientAccess=true,
  // quindi non passa dal gate canCrossPatientSearch() (ruolo admin/manager + env) — resta protetto
  // da canFacilityRead() + filtro permittedPatientIds dentro queryRoomOccupants stesso, come
  // rooms_occupancy. Lo stesso dato (nome+camera) è già mostrato a entrambi i ruoli nella UI stanze
  // esistente (spec §2 "Nomi nelle risposte camere: Entrambi i ruoli"), quindi l'OPERATORE ora
  // riceve risultati invece di un rifiuto.
  await ask('la camera 102 è occupata da chi?');
  const s2 = planByText.get('la camera 102 è occupata da chi?');
  const r2 = s2?.body?.read;
  ok('S2 HTTP 200', s2?.status === 200, `status=${s2?.status}`);
  ok('S2 intent == rooms_occupants (routing corretto)', r2?.intent === 'rooms_occupants', `intent=${r2?.intent}`);
  ok('S2 roomNumero estratto correttamente', r2?.plan?.tools?.[0]?.args?.roomNumero === '102', `args=${JSON.stringify(r2?.plan?.tools?.[0]?.args)}`);
  ok('S2 [GAP 1 RISOLTO] nessun rifiuto — spec §2 (entrambi i ruoli)', r2?.refusal === undefined, `refusal=${r2?.refusal}`);
  ok('S2 notFound == false (occupante trovato in camera 102)', r2?.notFound === false, `notFound=${r2?.notFound}`);
  ok('S2 results[0].patientName presente (disclosure UI equivalente)', typeof r2?.results?.[0]?.patientName === 'string' && r2.results[0].patientName.length > 0, `patientName=${r2?.results?.[0]?.patientName}`);
  await shot('02-rooms-occupants-camera-102.png');

  // ── Scenario 3: vitals_compare (paziente in scheda: Moretti, Elena — SEED-PAZ-008) ──
  await closePanel();
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  await page.getByText('Moretti, Elena', { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await openPanel();
  await ask("com'è la pressione rispetto a ieri?");
  const s3 = planByText.get("com'è la pressione rispetto a ieri?");
  const r3 = s3?.body?.read;
  ok('S3 intent == vitals_compare', r3?.intent === 'vitals_compare', `intent=${r3?.intent}`);
  const cmp = r3?.results?.[0];
  ok('S3 delta numerico (Δ sistolica +10)', cmp?.delta?.num === 10, `delta=${JSON.stringify(cmp?.delta)}`);
  ok('S3 valA/valB coerenti coi dati sintetici seed (150/90 vs 140/85)', cmp?.valA?.num === 150 && cmp?.valB?.num === 140, `valA=${JSON.stringify(cmp?.valA)} valB=${JSON.stringify(cmp?.valB)}`);
  await shot('03-vitals-compare.png');

  // ── Scenario 4: vitals_trend (stesso paziente) ──
  await ask('andamento della pressione questa settimana');
  const s4 = planByText.get('andamento della pressione questa settimana');
  const r4 = s4?.body?.read;
  ok('S4 intent == vitals_trend', r4?.intent === 'vitals_trend', `intent=${r4?.intent}`);
  const trend = r4?.results?.[0];
  ok('S4 direction ∈ {salita, stabile, calo}', ['salita', 'stabile', 'calo'].includes(trend?.direction), `direction=${trend?.direction}`);
  ok('S4 direction == salita (coerente con seed crescente 120→128→140→150)', trend?.direction === 'salita', `direction=${trend?.direction}`);
  await shot('04-vitals-trend.png');

  // ── Scenario 5: consegne (fuori scheda paziente) ──
  await closePanel();
  await clickText('Pazienti');
  await page.waitForTimeout(500);
  await openPanel();
  await ask('consegne di oggi');
  const s5 = planByText.get('consegne di oggi');
  const r5 = s5?.body?.read;
  ok('S5 intent == consegne', r5?.intent === 'consegne', `intent=${r5?.intent}`);
  ok('S5 notFound == false (consegna sintetica di oggi trovata)', r5?.notFound === false, `notFound=${r5?.notFound}`);
  const consegnaHit = (r5?.results ?? []).some((c) => String(c.note ?? '').includes('Consegna sintetica QA'));
  ok('S5 risultato include la consegna sintetica seedata per oggi', consegnaHit);
  await shot('05-consegne-oggi.png');

  // ── Scenario 6: diary_notes (paziente in scheda) ──
  await closePanel();
  await clickText('Pazienti');
  await page.waitForTimeout(600);
  await page.getByText('Moretti, Elena', { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await openPanel();
  await ask('cosa è stato scritto nel diario?');
  const s6 = planByText.get('cosa è stato scritto nel diario?');
  const r6 = s6?.body?.read;
  ok('S6 intent == diary_notes', r6?.intent === 'diary_notes', `intent=${r6?.intent}`);
  ok('S6 notFound == false (nota sintetica di oggi trovata)', r6?.notFound === false, `notFound=${r6?.notFound}`);
  const diaryHit = (r6?.results ?? []).some((d) => String(d.content ?? '').includes('Nota sintetica QA'));
  ok('S6 risultato include la nota di diario sintetica seedata', diaryHit);
  await shot('06-diary-notes.png');

  // ── Scenario 7: clinical_scores (Braden, stesso paziente) ──
  await ask('ultimo punteggio braden');
  const s7 = planByText.get('ultimo punteggio braden');
  const r7 = s7?.body?.read;
  ok('S7 intent == clinical_scores', r7?.intent === 'clinical_scores', `intent=${r7?.intent}`);
  ok('S7 risultato scala braden', r7?.results?.[0]?.scale === 'braden', `scale=${r7?.results?.[0]?.scale}`);
  ok('S7 risultato include la valutazione Braden sintetica seedata', r7?.results?.[0]?.id === 'qa-braden-1', `id=${r7?.results?.[0]?.id}`);
  await shot('07-clinical-scores-braden.png');

  // ── Scenario 8a: operators_on_duty da OPERATORE → RISULTATI (decisione 2026-07-10: turni =
  // dato organizzativo non clinico, disponibile a entrambi i ruoli; era admin-only, gate rimosso
  // in queryOperators()). Turno seedato 'ven' per op-qa-1 (Operatore QA), oggi = venerdì.
  await closePanel();
  await clickText('Pazienti');
  await page.waitForTimeout(500);
  await openPanel();
  await ask('chi è di turno oggi?');
  const s8a = planByText.get('chi è di turno oggi?');
  const r8a = s8a?.body?.read;
  ok('S8a intent == operators_on_duty (routing corretto)', r8a?.intent === 'operators_on_duty', `intent=${r8a?.intent}`);
  ok('S8a [GAP 2 RISOLTO DA SPEC] nessun rifiuto per OPERATORE — decisione 2026-07-10 (entrambi i ruoli)', r8a?.refusal === undefined, `refusal=${r8a?.refusal}`);
  ok('S8a notFound == false (turno seedato op-qa-1 trovato per oggi/venerdì)', r8a?.notFound === false, `notFound=${r8a?.notFound}`);
  ok('S8a results include il turno sintetico seedato (op-qa-1, ven)', (r8a?.results ?? []).some((o) => o.operatoreId === 'op-qa-1'), `results=${JSON.stringify(r8a?.results)}`);
  await shot('08a-operators-on-duty-operatore-results.png');

  // ── Scenario 9: clarify — "dammi i dati" → chips → click prima chip → nuovo turno reale ──
  await ask('dammi i dati');
  const s9 = planByText.get('dammi i dati');
  const r9 = s9?.body?.read;
  ok('S9 intent == unknown + suggestions presenti (esito clarify)', r9?.intent === 'unknown' && Array.isArray(r9?.suggestions), `intent=${r9?.intent} suggestions=${JSON.stringify(r9?.suggestions)}`);
  ok('S9 suggestions.length >= 2', (r9?.suggestions?.length ?? 0) >= 2, `len=${r9?.suggestions?.length}`);
  const chips = page.locator('[data-testid="agnos-chip"]');
  const chipCount = await chips.count();
  ok('S9 chips visibili nel DOM (>=2)', chipCount >= 2, `chipCount=${chipCount}`);
  const firstChipText = await chips.first().innerText();
  await shot('09a-clarify-chips-before-click.png');
  await chips.first().click();
  await page.waitForTimeout(3000);
  const s9b = planByText.get(firstChipText);
  ok('S9 click sulla prima chip genera un nuovo turno reale verso /ai/actions/plan', !!s9b, `chipText="${firstChipText}" hasReq=${!!s9b}`);
  ok('S9 il nuovo turno NON è più un esito clarify (risposta eseguita)', s9b?.body?.read?.intent !== 'unknown' || !!s9b?.body?.read?.refusal, `intent=${s9b?.body?.read?.intent}`);
  await shot('09b-clarify-after-chip-click.png');

  // ── Scenario 10: invarianti — delete sempre rifiutato + nessun nuovo console error ──
  await ask('cancella la nota del diario');
  const s10 = planByText.get('cancella la nota del diario');
  ok('S10 plan.actionType == refuse_forbidden (delete)', s10?.body?.plan?.actionType === 'refuse_forbidden', `actionType=${s10?.body?.plan?.actionType}`);
  ok('S10 refusalKind == delete', s10?.body?.plan?.refusalKind === 'delete', `refusalKind=${s10?.body?.plan?.refusalKind}`);
  const t10 = await uiText();
  ok('S10 UI mostra il rifiuto delete (non elimina mai)', /non è possibile tramite l.assistente|non può eliminare/i.test(t10) || /cancellazione/i.test(t10));
  await shot('10-delete-refusal.png');

  // ═══════════════════════════════════════════════════════════════════════
  // Sessione ADMIN (reload → Amministratore) — scenario 8b
  // ═══════════════════════════════════════════════════════════════════════
  await closePanel();
  await page.reload({ waitUntil: 'networkidle' });
  await clickText('Amministratore');
  await page.waitForLoadState('networkidle');
  await clickText('Pazienti');
  await page.waitForTimeout(500);
  await openPanel();
  await shot('11-admin-panel-open.png');
  await ask('chi è di turno oggi?');
  const s8b = planByText.get('chi è di turno oggi?'); // Map keyed by text: sovrascrive s8a con la risposta admin
  const r8b = s8b?.body?.read;
  ok('S8b (ADMIN via UI) intent == operators_on_duty (routing corretto)', r8b?.intent === 'operators_on_duty', `intent=${r8b?.intent}`);
  ok('S8b [GAP 2 RISOLTO DA SPEC] ADMIN via UI riceve risultati (decisione 2026-07-10, entrambi i ruoli)', r8b?.refusal === undefined, `refusal=${r8b?.refusal}`);
  ok('S8b results include il turno sintetico seedato (op-qa-1, ven)', (r8b?.results ?? []).some((o) => o.operatoreId === 'op-qa-1'), `results=${JSON.stringify(r8b?.results)}`);
  await shot('12-operators-on-duty-admin-ui-results.png');

  // Prova diretta server-side (fuori dal browser) col header self-asserted X-Operator-Role: admin —
  // isola la causa dalla UI: il backend (ctxFromOperator pinna sempre ctx.roles=['operatore'], vedi
  // routes/ai-assistant-public.ts + security.test.ts) NON deriva privilegio dall'header self-asserted
  // (invariato, decisione di sicurezza preesistente) — ma ora questo non produce più un rifiuto perché
  // query_operators non richiede più 'admin' (decisione 2026-07-10): stesso esito per operatore/admin.
  const directAdminRes = await fetch(`${BACKEND}/ai/actions/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Operator-Id': 'qa-admin-direct', 'X-Operator-Role': 'admin' },
    body: JSON.stringify({ text: 'turni di oggi' }),
  });
  const directAdminBody = await directAdminRes.json();
  ok('S8c prova diretta HTTP con X-Operator-Role:admin → intent risolto correttamente', directAdminBody?.read?.intent === 'operators_on_duty', `intent=${directAdminBody?.read?.intent}`);
  ok('S8c [GAP 2 RISOLTO DA SPEC] nessun rifiuto anche con header admin diretto (turni = entrambi i ruoli)', directAdminBody?.read?.refusal === undefined, `refusal=${directAdminBody?.read?.refusal}`);
  writeFileSync(join(OUT, 'logs', 'operators-on-duty-role-gate-gap.log'),
    [
      'Scenario 8 — operators_on_duty (Gap 2 RISOLTO DA CAMBIO SPEC, decisione utente 2026-07-10)',
      `operatore (UI): intent=${r8a?.intent} refusal=${r8a?.refusal} results=${JSON.stringify(r8a?.results)}`,
      `admin (UI): intent=${r8b?.intent} refusal=${r8b?.refusal} results=${JSON.stringify(r8b?.results)}`,
      `admin (HTTP diretto, X-Operator-Role: admin): intent=${directAdminBody?.read?.intent} refusal=${directAdminBody?.read?.refusal}`,
      '',
      'Storico: backend/src/routes/ai-assistant-public.ts ctxFromOperator() pinna SEMPRE',
      "ctx.roles=['operatore'] (NON_PRIVILEGED_ROLE) — commento nel file: \"privilege never derives",
      'from a public header\" — confermato anche da security.test.ts ("Attacker passes requireOperator',
      'by self-asserting a privileged role"). Prima della decisione 2026-07-10, gateway/services.ts',
      "queryOperators() richiedeva ctx.roles.includes('admin'): condizione strutturalmente mai vera",
      "tramite questa route pubblica, quindi l'intent era di fatto morto per chiunque. Decisione utente",
      '2026-07-10: i turni sono un dato organizzativo non clinico (nessun dato paziente) → il gate',
      "admin-only e' stato rimosso in queryOperators(); l'intent ora funziona per entrambi i ruoli.",
    ].join('\n') + '\n');

  ok('Nessun console error NUOVO di pagina (filtrati i warning nested-button preesistenti)', consoleErrors.length === 0, `errors=${consoleErrors.length}`);
} finally {
  await ctx.tracing.stop({ path: join(OUT, 'trace', 'trace.zip') });
  writeFileSync(join(OUT, 'logs', 'plan-by-text-proof.log'),
    [...planByText.entries()].map(([t, v]) => `text="${t}" -> intent=${v.body?.read?.intent} actionType=${v.body?.plan?.actionType} notFound=${v.body?.read?.notFound} refusal=${v.body?.read?.refusal ?? v.body?.plan?.refusalReason ?? ''}`).join('\n') + '\n');
  writeFileSync(join(OUT, 'logs', 'console-errors.log'), consoleErrors.join('\n') + '\n');
  writeFileSync(join(OUT, 'ui-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results, consoleErrors }, null, 2));
  await ctx.close();
  await browser.close();
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} PASS — evidenze in ${OUT}`);
if (passed !== results.length) process.exit(1);
