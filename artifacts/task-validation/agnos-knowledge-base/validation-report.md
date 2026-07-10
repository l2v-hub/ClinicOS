# Validation Report — Agnos Knowledge Base (Task 8: evidenza Playwright + regressione)

**Branch:** `feat/agnos-kb` · **Task contract:** `artifacts/task-validation/agnos-knowledge-base/task-contract.md`
**Spec:** `docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md`
**Harness:** `e2e/agnos-kb.mjs` (pattern ripreso da `e2e/issue-239-plan-routing.mjs`)
**Eseguito su:** stack locale già attivo (Postgres Podman + backend `:3001` con `AI_FACILITY_QUERIES_ENABLED=true` + frontend `:5173`, DB seeded con 15 pazienti sintetici + seed aggiuntivo di questo task, vedi §Seeding).
**Esito harness (run originale):** 40/40 PASS (`ui-report.json`) — ogni assert riflette il comportamento REALE osservato dal sistema, non quello atteso "a priori" dalla spec: dove il comportamento reale diverge dalla spec, l'assert verifica il comportamento reale e la deviazione è documentata esplicitamente sotto (nessun test è stato aggiustato per "far passare" un gap, si asserisce ciò che succede davvero).

**Esito harness (re-run dopo fix Gap 1, spec §2):** **42/42 PASS** (`ui-report.json` aggiornato) — `rooms_occupants` (Scenario 2) non porta più `requiresCrossPatientAccess: true`; l'asserzione è stata invertita da "rifiuto atteso (gap)" a "nessun rifiuto + `patientName` presente" (2 nuovi assert aggiunti: `notFound=false`, `patientName` presente). Gap 2 (`operators_on_duty`/ADMIN) resta invariato e documentato sotto.

**Esito harness (re-run dopo cambio spec, decisione utente 2026-07-10):** **44/44 PASS** (`ui-report.json` aggiornato) — Gap 2 è stato **risolto da cambio spec**, non da un fix di codice a comportamento invariato: l'utente ha deciso che i turni operatore sono un dato organizzativo non clinico (nessun dato paziente), quindi `operators_on_duty` è ora disponibile a **entrambi i ruoli** invece di solo-admin. Il check `ctx.roles.includes('admin')` in `queryOperators()` (`backend/src/ai/gateway/services.ts`) è stato rimosso — era comunque strutturalmente irraggiungibile per chiunque passasse dalla route pubblica (che fissa sempre `roles=['operatore']` per design). Scenario 8 riscritto: OPERATORE (UI), ADMIN (UI) e HTTP diretto con header `X-Operator-Role: admin` ricevono ora tutti e 3 **risultati** (turno seedato `op-qa-1`/`ven`, oggi = venerdì) invece del rifiuto — 4 nuovi assert (S8a ×3, S8b ×2, S8c ×1 rispetto alla run precedente). Vedi §Gap 2 (aggiornato) sotto.

## Seeding sintetico eseguito (dati SOLO sintetici, nessun PHI reale)

1. `PUT /operator-shifts/op-qa-1` — turni lun-ven disponibili, sab/dom non disponibili (operatore "Operatore QA").
2. `PUT /patients/SEED-PAZ-008/cartella` (read-modify-write, preservati tutti i campi esistenti):
   - `parametriVitali` += `qa-pa-1` (PA 140/85, 2026-07-09T08:00Z) e `qa-pa-2` (PA 150/90, 2026-07-10T08:12Z).
   - `valutazioniBraden` += `qa-braden-1` (2026-07-10, sintetico).
3. `POST /patients/SEED-PAZ-008/diary` — nota sintetica datata 2026-07-10T09:00Z.
4. `POST /consegne` — consegna sintetica per SEED-PAZ-008 (Moretti, Elena), `scadenza: 2026-07-10`.

Verificato via `GET /admin/rooms` che la camera reale **102** ha un occupante attivo (usata per lo scenario `rooms_occupants`).

## Tabella AC → esiti

