# Contracts — 016 endpoint runtime assistant LLM

Nuovi endpoint su `clinicos-ai-runtime` (FastAPI), stesso `AI_RUNTIME_SERVICE_TOKEN` service-to-service delle document-jobs. Chiamati SOLO dal backend (mai dal browser). Temperatura 0, timeout ≤ `AI_ASSISTANT_TIMEOUT_MS`. Errori/timeout ⇒ il backend usa il percorso deterministico.

## POST /v1/assistant/plan  (F1)

Interpreta la domanda e propone un piano di lettura. **Non riceve dati clinici** (solo il testo domanda + contesto).

Request:
```json
{
  "question": "mostra le allergie di Elena Moretti",
  "currentPatientId": null,
  "scope_hint": "auto",
  "roles": ["operatore"],
  "toolSchema": [ { "name": "get_patient_allergies", "args": { "patientId": "string" } }, "…(solo tool read)" ]
}
```

Response 200:
```json
{
  "plan": {
    "intent": "allergies",
    "scope": "current_patient",
    "tools": [
      { "tool": "search_patients", "args": { "query": "Elena Moretti" } },
      { "tool": "get_patient_allergies", "args": { "patientId": "$1.id" } }
    ],
    "requiresCrossPatientAccess": false
  },
  "confidence": 0.86
}
```
- Il backend **valida**: ogni `tool` ∈ allowlist read; `requiresCrossPatientAccess` è **ricalcolato server-side** (il valore del modello è indicativo); risoluzione `$N` di riferimento a risultati precedenti gestita dall'executor. Piano invalido / JSON malformato ⇒ fallback deterministico + audit `mode:deterministic`.
- Nessun tool di scrittura/cancellazione è ammesso nello schema né nell'output (FR-008).

## POST /v1/assistant/compose  (F2)

Compone la risposta discorsiva dai risultati. **Riceve dati clinici** ⇒ ammesso solo con modello EU/self-hosted sotto DPA (FR-011). Se il modello configurato non è approvato, il backend non chiama questo endpoint e rende la risposta strutturata.

Request:
```json
{
  "question": "mostra le allergie di Elena Moretti",
  "results": [ { "type": "allergy", "value": "Penicillina", "severity": "grave", "sourceId": "src_1" } ],
  "sources": [ { "id": "src_1", "type": "NARRATIVE_SECTION", "patientId": "pat_1", "recordId": "rec_9" } ],
  "language": "it"
}
```

Response 200:
```json
{
  "answerText": "Elena Moretti ha un'allergia grave alla penicillina [fonte: sezione allergie].",
  "citedSources": ["src_1"],
  "refusal": null
}
```
- **Post-check backend (SOURCE_ONLY)**: se `answerText` cita valori/entità non presenti in `results`, la prosa è scartata e si rende la risposta strutturata (FR-006). `citedSources` deve essere sottoinsieme di `sources`.
- Richieste di giudizio clinico ⇒ `refusal` valorizzato (coerente col rifiuto deterministico).
- I contenuti clinici **non** vengono loggati (FR-012).

## Backend read API (invariata, verso la UI)

- `POST /ai/actions/plan` / `/ai/voice/plan` / `POST /ai/assistant/query`: contratto **invariato** per il client. La risposta `AssistantAnswer` guadagna i campi opzionali `answerText`, `mode`, `composed` (retrocompatibili). Il client (AgnosPanel) mostra `answerText` se presente, altrimenti la vista strutturata attuale.

## Capabilities / health

- `GET /v1/runtime/capabilities` estende l'elenco con `assistant_plan` / `assistant_compose` (secret-free) così il backend sa se il runtime supporta gli endpoint e con quali modelli/host (per abilitare o meno il composer secondo la postura EU).
