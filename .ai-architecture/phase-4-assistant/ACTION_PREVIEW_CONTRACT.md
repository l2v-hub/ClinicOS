# Action Preview Contract (Phase 4, Prompt 4 §7–§9)

Every significant write returns `status: NEEDS_CONFIRMATION` with:

```jsonc
"preview": {
  "previewId": "uuid",                 // binds the confirmation to THIS content
  "skillId": "vitals.record",
  "action": "Registrazione parametri vitali",
  "patient": { "id": "…", "label": "Galli Nora" },          // target (server label)
  "values": { "Pressione": "130/85", "Orario rilevazione": "30/09, 21:52" },  // data / changes
  "warnings": ["…"],                  // must be read (urgency hint, AI-proposed fields, HIGH_RISK notice)
  "notes": ["Autore: operatore corrente (risolto dal server)."],
  "actor": { "name": "Infermiere 1", "role": "nurse" },      // identity/role recorded
  "origin": "ai",
  "tool": "parameters.create_reading",
  "confirmationClass": "SENSITIVE_WRITE",                     // READ | LOW_RISK_WRITE | SENSITIVE_WRITE | HIGH_RISK
  "confirmable": true,                // false → the UI must NOT show «Conferma»
  "blockedReason": "…",               // when not confirmable (+ response.classicScreen)
  "editable": ["values"],             // what «Modifica» may change
  "therapyDraft": { "preview": {…}, "entryDateTime": "…" }  // prescriptions only
}
```

Per skill: vitals (values + time), diary (text verbatim + date), handover (text, priority, type
«Assistente AI»), prescription (drug, dose, route, times, start/end, dictated text, AI notices),
administration (drug, dose, route, fascia/time, date, "confirm only after administering").

## Actions

| action   | request                                                                               | effect                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conferma | `{workflowId, action:"confirm", previewId, payload?}`                                 | executes only if `previewId` is the current one (`preview_stale` otherwise), the preview is confirmable, the policy and the resident scope still allow it; prescriptions need `payload.therapy` matching the draft (`preview_mismatch`) |
| Modifica | `{workflowId, action:"modify"}` → `pending:"edit"`, `editable:{values/text/priority}` | the preview id is dead                                                                                                                                                                                                                  |
| (edit)   | `{workflowId, action:"edit", edit:{values?,text?,priority?}}`                         | new preview, new `previewId`, new write requestId                                                                                                                                                                                       |
| Annulla  | `{workflowId, action:"cancel"}`                                                       | `CANCELLED`, nothing written                                                                                                                                                                                                            |
| Riprova  | `{workflowId, action:"retry"}`                                                        | only FAILED + requestId-idempotent writes, same requestId                                                                                                                                                                               |

A typed «sì/conferma» is never a confirmation (the reply points to the button).

## Results, not claims

`COMPLETED` carries `result` with references (`readingId`, `entryId`, `therapyId`,
`consegnaId`, `administrationId`, `replayed`, `verified`). `FAILED` says «Operazione NON eseguita»
with the backend message; `DENIED` names the missing capability or `resident_out_of_scope`. The UI
shows the green «Esito confermato dal sistema» card only for `COMPLETED`.
