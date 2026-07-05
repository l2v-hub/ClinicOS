# SPEC-016 follow-up — Letture gestionali / di struttura (Agnos facility reads)

**Data:** 2026-07-05
**Branch:** `016-facility-reads`
**Stato:** design approvato (brainstorming), in attesa di review spec → piano

## 1. Obiettivo

Estendere l'assistente Agnos (letture NL, SPEC-016) per rispondere a domande **gestionali / operative di struttura**, oltre alle letture cliniche patient-scoped già attive (F0–F2). Query bersaglio:

1. *"Quante camere sono occupate?"* / *"Quanti letti liberi?"*
2. *"Quanti pazienti ci sono in struttura?"* → **entrambi i numeri**: ricoverati (letto attivo) **e** totale registrati.
3. *"La camera 12 è occupata e da chi?"*
4. *"Mostrami l'andamento dei parametri degli ultimi 7 giorni del paziente XXX."*
5. *"Che appuntamenti ci sono oggi?"* (intera struttura)

## 2. Vincoli e invarianti (invariati)

- **SOURCE_ONLY**: ogni valore in risposta proviene da un record e porta una fonte; niente invenzioni (post-check composer F2 resta attivo).
- **Solo letture**: nessun tool di scrittura/cancellazione entra nell'allowlist né supera la validazione.
- **Deny-by-default**: i nuovi facility-tool sono negati salvo esplicita abilitazione via env.
- **Paziente autoritativo lato server** per i tool single-patient (F1 `injectPatientId`).
- **Mai fidarsi di campi dichiarati dall'LLM** (intent/scope/patientId) per sicurezza/scoping — solo nomi-tool validati e stato server-side.

## 3. Autorizzazione

Le operazioni di struttura sono una capacità **distinta** dalla ricerca clinica cross-patient (PHI mining), e ricevono un gate proprio.