| # | Scenario (AC spec §2-§4) | Intent atteso | Esito osservato | Evidenza |
|---|---|---|---|---|
| 1 | `quante camere sono occupate oggi` (aggregato, no paziente) | `rooms_occupancy`, `notFound=false`, nessun nome paziente nel payload | **PASS** — `occupiedBeds=1` numerico, no-PHI verificato via regex `/nome\|cognome\|name\|patient/i` sul payload risultati | `screenshots/01-rooms-occupancy.png`, `logs/no-phi-rooms-occupancy-proof.log` |
| 2 | `la camera 102 è occupata da chi?` (camera reale, verificata occupata) | `rooms_occupants`, `results[0].patientName` presente | **PASS (Gap 1 RISOLTO)** — routing corretto (`intent=rooms_occupants`, `roomNumero=102` estratto correttamente), `refusal=undefined`, `notFound=false`, `results[0].patientName="Camera128 Verifica"` (occupante sintetico della camera 102). Vedi §Gap 1 sotto per lo stato "risolto" | `screenshots/02-rooms-occupants-camera-102.png` |
| 3 | `com'è la pressione rispetto a ieri?` (scheda Moretti Elena aperta) | `vitals_compare`, delta numerico | **PASS** — `valA=150/90` (oggi), `valB=140/85` (ieri), `delta.num=10`, `delta.num2=5`, coerente coi dati sintetici seedati | `screenshots/03-vitals-compare.png` |
| 4 | `andamento della pressione questa settimana` (stessa scheda) | `vitals_trend`, `direction ∈ {salita,stabile,calo}` | **PASS** — `direction=salita`, coerente con la serie sintetica crescente 120→128→140→150 | `screenshots/04-vitals-trend.png` |
| 5 | `consegne di oggi` (nessuna scheda aperta) | `consegne` | **PASS** — `notFound=false`, risultato include la consegna sintetica seedata per oggi | `screenshots/05-consegne-oggi.png` |
| 6 | `cosa è stato scritto nel diario?` (scheda aperta) | `diary_notes` | **PASS** — `notFound=false`, risultato include la nota di diario sintetica seedata | `screenshots/06-diary-notes.png` |
| 7 | `ultimo punteggio Braden` (scheda aperta) | `clinical_scores` | **PASS** — `results[0].scale="braden"`, `id="qa-braden-1"` (la valutazione sintetica seedata) | `screenshots/07-clinical-scores-braden.png` |
| 8 | `chi è di turno oggi?` da OPERATORE e da ADMIN → risultati (decisione 2026-07-10: entrambi i ruoli) | `operators_on_duty` | **PASS (Gap 2 RISOLTO DA SPEC)** — routing corretto nei 3 percorsi (operatore UI, admin UI, admin HTTP diretto); tutti e 3 ricevono ora `refusal=undefined`, `notFound=false`, `results` con il turno seedato `op-qa-1` (Operatore QA, `ven`, oggi = venerdì) | `screenshots/08a-operators-on-duty-operatore-results.png`, `11-admin-panel-open.png`, `12-operators-on-duty-admin-ui-results.png`, `logs/operators-on-duty-role-gate-gap.log` |
| 9 | `dammi i dati` → `suggestions≥2` → chips → click prima → nuovo turno | `clarify` | **PASS** — `suggestions.length=3`, 3 chip `[data-testid="agnos-chip"]` visibili nel DOM, click sulla prima chip ("Quante camere sono occupate?") genera un nuovo turno reale (`intent=rooms_occupancy`, non più `clarify`) | `screenshots/09a-clarify-chips-before-click.png`, `09b-clarify-after-chip-click.png` |
| 10 | `cancella la nota del diario` → rifiuto delete; nessun nuovo console error | invarianti | **PASS** — `plan.actionType=refuse_forbidden`, `refusalKind=delete`, UI mostra il rifiuto; **0 nuovi console error** di pagina (filtrati solo i warning React nested-button preesistenti, regex `/descendant of\|nested\|hydration/i`) | `screenshots/10-delete-refusal.png`, `logs/console-errors.log` |

