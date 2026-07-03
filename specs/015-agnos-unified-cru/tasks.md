# Tasks: Agnos AI unificato (CRU, no Delete) + UX/Performance

**Input**: Design documents from `/specs/015-agnos-unified-cru/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/agnos-api.md

**Tests**: richiesti esplicitamente dalla spec (unit sul divieto Delete a 3 livelli, suite Playwright obbligatoria con evidenze — SC-002, SC-007).

**Organization**: task raggruppati per user story; mappa incrementi plan.md: Foundational=A(backend), US1=A(frontend), US2=B, US3=C, US4=D, US5=E, Polish=F.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: baseline verificabile prima di toccare il codice (nessuna nuova dipendenza npm).

- [x] T001 Verificare app avviabile end-to-end (backend :3001 + frontend :5173 + Postgres Podman) e suite esistente verde: `cd backend && npm test`, `cd frontend && npm run build` — baseline registrata
- [x] T002 [P] Misura performance PRIMA: conteggio richieste di rete su apertura agenda e dettaglio paziente via harness Playwright (`.claude/skills/run-clinicos/driver.mjs`), salvata in `requirements/evidence/SPEC-015/perf-before.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: orchestratore unificato channel-agnostic — prerequisito di tutte le story. Generalizza `ai/voice/*` senza duplicare (D1/D2 research.md).

**⚠️ CRITICAL**: nessuna story può iniziare prima del completamento di questa fase.

- [x] T003 Creare catalogo allowlist deny-by-default in `backend/src/ai/actions/catalog.ts`: tipo `AgnosActionKind = 'read'|'create'|'update'` (delete assente dal tipo), `AGNOS_ACTION_CATALOG` con 12 read + 6 write, `enabled`, override env `AI_DISABLED_ACTIONS`
- [x] T004 Creare orchestratore channel-agnostic in `backend/src/ai/actions/orchestrate.ts`: `planCommand()`/`executeCommand()` che generalizzano `ai/voice/plan.ts|preview.ts|execute.ts|idempotency.ts`, con `channel: 'testo'|'voce'` e guardie in ordine da contracts/agnos-api.md
- [x] T005 Estendere `backend/src/ai/voice/types.ts` con `channel` e actionType appuntamenti; planner voce riusato dall'orchestratore (nessuna duplicazione)
- [x] T006 Creare route `backend/src/routes/ai-actions.ts`: `POST /ai/actions/plan`, `POST /ai/actions/execute`, `GET /ai/actions/catalog` sotto `requireOperator` + rate-limit, errori `{error:{kind,message}}` come da contract
- [x] T007 Montare le route in `backend/src/app.ts` e convertire `backend/src/routes/ai-voice.ts` in wrapper deleganti verso l'orchestratore con `channel:'voce'` (contratto `/ai/voice/*` invariato — Constitution VI)
- [x] T008 Unit test orchestratore in `backend/src/ai/__tests__/actions.test.ts`: plan read/create/update, ambiguità bloccanti, idempotenza, guardie execute (not_in_catalog, ambiguous, confirmation_required), canale testo=voce a parità di input

**Checkpoint**: `POST /ai/actions/plan|execute` funzionanti via curl; `/ai/voice/*` retrocompatibile; test backend verdi.

---

## Phase 3: User Story 1 — CRU via chatbot testuale unificato (Priority: P1) 🎯 MVP

**Goal**: il pannello Agnos esegue read con fonti e write (vitali, diario, anagrafica, narrative) con preview→conferma→salvataggio→UI sincronizzata.

**Independent Test**: digitare comando creazione parametro vitale + nota diario; verificare preview, conferma, salvataggio, aggiornamento cartella senza reload, persistenza dopo refresh.

- [x] T009 [P] [US1] Creare hook stato conversazione `frontend/src/components/shared/agnos/useAgnosChat.ts`: messaggi, plan/execute verso `/ai/actions/*`, idempotencyKey per conferma, stati loading/errore
- [x] T010 [US1] Creare `frontend/src/components/shared/AgnosPanel.tsx`: pannello unico chat (sostituisce il pannello read-only di `AIAssistantButton.tsx`), rendering preview (titolo, paziente, righe campo→valore, warnings, ambiguità), pulsante "Conferma e salva" disabilitato su ambiguità
- [x] T011 [US1] Integrare AgnosPanel in `frontend/src/App.tsx` con contesto paziente corrente (`currentPatientId`) e stili in `frontend/src/App.css` (palette blu medicale, tablet-first)
- [x] T012 [US1] Sincronizzazione UI immediata post-esecuzione: refresh mirato dei dati toccati (cartella/parametri/diario) senza reload pagina (FR-020)
- [x] T013 [US1] Verifica manuale flusso pilota (vitali + diario) via harness: comando→preview→conferma→dato visibile→refresh persistente; screenshot in `requirements/evidence/SPEC-015/`