- Nuovo flag env **`AI_FACILITY_QUERIES_ENABLED`** (default `false`). In prod = `true` (decisione committente: clinica interna, staff fidato).
- Nuova funzione `canFacilityRead(env): boolean` in `gateway/context.ts` — dipende **solo** dal flag, **non** dal ruolo (la route pubblica strippa il privilegio; il flag è la leva di trust a livello di deployment).
- Nuovo insieme `FACILITY_TOOLS = { get_facility_occupancy, get_room_status, query_appointments_today }` in `llm-planner.ts`.
- `validatePlan` calcola `requiresFacilityAccess = tools.some(t ∈ FACILITY_TOOLS)` (server-side, mai dall'LLM).
- `service.ts`: se `plan.requiresFacilityAccess && !canFacilityRead(env)` → rifiuto motivato ("Funzioni di struttura non abilitate"), senza eseguire.
- La ricerca clinica cross-patient (`canCrossPatientSearch`, `AI_CROSS_PATIENT_SEARCH_ENABLED` + ruolo) resta **invariata**.

> Nota privacy: `get_room_status` espone nome paziente + posizione (PHI). Accettato dietro il flag di trust. SOURCE_ONLY resta valido (il nome viene dal record assegnazione/paziente ed è citato).

## 4. Nuovi tool di lettura (gateway `services.ts`)

Tutti read-only, ritornano `SourcedResult` con `sourceRefs`.

### 4.1 `getFacilityOccupancy(ctx)`
Calcola da `Room` / `Bed` / `PatientRoomAssignment` / `Patient`:
```
{
  camere:   { totali, occupate, libere },   // camera occupata = ha ≥1 letto con assegnazione attiva
  letti:    { totali, occupati, liberi },    // letto occupato = assegnazione attiva (endDate null)
  pazienti: { ricoverati, registrati }       // ricoverati = distinct patientId con assegnazione attiva; registrati = count(Patient)
}
```
- Solo camere `stato = attiva` contano nei totali (le `inattiva`/`manutenzione` escluse dai "totali disponibili"; documentato).
- `sourceRefs`: le assegnazioni attive contate (source tipo `ROOM`/`OCCUPANCY`).

### 4.2 `getRoomStatus(room: string, ctx)`
- Trova `Room` per `numero`; ritorna letti + per ogni letto l'eventuale assegnazione attiva con `patientId` + nome (join `Patient`).
- Camera inesistente → risultato vuoto (nessuna invenzione), il composer dirà "camera non trovata".
- `sourceRefs`: record assegnazione (+ paziente).

### 4.3 `query_appointments_today` (già esistente)
- L'executor `appointmentsToday(ctx)` esiste già in `service.ts`. Si **ri-gata** da cross-patient a facility.

### 4.4 Estensione `getPatientVitalSigns` (trend)
- `VitalSignQueryInput` + `lastDays?: number` (default 7 se intent = trend e non specificato), `fromDate?: string`, `toDate?: string`.
- `filterVitals` filtra anche per `rilevato` nella finestra.
- Single-patient: resta sotto il modello patient-scoped (F0 risolve il paziente, `injectPatientId` lo impone). Nessun gate facility.
- Presentazione: solo testo (nessun grafico); il composer descrive min/max/ultimo per etichetta nella finestra.

## 5. Planner LLM

- **Nuovi intent** nell'enum del validatore (`llm-planner.ts` `INTENTS`) **e** nel prompt runtime (`assistant.py` `_INTENTS`/mapping): `facility_occupancy`, `room_status`, `vitals_trend`. `appointments_today` → riusa `appointments`.
- **`READ_TOOL_SCHEMA`** (`read-tools.ts`): aggiungere
  - `get_facility_occupancy` args `{}`
  - `get_room_status` args `{ room: 'string' }`
  - `get_patient_vital_signs` args estesi con `lastDays: 'number?'`, `fromDate: 'string?'`, `toDate: 'string?'`
  - `query_appointments_today` args `{}` (già presente)
- `READ_TOOLS` (allowlist) aggiornata coerentemente; deny-by-default per tutto il resto.

## 6. Executor + composer + fonti

- `service.ts` `dispatch()`: nuovi case `get_facility_occupancy`, `get_room_status` (mappano ai servizi 4.1/4.2).
- Nuovo tipo di `SourceReference` (es. `ROOM` / `OCCUPANCY`) in `gateway/types.ts` + helper in `gateway/sources.ts`; `navFromSource` mappa a un'azione "apri camera/agenda" (o generica).
- Composer F2 **riusato** senza modifiche strutturali: compone prosa da `results` + `sources`. I dati di struttura vanno al modello EU (Azure gpt-5.4-mini) come già per il compose clinico.

## 7. Test

- **Unit gateway** (`node:test`): occupazione (camere/letti/pazienti con mix di assegnazioni attive/chiuse + camere inattive); room lookup (occupata/libera/inesistente); filtro data vitali (dentro/fuori finestra, default 7g).
- **Unit planner**: nuovi intent accettati; facility-tool → `requiresFacilityAccess=true`; con flag off → rifiuto, con flag on → esecuzione; `vitals_trend` resta patient-scoped (no facility gate).
- **Guardia prompt**: `SystemPromptContractTests` estesa ai nuovi intent.
- **Verifica live** (prod, roster reale): le 5 query esempio → risposta corretta con fonti; `AI_FACILITY_QUERIES_ENABLED=true` sul backend.

## 8. Deploy

- Backend: build + test via `ai-import-e2e.yml` (gate) su PR; deploy via `deploy-backend.yml` al merge su `main`.
- Runtime: modifica prompt `assistant.py` → `deploy-runtime.yml` (path `clinicos-ai-runtime/**`).
- Flag: `AI_FACILITY_QUERIES_ENABLED=true` sul servizio `clinicos-backend` via `railway-set-var.yml` + redeploy.

## 9. Fuori scope (YAGNI, per iterazioni successive)

- Dashboard/grafici visuali del trend.
- Query gestionali oltre le 5 famiglie (dimissioni previste, terapie in scadenza, carichi per operatore…).
- Login/ruolo manager verificato (IdP) — l'autorizzazione resta a flag di deployment.
