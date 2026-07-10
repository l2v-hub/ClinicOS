# Validation Report — Agnos Knowledge Base (Task 8: evidenza Playwright + regressione)

**Branch:** `feat/agnos-kb` · **Task contract:** `artifacts/task-validation/agnos-knowledge-base/task-contract.md`
**Spec:** `docs/superpowers/specs/2026-07-10-agnos-knowledge-base-design.md`
**Harness:** `e2e/agnos-kb.mjs` (pattern ripreso da `e2e/issue-239-plan-routing.mjs`)
**Eseguito su:** stack locale già attivo (Postgres Podman + backend `:3001` con `AI_FACILITY_QUERIES_ENABLED=true` + frontend `:5173`, DB seeded con 15 pazienti sintetici + seed aggiuntivo di questo task, vedi §Seeding).
**Esito harness (run originale):** 40/40 PASS (`ui-report.json`) — ogni assert riflette il comportamento REALE osservato dal sistema, non quello atteso "a priori" dalla spec: dove il comportamento reale diverge dalla spec, l'assert verifica il comportamento reale e la deviazione è documentata esplicitamente sotto (nessun test è stato aggiustato per "far passare" un gap, si asserisce ciò che succede davvero).

**Esito harness (re-run dopo fix Gap 1, spec §2):** **42/42 PASS** (`ui-report.json` aggiornato) — `rooms_occupants` (Scenario 2) non porta più `requiresCrossPatientAccess: true`; l'asserzione è stata invertita da "rifiuto atteso (gap)" a "nessun rifiuto + `patientName` presente" (2 nuovi assert aggiunti: `notFound=false`, `patientName` presente). Gap 2 (`operators_on_duty`/ADMIN) resta invariato e documentato sotto.

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
| 8 | `chi è di turno oggi?` da OPERATORE → rifiuto; da ADMIN → risultati | `operators_on_duty` | **PARZIALE / DEVIAZIONE DA SPEC** — routing corretto in tutti e 3 i tentativi (operatore UI, admin UI, admin HTTP diretto), rifiuto role-gated confermato per l'operatore (atteso) **ma anche per l'admin** (non atteso dalla spec). Root cause: §Gap 2 sotto | `screenshots/08a-operators-on-duty-operatore-refusal.png`, `11-admin-panel-open.png`, `12-operators-on-duty-admin-ui.png`, `logs/operators-on-duty-role-gate-gap.log` |
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

### Gap 2 — `operators_on_duty` sempre rifiutato, anche per ADMIN

**Spec (§2):** `operators_on_duty` — "solo admin" (implica: l'admin riceve risultati).

**Osservato:** `backend/src/routes/ai-assistant-public.ts:19-32` (`ctxFromOperator`, riusato da `ai-actions.ts` via `agnosOperatorFrom`) pinna **sempre** `ctx.roles = ['operatore']` (`NON_PRIVILEGED_ROLE`), indipendentemente dall'header `X-Operator-Role` inviato dal client — decisione di sicurezza preesistente e intenzionale ("privilege never derives from a public header"), confermata anche da un test di sicurezza dedicato (`backend/src/ai/__tests__/security.test.ts`, caso "Attacker passes requireOperator by self-asserting a privileged role"). `queryOperators()` (`gateway/services.ts:429-433`) richiede `ctx.roles.includes('admin')`: condizione strutturalmente irraggiungibile tramite questa route pubblica. Verificato con 3 percorsi indipendenti — operatore via UI, admin via UI (login "Amministratore"), admin via chiamata HTTP diretta con `X-Operator-Role: admin` — tutti e 3 ricevono lo stesso rifiuto `"Accesso non autorizzato per questa richiesta."` (vedi `logs/operators-on-duty-role-gate-gap.log`).

**Nota:** questo NON è un regressione introdotta da questa feature — è un vincolo di sicurezza preesistente e testato (l'header di ruolo non è verificato/firmato, quindi non può mai concedere privilegio). La spec §2 di questa feature, però, presuppone che l'admin riceva risultati per `operators_on_duty`: per soddisfarla servirebbe un meccanismo di identità verificata (IdP/JWT) che oggi non esiste in ClinicOS — esplicitamente fuori scope per Task 8 (evidenza) e per il piano dei Task 1-7 di questa feature (nessuno introduce un IdP). Decisione per Codex: accettare il comportamento attuale (rifiuto sempre, coerente con "mai amplia la disclosure"), oppure aprire un task successivo per l'identità verificata.

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

## Evidenza (percorsi reali)

- Harness: `e2e/agnos-kb.mjs`
- Report macchina: `artifacts/task-validation/agnos-knowledge-base/ui-report.json` (42/42 PASS, post fix Gap 1)
- Screenshot: `artifacts/task-validation/agnos-knowledge-base/screenshots/*.png` (13 file, uno per scenario/sotto-scenario; `02-rooms-occupants-camera-102.png` aggiornato al nuovo esito)
- Trace Playwright: `artifacts/task-validation/agnos-knowledge-base/trace/trace.zip`
- Video sessione: `artifacts/task-validation/agnos-knowledge-base/video/*.webm`
- Log sanificati (no PHI, no prompt integrali): `artifacts/task-validation/agnos-knowledge-base/logs/{no-phi-rooms-occupancy-proof.log, operators-on-duty-role-gate-gap.log, plan-by-text-proof.log, console-errors.log}`

## Conclusione

7 nuovi intent read + `rooms_occupancy` + `clarify` + invarianti di sicurezza (delete sempre rifiutato, no-PHI nell'aggregato camere, zero nuovi console error) sono stati esercitati end-to-end sulla UI reale con dati sintetici e verificati con assert oggettivi (intercettazione rete + DOM + screenshot + trace + video). Delle due deviazioni rispetto alla lettera della spec (§2) individuate nella run originale, il **Gap 1 (`rooms_occupants`) è stato risolto in questo task** riportando `requiresCrossPatientAccess` a `false` per quel piano (revert al comportamento voluto dalla spec §2: nomi occupanti visibili a entrambi i ruoli, gate = `canFacilityRead()` + `permittedPatientIds`, non il gate cross-patient) — verificato con re-run harness (42/42 PASS) e regressione completa (348/348 test backend, build backend exit 0). Il **Gap 2 (`operators_on_duty`/ADMIN) resta aperto e documentato** con causa radice puntuale (verifica indipendente su 3 percorsi) — richiede una decisione Codex (accettare il rifiuto sempre-attivo come vincolo di sicurezza preesistente, oppure aprire un task per identità verificata/IdP), fuori scope per questo fix.

Final Decision: READY FOR CODEX QA
