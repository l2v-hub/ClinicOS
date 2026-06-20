# REQ-041 — Acceptance Matrix (Comandi vocali per aggiungere parametri e modificare dati)

GitHub Issue #54 · branch `req-041-voice-actions`

Architecture note: audio is transcribed **client-side** (Web Speech API, it-IT) and never reaches the
backend → `AI_VOICE_AUDIO_RETENTION_SECONDS=0` is satisfied by construction; the server-side STT model
is a model-agnostic seam that **degrades** (does not block) when unconfigured. The "model" never
touches the DB: planning is a deterministic parser, execution is the trusted backend (mirrors the
REQ-039/040 read assistant). The write executor calls existing ClinicOS domain writes only.

## Acceptance criteria

| # | Criterio | Verifica | Stato | Evidenza |
|---|----------|----------|-------|----------|
| 1 | Interrogare ClinicOS tramite voce | read intent → assistantQuery | PASS | test `vocal read`; `/ai/voice/plan` read branch |
| 2 | La trascrizione è mostrata all'utente | UI transcript textarea | PASS | `voice-transcription.png` |
| 3 | Il modello STT è configurabile | `AI_STT_MODEL`, degrade seam | PASS | tests `STT degrades`/`STT available`; `config.ts` |
| 4 | Azioni → ActionPlan tipizzato | `planAction()` typed | PASS | `voice/plan.ts`, `voice/types.ts`; plan tests |
| 5 | Le letture non modificano dati | read → read-only gateway | PASS | read intent never executes |
| 6 | Tutte le scritture richiedono conferma | `AI_REQUIRE_WRITE_CONFIRMATION` gate | PASS | test `confirmation is mandatory`; `voice-*-preview.png` |
| 7 | Il paziente è mostrato nella preview | preview `patientName` | PASS | `voice-vital-sign-preview.png` |
| 8 | Le ambiguità bloccano l'azione | `ambiguities` block + `canExecute=false` | PASS | test `ambiguous plan can never run`; `voice-patient-ambiguous.png` |
| 9 | Aggiungere un parametro | create_vital_sign | PASS | `voice-vital-sign-confirmed.png`; write-services |
| 10 | Modificare un dato anagrafico consentito | update_patient_demographics (whitelist) | PASS | `voice-demographic-update-preview.png` |
| 11 | Aggiornare una sezione narrativa | update_narrative_section (append, originalText immutable) | PASS | `voice-narrative-update-preview.png` |
| 12 | Il modello non accede al database | deterministic parser; executor = trusted backend | PASS | `voice/plan.ts` (no DB); `/execute` re-derives plan server-side |
| 13 | Gli strumenti applicano una whitelist | demographic + narrative + vital field whitelists | PASS | `write-services.ts` DEMOGRAPHIC_FIELDS / section keys |
| 14 | Una doppia conferma non duplica | idempotency key | PASS | test `double confirmation does NOT duplicate` |
| 15 | L'audio è eliminato secondo configurazione | client-side STT, never persisted; retention=0 | PASS | test `audio retention defaults to 0`; arch note |
| 16 | Tutte le operazioni sono auditate | `voiceAudit` source=VOICE, PHI-safe | PASS | `voice/audit.ts`; called on every outcome in `execute.ts` |
| 17 | Le cancellazioni vocali sono disabilitate | delete verbs → refuse_forbidden; `deleteActionsEnabled=false` | PASS | test `forbidden: delete…`; `config.ts` |

## Mandatory tests

| Test | Stato | Dove |
|------|-------|------|
| Ricerca vocale | PASS | `voice.test.ts` vocal read |
| Pressione 130/80 | PASS | vital PA 130/80 |
| Temperatura con virgola | PASS | temperature decimal comma |
| Parametro senza ora | PASS | vital without time → ambiguity |
| Paziente ambiguo | PASS | ambiguous patient blocks |
| Modifica telefono | PASS | demographics phone |
| Modifica indirizzo | PASS | demographics address |
| Aggiornamento Anamnesi | PASS | narrative append |
| Conferma | PASS | execute confirmed applies once |
| Annullamento | PASS | UI Annulla resets (no execute) |
| Doppia conferma | PASS | idempotent replay |
| Utente non autorizzato | PASS | writes disabled / confirmation required |
| Modello STT non disponibile | PASS | STT degrades |
| Audio rifiutato | PASS | `voice-permission-denied.png` |
| Eliminazione audio | PASS | retention=0; audio never sent to backend |

Backend: **node:test 158/158**, `tsc` 0. Frontend: `tsc -b` + `vite build` ✓.

## Out of scope / deferred (documented, not silently dropped)
- `update_appointment_note`: **no write API exists** in the backend (appointments are read-only via the
  internal gateway). Not in the mandatory test/AC set; deferred rather than adding appointment CRUD.
- Server-side STT transcription: seam present and configurable; degrades when `AI_STT_MODEL` unset.
- Forbidden in v1 (by design): deletes, therapy create/change, allergy-status change → `refuse_forbidden`.

## Data safety
- Production `/patients`: 200, 22 patients before and after (`data-smoke-before.txt`, `data-smoke-after.txt`).
- **No production writes** were performed. Execution logic is proven by unit tests with an injected
  writer and by mocked-backend E2E screenshots. Real writes run against local/sandbox DB only.
