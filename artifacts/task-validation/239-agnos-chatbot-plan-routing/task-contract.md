# Task contract — Issue #239

**Titolo:** Bug: Agnos AI non usa endpoint Azure LLM / chatbot Agnos non risponde nell'app
**Tipo:** BUG · **Priorità:** P0 · **Area:** agnos-ai / backend / azure / railway
**Percorso runtime reale (confermato da Codex QA):**
`AgnosPanel → POST /ai/actions/plan → ai-actions.ts → orchestrate.ts → voice/plan.ts → (read) assistant/service.ts → assistant/plan.ts → gateway`

## Acceptance criteria (dal handoff Codex)

1. Il testo scritto nella chat dell'app raggiunge `POST /ai/actions/plan`.
2. Le domande di lettura non-write non restano più `unknown` su quel percorso.
3. `quante camere sono occupate oggi` → risposta aggregata sourced (`rooms_occupancy`), non `Informazione non trovata`.
4. Le letture con paziente in contesto continuano a funzionare (`therapies`, ecc.).
5. `rooms_occupancy` non espone nomi paziente / PHI (solo conteggi aggregati).
6. Le scritture restano protette: delete sempre rifiutato; therapy/allergy write rifiutate; appointment/vitals/diary write con preview/confirm.
7. Backend build verde; test verdi; evidenza Playwright reale (non solo API/health) committata sotto il path artifact.
8. Nessun secret/PHI nei log.

## Scope della patch (working tree + completamento)

Patch base fornita da Codex (già presente in working tree), rivista e completata:
- `backend/src/ai/voice/plan.ts` — `READ_VERB` ampliato con interrogativi IT.
- `backend/src/ai/actions/orchestrate.ts` — delega `unknown` non-write a `runRead`.
- `backend/src/ai/assistant/plan.ts` — intent `rooms_occupancy`; **fix aggiuntivo Claude:** stem `terapia`→`terapi` per riconoscere il plurale "terapie" (scenario 2 Codex).
- `backend/src/ai/assistant/service.ts` — dispatch `query_rooms_occupancy` (Room/Bed/PatientRoomAssignment, aggregato, no nomi).
- `backend/src/ai/gateway/types.ts` — `ROOM_OCCUPANCY` in `SourceType`.
- `backend/src/ai/gateway/sources.ts` — `roomOccupancySource(...)`.
- `backend/src/ai/__tests__/actions.test.ts` — regressioni routing read.
- `backend/src/ai/__tests__/assistant-plan.test.ts` — regressione `rooms_occupancy` + **regressione plurale "terapie"**.
- `e2e/issue-239-plan-routing.mjs` — evidenza UI reale (nuovo).

## Non-goal / vincoli
- Nessun close/merge/deploy da parte di Claude (Codex Gate). Decisione finale: **READY FOR CODEX QA**.
- Nessuna modifica unrelated inclusa nel commit #239.