**Checkpoint**: US1 completa e testabile indipendentemente — MVP.

---

## Phase 4: User Story 2 — Divieto strutturale di Delete + audit persistente (Priority: P1)

**Goal**: delete irraggiungibile su 3 livelli (planner, executor, catalogo) con prova; ogni azione AI tracciata su Postgres.

**Independent Test**: varianti lessicali di cancellazione via chat rifiutate al 100%, evento in audit, dati invariati; catalogo ispezionabile con 0 azioni delete.

- [x] T014 [P] [US2] Migrazione Prisma ADDITIVA: modello `AiAuditEvent` in `prisma/schema.prisma` (campi/indici da data-model.md, nessuna FK) + `npx prisma migrate dev` (mai reset)
- [x] T015 [US2] Creare `backend/src/ai/audit-store.ts`: `recordAuditEvent()` best-effort (fallimento DB non blocca, stdout resta); integrare in `backend/src/ai/voice/audit.ts` e `backend/src/ai/gateway/audit.ts`
- [x] T016 [P] [US2] Estendere refusal patterns nel planner (`backend/src/ai/voice/plan.ts`): elimina, cancella, rimuovi, togli, svuota, azzera, distruggi, butta, deleta + forme flesse; messaggio rifiuto che indirizza alla UI (FR-009)
- [x] T017 [US2] Creare route `backend/src/routes/ai-audit.ts`: `GET /ai/audit?operatorId=&patientId=&outcome=&from=&to=&limit=` ruolo admin/manager, max 200, ordinati desc; montare in `app.ts`
- [x] T018 [US2] Unit test difesa in profondità in `backend/src/ai/__tests__/actions.test.ts`: (1) planner rifiuta ogni variante lessicale, (2) executor respinge kind ∉ {create,update}, (3) catalogo senza entry delete + azione fuori catalogo rifiutata, (4) audit riceve evento `refusal`

**Checkpoint**: US1+US2 indipendenti; SC-002/SC-003 dimostrabili.

---

## Phase 5: User Story 3 — Voce integrata nel pannello + TTS (Priority: P2)

**Goal**: mic esplicito nel pannello Agnos, trascrizione modificabile, stesso percorso plan/execute del testo, risposta TTS it-IT interrompibile.

**Independent Test**: attivare mic, dettare comando write, correggere trascrizione, confermare dalla stessa preview; risposta letta ad alta voce e interrompibile.

- [x] T019 [P] [US3] Estrarre `frontend/src/components/shared/agnos/useVoiceInput.ts` da `VoiceAssistant` (SpeechRecognition it-IT, stato registrazione visibile, gestione permesso negato con fallback testo)
- [x] T020 [P] [US3] Creare `frontend/src/components/shared/agnos/useSpeechOutput.ts`: speechSynthesis it-IT, toggle persistito in localStorage, `cancel()` su nuovo input/stop/chiusura, troncamento risposte lunghe, degrado pulito senza voci italiane
- [x] T021 [US3] Integrare mic + TTS in `AgnosPanel.tsx`: trascrizione nel campo testo modificabile prima dell'invio, `channel:'voce'`, controlli stop ascolto/riproduzione sempre visibili
- [x] T022 [US3] Rimuovere il FAB `VoiceAssistant` da `frontend/src/App.tsx` (il pannello unico lo sostituisce); nessun componente orfano residuo

**Checkpoint**: SC-008 — 0 differenze di comportamento testo vs voce.

---

## Phase 6: User Story 4 — Appuntamenti agenda reali + via Agnos (Priority: P2)

**Goal**: agenda staccata dai mock (sana Constitution III), CRU appuntamenti condiviso UI+AI, delete solo da pulsante UI.

**Independent Test**: creare e aggiornare appuntamento via chat; slot corretto popolato senza reload; persistenza dopo refresh; conflitto slot segnalato in preview.

- [x] T023 [US4] Creare `backend/src/services/appointment-service.ts`: list/create/update con controllo conflitto slot 30-min per operatore (modello `Appointment` esistente, schema invariato); delete esposto SOLO alla route UI
- [x] T024 [US4] Creare route REST `backend/src/routes/appointments.ts`: `GET /appointments?date=&operatorId=`, `POST` (201/409), `PATCH /:id` (200/409), `DELETE /:id` (204, solo pulsante UI); montare in `app.ts`
- [x] T025 [US4] Aggiungere azioni AI `create_appointment`/`update_appointment` a `catalog.ts` + planner appuntamenti in `backend/src/ai/actions/appointments.ts` (date/ore italiane, conflitto slot come ambiguità bloccante in preview); nessuna azione delete_appointment
- [x] T026 [US4] Frontend: sostituire `MOCK_APPUNTAMENTI` in `frontend/src/App.tsx` con fetch reale `/appointments`; `AppointmentForm.onSave` → POST/PATCH; delete agenda via pulsante UI → DELETE REST
- [x] T027 [US4] Test: unit appointment-service (conflitti) in `backend/src/ai/__tests__/` + verifica "modifica la terapia di Rossi" rifiutato (entità vietata)

