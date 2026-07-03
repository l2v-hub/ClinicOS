# Research — 015 Agnos AI unificato

Basata su ricognizione codebase 2026-07-03 (3 agenti Explore: architettura Agnos, voce REQ-041, audit UX/qualità). Nessun NEEDS CLARIFICATION residuo: le 3 decisioni di scope sono state confermate dal committente.

## D1 — Motore interpretazione comandi

- **Decision**: estendere il planner deterministico esistente (`backend/src/ai/voice/plan.ts` + `backend/src/ai/assistant/plan.ts`), generalizzato in `backend/src/ai/actions/orchestrate.ts` channel-agnostic.
- **Rationale**: scelta esplicita del committente; zero dati clinici verso LLM esterni (GDPR), zero costi/latency, comportamento testabile deterministicamente. Il planner voce copre già write-verbs, refusal patterns, vitali con range, orari, ambiguità.
- **Alternatives considered**: LLM orchestrator su clinicos-ai-runtime (Gemini) — respinto dal committente; ibrido deterministico+LLM fallback — rinviato, il catalogo attuale è coperto dai pattern.

## D2 — Unificazione canali testo/voce

- **Decision**: un solo pannello `AgnosPanel.tsx` che sostituisce `AIAssistantButton` (chat read-only) e `VoiceAssistant` (FAB voce). Backend: nuove route `POST /ai/actions/plan` e `POST /ai/actions/execute` con body `{text, channel: 'testo'|'voce', currentPatientId, idempotencyKey?, confirmed?}`; `/ai/voice/*` e `/ai/assistant/query` restano come deleganti (Constitution VI: nessuna integrazione rotta).
- **Rationale**: FR-001/FR-002; il percorso plan→preview→confirm→execute della voce è già lo standard di sicurezza; il testo lo adotta identico (SC-008: 0 differenze tra canali).
- **Alternatives considered**: estendere solo /ai/voice (semantica fuorviante); due pannelli sincronizzati (duplica stato e UX).

## D3 — Divieto Delete a 3 livelli

- **Decision**: (1) planner: refusal patterns estesi (elimina, cancella, rimuovi, togli, svuota, azzera, distruggi, butta, deleta + forme flesse); (2) executor: guard su `kind !== 'delete'` prima del dispatch — il tipo `AgnosActionKind = 'read'|'create'|'update'` non contempla delete; (3) catalogo: nessuna entry delete, deny-by-default (azione non in catalogo = rifiutata). `AI_DELETE_ACTIONS_ENABLED` resta hardcoded false.
- **Rationale**: FR-008/FR-009; difesa in profondità dimostrabile nei test (unit su ogni livello + E2E).
- **Alternatives considered**: solo refusal nel planner (aggirabile in teoria da bug del planner); middleware HTTP (il delete non ha proprio route AI, inutile).

## D4 — Allowlist deny-by-default

- **Decision**: `backend/src/ai/actions/catalog.ts` esporta `AGNOS_ACTION_CATALOG: Record<name, {kind, entity, enabled, description}>`. L'executor esegue SOLO azioni presenti e `enabled`. Env override `AI_DISABLED_ACTIONS="add_diary_note,..."` per spegnere singole azioni senza deploy di codice. Nuove azioni richiedono entry esplicita.
- **Rationale**: FR-012; colma il gap rilevato (gateway dispatch incondizionato di 12 tool read).
- **Alternatives considered**: tabella DB per allowlist (over-engineering per catalogo statico; YAGNI, Constitution I).

## D5 — Audit persistente

- **Decision**: nuovo modello Prisma additivo `AiAuditEvent` (vedi data-model.md); `backend/src/ai/audit-store.ts` con `recordAuditEvent()` best-effort (fallimento DB non blocca l'azione: log stdout resta). `voiceAudit()` e `auditLog()` del gateway vi scrivono entrambi. Endpoint `GET /ai/audit` (filtri operatore/paziente/esito/data, ruolo admin/manager) per consultazione.
- **Rationale**: FR-013/SC-003; stdout su Railway si perde; PHI-safe già garantito (nomi campo, mai valori).
- **Alternatives considered**: JSONL su filesystem (effimero su Railway); servizio esterno di log (nuova dipendenza, Constitution I).

## D6 — TTS

- **Decision**: `useSpeechOutput.ts` con `window.speechSynthesis`, voce it-IT quando disponibile, toggle persistito in localStorage, `cancel()` su nuovo input/stop/chiusura pannello. Solo risposte Agnos (esiti, risposte read), mai letture automatiche di dati clinici lunghi (troncamento + "continua a leggere").
- **Rationale**: FR-017; zero dipendenze; degrado pulito se voci assenti (edge case spec).
- **Alternatives considered**: TTS cloud (costi, latenza, PHI verso terzi — respinto).

## D7 — Appuntamenti agenda

- **Decision**: `backend/src/services/appointment-service.ts` (list/create/update con controllo conflitto slot 30-min per operatore) usato da: route REST `appointments.ts` (UI, incluso DELETE) e azioni AI `create_appointment`/`update_appointment` (solo C/U). Frontend: `App.tsx` sostituisce `MOCK_APPUNTAMENTI` (App.tsx:98) con fetch reale; `AppointmentForm.onSave` → POST.
- **Rationale**: FR-003/FR-007; modello `Appointment` già in schema (prisma/schema.prisma:172) con status/operator/patient; oggi la UI è mock-only → viola Constitution III, questo incremento la sana. Delete appuntamento: SOLO route REST usata dal pulsante UI; nessuna azione AI corrispondente.
- **Alternatives considered**: mappare "agenda" sui therapy-slots (semantica diversa: somministrazioni, non appuntamenti; terapie vietate all'AI).

## D8 — UX/Performance quick-wins (con misura)

- **Decision**: interventi mirati dall'audit: (1) dedup `/therapy-slots` (App.tsx:172 vs TerapiaFarmacologicaTab.tsx:226 → prop/lift); (2) dedup `/patients/:id/therapies` (TerapiaFarmacologicaTab.tsx:211 vs InvioPSModal.tsx:204 → prop); (3) `useMemo` su `filtrati` + `React.memo` su righe PatientList; (4) stato `saving` + disabled su NewPatientModal e salvataggi PatientDetail; (5) rimozione catch silenziosi nei file toccati (PatientList.tsx:48, DiarioPazienteTab.tsx:230) con toast condiviso. Misura: conteggio richieste di rete Playwright prima/dopo, salvato in evidenze.
- **Rationale**: FR-018/FR-019/SC-005/SC-006; "nessun refactoring senza beneficio verificabile" — ogni voce ha misura.
- **Alternatives considered**: scomposizione integrale PatientDetail.tsx (1504 righe) — rinviata a spec dedicata: rischio regressioni alto, beneficio non misurabile in questa release (documentata come debito).

## D9 — Validazione Playwright

- **Decision**: `e2e/agnos-cru.mjs` sul pattern harness esistente (driver.mjs + e2e/req041-voice-shots.mjs): flussi tradizionali, Create/Read/Update via chat, voce simulata (iniezione trascrizione — SpeechRecognition non emulabile headless), sync UI immediata, persistenza post-refresh, suite tentativi delete rifiutati (chat+voce), delete via pulsante UI funzionante. Output: screenshot + trace + report in `requirements/evidence/SPEC-015/`.
- **Rationale**: SC-007; pattern già rodato nel repo.
- **Alternatives considered**: @playwright/test runner completo (nuova dipendenza/config; harness esistente sufficiente e già CI-compatibile).
