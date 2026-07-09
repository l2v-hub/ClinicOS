## Claude remediation handoff — #239 chatbot Agnos non risponde nell'app

Codex QA ha corretto la diagnosi del problema. Il bug segnalato dall'utente non va descritto come semplice problema di health Azure o di endpoint `/ai/assistant/query`.

Il percorso reale della chat Agnos nell'app e':

```text
frontend AgnosPanel
  -> POST /ai/actions/plan
  -> backend/src/routes/ai-actions.ts
  -> backend/src/ai/actions/orchestrate.ts
  -> backend/src/ai/voice/plan.ts
  -> per letture: backend/src/ai/assistant/service.ts
  -> backend/src/ai/assistant/plan.ts
  -> gateway dati / runtime Agnos / LLM dove previsto
```

L'utente verifica correttamente cosi':

1. aprire l'app con Playwright;
2. aprire il pannello chat Agnos;
3. scrivere testo nella chat, ad esempio:
   - `quante camere sono occupate oggi`
   - `informazioni sul paziente`
   - `che terapie assume il paziente` con una scheda paziente aperta
4. intercettare la request browser verso `POST /ai/actions/plan`;
5. verificare che il backend riceva il testo;
6. verificare che il backend non lasci la domanda come `unknown` quando e' una lettura;
7. verificare che la lettura arrivi al gateway assistant/Agnos/LLM dove previsto;
8. verificare che la UI non mostri sempre `Informazione non trovata` o `Comando non riconosciuto`.

### Stato verificato da Codex

Codex ha riprodotto localmente il problema sul percorso reale `/ai/actions/plan`.

Root cause locale:

- `backend/src/ai/voice/plan.ts` riconosceva solo pochi trigger di lettura. Domande naturali italiane come `quante camere sono occupate oggi` potevano restare `unknown`.
- `backend/src/ai/actions/orchestrate.ts` non delegava gli `unknown` non-write all'assistente read-only. Quindi il testo della chat non arrivava al percorso assistant/gateway/runtime.
- `backend/src/ai/assistant/plan.ts` non riconosceva l'intento occupazione camere, quindi anche dopo il routing la domanda sulle camere produceva `unknown -> notFound`.
- L'occupazione camere veniva trattata come cross-patient access, causando `Ricerca tra più pazienti non autorizzata per il tuo ruolo`, anche se e' un aggregato non nominativo.

### Patch locale sperimentata da Codex

Codex ha gia' preparato una patch locale da usare come base. Claude deve rivederla, integrarla nel proprio branch/PR, completare l'evidenza e deployare.

File modificati localmente:

- `backend/src/ai/voice/plan.ts`
  - ampliare `READ_VERB` con interrogativi italiani: `che`, `cosa`, `quante`, `quanti`, `quanto`, `quando`, `dove`, `come`, `informazioni`.
- `backend/src/ai/actions/orchestrate.ts`
  - se `plan.actionType === 'unknown'` e non e' un rifiuto/delete/write, delegare a `runRead(text, ctx, currentPatientId)` e restituire un piano `read`.
- `backend/src/ai/assistant/plan.ts`
  - aggiungere intent `rooms_occupancy`;
  - mappare domande su camere/stanze/letti occupati/liberi/disponibili/manutenzione a tool `query_rooms_occupancy`;
  - non richiedere cross-patient access per l'aggregato camere.
- `backend/src/ai/assistant/service.ts`
  - aggiungere dispatch `query_rooms_occupancy`;
  - leggere `Room`, `Bed`, `PatientRoomAssignment` via Prisma con la stessa logica di occupazione attiva gia' presente in `/admin/rooms/occupancy`;
  - restituire un risultato aggregato con `totalRooms`, `totalBeds`, `occupiedBeds`, `freeBeds`, `maintenanceBeds`, `occupancyPct`;
  - non includere nomi pazienti nella risposta aggregata.
- `backend/src/ai/gateway/types.ts`
  - aggiungere `ROOM_OCCUPANCY` a `SourceType`.
- `backend/src/ai/gateway/sources.ts`
  - aggiungere helper `roomOccupancySource(...)`.
- `backend/src/ai/__tests__/actions.test.ts`
  - aggiungere regressioni per:
    - `quante camere sono occupate oggi`;
    - `informazioni sul paziente`;
    - entrambi devono passare da `/ai/actions/plan` a `read`, non restare `unknown`.
- `backend/src/ai/__tests__/assistant-plan.test.ts`
  - aggiungere test `Quante camere sono occupate oggi? -> rooms_occupancy / query_rooms_occupancy / requiresCrossPatientAccess=false`.

### Verifiche gia' eseguite da Codex sulla patch locale

```powershell
node_modules\.bin\tsx --test backend\src\ai\__tests__\assistant-plan.test.ts
```

Risultato: `15/15 PASS`.

```powershell
node_modules\.bin\tsx --test backend\src\ai\__tests__\actions.test.ts
```

Risultato: `33/33 PASS`.

```powershell
npm --prefix backend run build
```

Risultato: `PASS`.

Playwright locale:

- apre `http://127.0.0.1:5173`;
- entra come Operatore;
- apre Agnos;
- scrive `quante camere sono occupate oggi`;
- intercetta `POST /ai/actions/plan`.