**Checkpoint**: agenda persistita via API; pattern estensione catalogo dimostrato.

---

## Phase 7: User Story 5 — Feedback coerenti e reattività (Priority: P3)

**Goal**: quick-wins misurabili da audit D8: dedup fetch, memoizzazione, stati saving, zero catch silenziosi nei flussi toccati.

**Independent Test**: misura richieste di rete prima/dopo (agenda −30%, 0 duplicati); ogni salvataggio mostra attesa/successo/errore.

- [ ] T028 [P] [US5] Dedup `/therapy-slots` (App.tsx:172 vs TerapiaFarmacologicaTab.tsx:226) e `/patients/:id/therapies` (TerapiaFarmacologicaTab.tsx:211 vs InvioPSModal.tsx:204) via lift/prop in `frontend/src/App.tsx` e componenti coinvolti
- [x] T029 [P] [US5] `useMemo` su lista filtrata + `React.memo` su righe in `frontend/src/components/PatientList.tsx`
- [x] T030 [P] [US5] Stato `saving` + pulsanti disabled + esito visibile su `NewPatientModal` e salvataggi `PatientDetail` (FR-018)
- [x] T031 [US5] Eliminare catch silenziosi nei file toccati (PatientList.tsx:48, DiarioPazienteTab.tsx:230) con messaggio errore visibile condiviso
- [ ] T032 [US5] Misura performance DOPO in `requirements/evidence/SPEC-015/perf-after.json` + confronto documentato (SC-005: −30% richieste agenda, 0 duplicati)

**Checkpoint**: benefici misurati prima/dopo — nessun refactoring senza beneficio verificabile.

---

## Phase 8: Polish & Validazione obbligatoria (incremento F)

**Purpose**: suite Playwright end-to-end con evidenze, gate di build, tracciabilità deploy.

- [ ] T033 Creare suite `e2e/agnos-cru.mjs` (pattern driver.mjs): flusso tradizionale, Create/Read/Update via chat, stessi flussi via voce simulata (iniezione trascrizione), sync immediata chatbot↔UI, persistenza post-refresh
- [ ] T034 Suite no-delete in `e2e/agnos-cru.mjs`: tentativi cancellazione chat+voce (tutte le varianti lessicali) rifiutati al 100% + `GET /ai/actions/catalog` con 0 azioni delete + delete via pulsante UI funzionante (FR-010)
- [ ] T035 Eseguire suite completa e archiviare evidenze (screenshot, trace, report, misure rete) in `requirements/evidence/SPEC-015/`
- [ ] T036 Gate finali: `cd backend && npm test` verde, `cd frontend && npm run build` verde (tsc -b + vite build), zero errori lint
- [ ] T037 Commit incrementali per fase + push + manifest deployment in `requirements/deployments/` con elenco REQ/spec inclusi

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: nessuna dipendenza
- **Foundational (P2)**: dopo Setup — BLOCCA tutte le story
- **US1 (P3)**: dopo Foundational
- **US2 (P4)**: dopo Foundational (T014/T016 parallelizzabili con US1; T018 richiede T003/T004)
- **US3 (P5)**: dopo US1 (il pannello deve esistere)
- **US4 (P6)**: dopo Foundational (backend) + US1 (esposizione via pannello)
- **US5 (P7)**: indipendente dalle altre story (solo frontend esistente) — parallelizzabile dopo Setup
- **Polish (P8)**: dopo tutte le story

### Parallel Opportunities

- T002 ∥ T001; T003 ∥ T005 (file diversi); T009 ∥ T014 ∥ T016; T019 ∥ T020; T028 ∥ T029 ∥ T030; US5 in parallelo a US2–US4 (file disgiunti)

---

## Implementation Strategy

MVP = Foundational + US1 (pilota vitali+diario via chat). Poi incrementi indipendenti in ordine priorità: US2 (sicurezza dimostrabile) → US3 (voce) → US4 (appuntamenti) → US5 (perf) → validazione F. Ogni fase: build gate + commit dedicato. Team agenti per fase: UIUX review → implementazione → QA.
