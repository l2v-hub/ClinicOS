# Contracts — Agnos orchestrator API

Tutte le route sotto auth `requireOperator` (header X-Operator-Id / X-Operator-Role / X-Operator-Name), rate-limit 60/min, ruolo clampato a `operatore` sul percorso pubblico. Errori: `{ error: { kind, message } }`.

## POST /ai/actions/plan

Interpreta un comando (testo digitato o trascrizione vocale) senza eseguire nulla.

Request:
```json
{ "text": "registra pressione 130/80 alle 9", "channel": "testo", "currentPatientId": "pat_123" }
```

Response 200:
```json
{
  "plan": { "actionType": "create_vital_sign", "kind": "create", "patientId": "pat_123",
            "fields": {"etichetta":"PA","valore":"130/80","orario":"09:00"},
            "ambiguities": [], "requiresConfirmation": true },
  "preview": { "title": "Aggiungi parametro", "patientName": "Elena Moretti",
               "lines": [["Parametro","PA 130/80 mmHg"],["Orario","09:00"]],
               "warnings": [], "ambiguities": [], "canExecute": true },
  "read": null
}
```

- Comando read ⇒ `read` popolato con `AssistantAnswer` (risultati + fonti), `preview` null, nessuna conferma.
- Comando delete (ogni variante) ⇒ `plan.actionType = "refused_delete"`, `preview.refusal` con messaggio che indirizza alla UI; audit `kind: refusal`.
- Azione fuori catalogo o disabilitata ⇒ `refused_forbidden`.

## POST /ai/actions/execute

Esegue SOLO azioni write confermate. Il piano è SEMPRE riderivato server-side dal testo (tamper-proof).

Request:
```json
{ "text": "registra pressione 130/80 alle 9", "channel": "voce",
  "patientId": "pat_123", "idempotencyKey": "uuid", "confirmed": true }
```

Response 200:
```json
{ "ok": true, "actionType": "create_vital_sign", "recordId": "…", "message": "Parametro registrato.", "deduped": false }
```

Guardie in ordine: feature flag → azione in catalogo && enabled → kind ∈ {create,update} → paziente identificato → 0 ambiguità → confirmed=true → idempotenza → dispatch al service condiviso → audit. Violazione ⇒ 4xx `{error:{kind}}` con kind ∈ feature_disabled | not_in_catalog | delete_forbidden | not_executable | ambiguous | confirmation_required.

## GET /ai/actions/catalog

Restituisce il catalogo allowlist (ispezionabile; prova "0 azioni delete"): `[{name, kind, entity, enabled, description}]`.

## GET /ai/audit?operatorId=&patientId=&outcome=&from=&to=&limit=

Ruolo admin/manager (header reale, non clampato). Restituisce `AiAuditEvent[]` ordinati per createdAt desc, max 200.

## REST Appuntamenti (UI tradizionale — stesso service delle azioni AI)

- `GET /appointments?date=YYYY-MM-DD&operatorId=` → lista slot.
- `POST /appointments` `{patientId, operatorId, data, ora, tipologia, note?}` → 201; 409 su conflitto slot.
- `PATCH /appointments/:id` (campi parziali) → 200; 409 su conflitto.
- `DELETE /appointments/:id` → 204. **Usata SOLO dal pulsante UI**; nessuna azione AI vi accede; il service espone delete unicamente a questa route.

## Retrocompatibilità

- `POST /ai/voice/plan|execute` → wrapper che delega a /ai/actions con `channel:"voce"` (contratto invariato per client esistenti).
- `POST /ai/assistant/query` → invariato (read path).