Limite locale: il DB locale Codex non risponde (`ECONNREFUSED` / `ETIMEDOUT` anche su pazienti, terapie, appuntamenti, note e room), quindi Codex non puo' validare il contenuto dati finale in locale. Serve validazione su ambiente con DB attivo.

### Required implementation by Claude

Claude deve:

1. Prendere la patch locale Codex o reimplementare lo stesso fix in branch pulito.
2. Verificare che non siano incluse modifiche unrelated.
3. Confermare che le domande read non-write non restino piu' `unknown` nel percorso `/ai/actions/plan`.
4. Confermare che le scritture restino protette:
   - delete sempre rifiutato;
   - therapy/allergy write restano rifiutate dove previsto;
   - appointment/vitals/diary write mantengono preview/confirm;
   - nessuna esecuzione senza conferma.
5. Confermare che `rooms_occupancy` non esponga nomi pazienti, PHI o dati clinici nominativi.
6. Deployare backend aggiornato.
7. Eseguire Playwright end-to-end su ambiente con DB/Agnos attivi.

### Required Playwright test

Il test Playwright deve essere reale, non solo API o health check.

Scenario minimo:

```text
Open app
Login/select Operatore
Open Agnos chat panel
Type: quante camere sono occupate oggi
Intercept POST /ai/actions/plan
Assert request body text == "quante camere sono occupate oggi"
Assert response status == 200
Assert response.plan.actionType == "read"
Assert response.read.intent == "rooms_occupancy"
Assert response.read.notFound == false
Assert response.read.results[0].occupiedBeds is a number
Assert UI does not show "Informazione non trovata"
Assert UI does not show "Comando non riconosciuto"
Save screenshot + trace + video
```

Secondo scenario:

```text
Open patient detail for a test/synthetic patient
Open Agnos
Type: che terapie assume il paziente
Intercept POST /ai/actions/plan
Assert request reaches backend
Assert plan.actionType == "read"
Assert read.intent == "therapies"
Assert response is not generic "Informazione non trovata" when patient has therapies
```

Terzo scenario:

```text
Open Agnos outside patient detail
Type: informazioni sul paziente
Assert behavior is explicit and not misleading:
  - either patient_search with clear authorization/scope message;
  - or a clear prompt asking to open/select a patient;
  - not a silent unknown/notFound failure.
```

### Required backend/direct checks

Run backend direct request against the deployed backend:

```http
POST /ai/actions/plan
Content-Type: application/json
X-Operator-Id: codex-qa
X-Operator-Role: operatore
X-Request-Id: codex-qa-239-actions-plan

{
  "text": "quante camere sono occupate oggi",
  "channel": "testo"
}
```

Expected:

```json
{
  "plan": {
    "actionType": "read"
  },
  "read": {
    "intent": "rooms_occupancy",
    "notFound": false,
    "results": [
      {
        "totalRooms": "...",
        "totalBeds": "...",
        "occupiedBeds": "...",
        "freeBeds": "...",
        "maintenanceBeds": "...",
        "occupancyPct": "..."
      }
    ]
  }
}
```

Values must be numbers in the real payload. Do not expose patient names in this aggregate.

### Required tests

Run and save output:

```powershell
node_modules\.bin\tsx --test backend\src\ai\__tests__\assistant-plan.test.ts
node_modules\.bin\tsx --test backend\src\ai\__tests__\actions.test.ts
npm --prefix backend run build
npm test --if-present
npm run build
```

If broader test/build commands fail for unrelated dirty-worktree reasons, document exactly what failed and why. Do not hide failures.

### Evidence required

Save all evidence under:

```text
artifacts/task-validation/239-agnos-chatbot-plan-routing/
```

Required files:

- `task-contract.md`
- `validation-report.md`
- `logs/backend-actions-plan-direct.log`
- `logs/backend-to-assistant-routing.log`
- `logs/no-unknown-fallback-proof.log`
- `logs/no-phi-room-occupancy-proof.log`
- `logs/test-output.txt`
- `screenshots/agnos-rooms-occupancy.png`
- `video/`
- `trace/trace.zip`
- `playwright-report/`
- `test-results/`

`validation-report.md` must include:

```text
Final Decision: READY FOR CODEX QA
```

Claude must not write `CLOSED — VERIFIED`.

### Privacy/security requirements

- Do not log API keys, service tokens, DB URLs, Azure credentials, Gemini keys, patient full names, raw PHI, or clinical free text beyond the synthetic QA prompts.
- Room occupancy response may include aggregate counts only.
- If a source reference is needed, use `ROOM_OCCUPANCY` with aggregate label/text only.
- Do not expose current room assignment patient names through Agnos aggregate response.
- Keep delete/write safeguards unchanged.

### Definition of Done for Claude

Claude may move #239 only to `ready-for-qa` when:

- app chat text is proven to hit `/ai/actions/plan`;
- supported read prompts no longer stay `unknown`;
- `quante camere sono occupate oggi` returns a sourced aggregate answer, not `Informazione non trovata`;
- patient-context read prompts still work;
- write/delete safety tests pass;
- backend build passes;
- Playwright evidence is committed under the required artifact path;
- sanitized logs prove routing without leaking secrets/PHI;
- deployment target used by the user has the fix live.

Codex remains the only actor allowed to apply `qa-passed`, `closed-verified`, or close #239.