Altre invarianti ri-verificate implicitamente dagli scenari sopra: `refuse_clinical` non toccato in questa run (già coperto da unit test, non ripetuto qui per non duplicare evidenza); patientId sempre iniettato server-side (mai dall'LLM — planner deterministico in fallback, vedi §Modalità planner); nessun tool di scrittura esposto al planner (`READ_TOOLS` allowlist, invariata).

## Gap documentati (comportamento reale ≠ spec) — per decisione Codex

### Gap 1 — `rooms_occupants` sempre rifiutato (anche per i ruoli previsti) — **RISOLTO**

**Spec (§2, tabella intent):** "Nomi nelle risposte camere: Entrambi i ruoli — la UI attuale mostra già nome+camera a entrambi, Agnos non amplia la disclosure."

**Osservato (run originale):** `backend/src/ai/assistant/plan.ts:123` marcava il piano `rooms_occupants` con `requiresCrossPatientAccess: true` (terzo argomento `base(...)`), a differenza di `rooms_occupancy` (riga 125, nessun flag). Questo instradava la richiesta sul gate `canCrossPatientSearch()` (`backend/src/ai/gateway/context.ts:59-63` — richiede ruolo `admin`/`manager` **e** env `AI_CROSS_PATIENT_SEARCH_ENABLED=true`) **prima** che l'esecuzione raggiungesse il gate proprio del tool, `canFacilityRead()` (env-only, già `true` in questo ambiente) usato invece da `query_room_occupants` (`gateway/services.ts:339-352`). Risultato: la richiesta veniva sempre rifiutata con `"Ricerca tra più pazienti non autorizzata per il tuo ruolo."`, indipendentemente dal ruolo — comportamento diverso da `rooms_occupancy` (stessa fonte dati, stesso env, ma nessun cross-gate) e diverso dalla UI stanze esistente che mostra già nome+camera a entrambi i ruoli.

**Fix applicato (revert alla spec, questo task):**
- `backend/src/ai/assistant/plan.ts:123` — rimosso il terzo argomento `true` da `base('rooms_occupants', ...)`; ora `requiresCrossPatientAccess` è `false` (default), come `rooms_occupancy`. Commento aggiunto: la protezione resta `canFacilityRead()` + filtro `permittedPatientIds` per-riga dentro `queryRoomOccupants` (gateway/services.ts:343-345), non il gate cross-patient.
- `backend/src/ai/assistant/llm-planner.ts:33` — rimosso `query_room_occupants` da `CROSS_TOOLS`, così anche il percorso planner-LLM (quando configurato) non impone più il gate cross per questo tool.
- `backend/src/ai/__tests__/assistant-plan.test.ts` — test invertito: `'KB spec §2: rooms_occupants NON richiede cross access (disclosure UI, gate facility+ACL)'` asserisce ora `requiresCrossPatientAccess === false`.

**Verifica (re-run harness):** Scenario 2 (`e2e/agnos-kb.mjs`) ora asserisce `refusal=undefined`, `notFound=false`, `results[0].patientName` presente — confermato via UI reale (OPERATORE, camera 102, occupante sintetico), screenshot `screenshots/02-rooms-occupants-camera-102.png` aggiornato. Nessuna regressione: 348/348 test unit backend PASS, `npm --prefix backend run build` exit 0.

### Gap 2 — `operators_on_duty` sempre rifiutato, anche per ADMIN — **RISOLTO BY SPEC CHANGE (decisione utente 2026-07-10)**

**Spec originale (§2):** `operators_on_duty` — "solo admin" (implica: l'admin riceve risultati).

**Osservato (run originale):** `backend/src/routes/ai-assistant-public.ts:19-32` (`ctxFromOperator`, riusato da `ai-actions.ts` via `agnosOperatorFrom`) pinna **sempre** `ctx.roles = ['operatore']` (`NON_PRIVILEGED_ROLE`), indipendentemente dall'header `X-Operator-Role` inviato dal client — decisione di sicurezza preesistente e intenzionale ("privilege never derives from a public header"), confermata anche da un test di sicurezza dedicato (`backend/src/ai/__tests__/security.test.ts`, caso "Attacker passes requireOperator by self-asserting a privileged role"). La vecchia `queryOperators()` (`gateway/services.ts:429-433`) richiedeva `ctx.roles.includes('admin')`: condizione strutturalmente irraggiungibile tramite questa route pubblica. Verificato con 3 percorsi indipendenti — operatore via UI, admin via UI (login "Amministratore"), admin via chiamata HTTP diretta con `X-Operator-Role: admin` — tutti e 3 ricevevano lo stesso rifiuto `"Accesso non autorizzato per questa richiesta."`.

**Decisione utente (2026-07-10):** i turni operatore sono un **dato organizzativo non clinico** (nessun dato paziente coinvolto) — a differenza dei dati clinici, non c'è motivo di limitarli al ruolo admin. Il vincolo admin-only rendeva l'intent strutturalmente morto per chiunque, dato che la route pubblica non veicola mai privilegi admin (per design, invariato: "privilege never from public header"). Decisione: `operators_on_duty` ora disponibile a **entrambi i ruoli**.

**Fix applicato (questo task):**
- `backend/src/ai/gateway/services.ts` — rimosso il check `if (!ctx.roles.includes('admin')) throw ...` in `queryOperators()`; sostituito con un commento che documenta la decisione 2026-07-10.
- `docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md` — aggiornata la riga `operators_on_duty` (tabella intent) e la riga "Copertura KB" (tabella decisioni) da "solo admin" a "entrambi i ruoli (decisione 2026-07-10)".
- `e2e/agnos-kb.mjs` — Scenario 8 riscritto: operatore (UI), admin (UI) e admin (HTTP diretto) asseriscono ora `refusal=undefined`, `notFound=false`, `results` con il turno seedato invece del rifiuto.
- Test unit: nessuna modifica necessaria — `gateway-kb.test.ts` testa solo la funzione pura `dutyRows` (nessuna asserzione di ruolo), `clarify.test.ts` testa il catalogo statico di suggerimenti (`suggestFor`), lasciato **invariato** per design: la visibilità del chip "Chi è di turno oggi?" nel catalogo `clarify` resta admin-only (`GENERIC_ADMIN` in `backend/src/ai/assistant/clarify.ts`) — la visibilità del suggerimento non è autorizzazione, e chiedere direttamente il turno funziona comunque per l'operatore (verificato in Scenario 8a).

**Verifica (re-run harness):** `chi è di turno oggi?` da operatore (UI), da admin (UI) e via HTTP diretto con `X-Operator-Role: admin` ricevono tutti e 3 `refusal=undefined`, `notFound=false`, `results=[{operatoreId:"op-qa-1", operatoreNome:"Operatore QA", oraInizio:"08:00", oraFine:"20:00", pazientiInCarico:0}]` (turno sintetico `ven` seedato per `op-qa-1`, oggi = venerdì 2026-07-10) — vedi `logs/operators-on-duty-role-gate-gap.log`, `screenshots/08a-operators-on-duty-operatore-results.png`, `screenshots/12-operators-on-duty-admin-ui-results.png`. Nessuna regressione: 348/348 test unit backend PASS, `npm --prefix backend run build` exit 0, harness **44/44 PASS**.

**Nota (invariato):** il gate `ctxFromOperator()` che pinna sempre `roles=['operatore']` sulla route pubblica resta un vincolo di sicurezza intenzionale e testato (`security.test.ts`) — non toccato da questo cambio. La decisione 2026-07-10 rimuove solo il requisito di ruolo `admin` per un intent che, per sua natura, non espone dati paziente.

## Modalità planner (LLM-first) osservata

In tutti gli scenari il campo `mode` risulta `"deterministic"` — il runtime Azure (planner LLM) **non è configurato in questo ambiente locale** (nessun `AI_ASSISTANT_LLM_*` con `runtimeUrl`/`planModel` validi), quindi ogni richiesta esercita il **fallback deterministico** (`assistant/plan.ts`), non il planner LLM vero e proprio. Questo è coerente con l'architettura a 3 livelli della spec (guardie deterministiche → planner LLM → fallback deterministico): il percorso LLM stesso resta coperto **solo** da test unit con LLM mockato (`backend/src/ai/__tests__/llm-planner-kb.test.ts`, `assistant-plan.test.ts`, `llm-planner.test.ts` — tutti PASS, vedi §Regressione), non da questa evidenza Playwright. Nessuna azione richiesta: è il comportamento atteso e dichiarato nel piano del Task 5.

## Regressione finale

```
$ for f in backend/src/ai/__tests__/*.test.ts; do node_modules/.bin/tsx --test "$f" || exit 1; done
32 file di test · 323/323 test PASS · 0 FAIL · 0 CANCELLED

$ npm --prefix backend run build
✔ prisma generate + tsc -p tsconfig.json — nessun errore

$ NODE_OPTIONS=--max-old-space-size=4096 npm run build:frontend
✔ tsc -b + vite build — nessun errore (solo warning pre-esistente su chunk size > 500kB, non bloccante)
```

### Re-run dopo fix Gap 1 (rooms_occupants per spec §2)

```
$ node_modules/.bin/tsx --test backend/src/ai/__tests__/assistant-plan.test.ts
# tests 34 · # pass 34 · # fail 0

$ npm --prefix backend run test
# tests 348 · # pass 348 · # fail 0

$ npm --prefix backend run build
✔ prisma generate + tsc -p tsconfig.json — nessun errore (exit 0)

$ node e2e/agnos-kb.mjs
42/42 PASS — evidenze in artifacts/task-validation/agnos-knowledge-base
```

### Re-run dopo cambio spec (operators_on_duty entrambi i ruoli, decisione utente 2026-07-10)

```
$ npm --prefix backend run test
# tests 348 · # pass 348 · # fail 0

$ npm --prefix backend run build
✔ prisma generate + tsc -p tsconfig.json — nessun errore (exit 0)

$ node e2e/agnos-kb.mjs
44/44 PASS — evidenze in artifacts/task-validation/agnos-knowledge-base
```

## Evidenza (percorsi reali)

- Harness: `e2e/agnos-kb.mjs`
- Report macchina: `artifacts/task-validation/agnos-knowledge-base/ui-report.json` (44/44 PASS, post cambio spec Gap 2)
- Screenshot: `artifacts/task-validation/agnos-knowledge-base/screenshots/*.png` (13 file, uno per scenario/sotto-scenario; `02-rooms-occupants-camera-102.png`, `08a-operators-on-duty-operatore-results.png`, `12-operators-on-duty-admin-ui-results.png` aggiornati al nuovo esito — le vecchie screenshot `*-refusal.png`/`12-operators-on-duty-admin-ui.png` rimosse perché non più rappresentative)
- Trace Playwright: `artifacts/task-validation/agnos-knowledge-base/trace/trace.zip`
- Video sessione: `artifacts/task-validation/agnos-knowledge-base/video/*.webm`
- Log sanificati (no PHI, no prompt integrali): `artifacts/task-validation/agnos-knowledge-base/logs/{no-phi-rooms-occupancy-proof.log, operators-on-duty-role-gate-gap.log, plan-by-text-proof.log, console-errors.log}`

## Conclusione

7 nuovi intent read + `rooms_occupancy` + `clarify` + invarianti di sicurezza (delete sempre rifiutato, no-PHI nell'aggregato camere, zero nuovi console error) sono stati esercitati end-to-end sulla UI reale con dati sintetici e verificati con assert oggettivi (intercettazione rete + DOM + screenshot + trace + video). Delle due deviazioni rispetto alla lettera della spec originale (§2) individuate nella run originale: il **Gap 1 (`rooms_occupants`) è stato risolto** riportando `requiresCrossPatientAccess` a `false` per quel piano (nomi occupanti visibili a entrambi i ruoli, gate = `canFacilityRead()` + `permittedPatientIds`, non il gate cross-patient); il **Gap 2 (`operators_on_duty`/ADMIN) è stato risolto by spec change** (decisione utente 2026-07-10: i turni sono un dato organizzativo non clinico → l'intent è ora disponibile a entrambi i ruoli, il check `admin`-only in `queryOperators()` è stato rimosso). Entrambi i fix sono verificati con re-run harness (**44/44 PASS**) e regressione completa (348/348 test backend, build backend exit 0). Nessuna deviazione residua rispetto alla spec aggiornata.

Final Decision: READY FOR CODEX QA
