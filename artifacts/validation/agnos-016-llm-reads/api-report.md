# API Report — Agnos/016 (produzione)

**Backend**: https://clinicos-backend-production-df88.up.railway.app
**Generato**: 2026-07-04T21:32:44.729Z

## Endpoint coinvolti

| Metodo | Path | Auth | Scopo |
|---|---|---|---|
| POST | /ai/actions/plan | header operatore (X-Operator-*) + rate-limit | interpreta comando (read/write/refuse) |
| POST | /ai/actions/execute | idem | esegue write confermata (idempotente) |
| GET | /ai/actions/catalog | idem | allowlist azioni (prova 0 delete) |
| GET | /ai/audit | ruolo admin/manager (header reale) | consultazione audit PHI-safe |
| POST | /ai/voice/plan|execute | idem (delega a /ai/actions, channel voce) | retrocompat voce |
| POST | /v1/assistant/plan|compose (runtime) | Bearer service-token | planner/composer LLM (F1/F2) |

## Request/Response verificati (estratti)

### Read (allergie) — HTTP 200
```json
{
  "request": {
    "text": "mostra le allergie di Ugo Folli"
  },
  "read": {
    "intent": "allergies",
    "results": 2,
    "sources": 2,
    "mode": "deterministic",
    "notFound": false
  }
}
```

### Delete (chat) — HTTP 200 → rifiuto strutturale
```json
{
  "request": {
    "text": "cancella la nota del diario"
  },
  "plan": {
    "actionType": "refuse_forbidden",
    "refusalKind": "delete"
  }
}
```

### Catalogo — HTTP 200
```json
{
  "azioni": 8,
  "delete": 0,
  "nomi": [
    "read:read",
    "create_vital_sign:create",
    "update_patient_demographics:update",
    "update_narrative_section:update",
    "add_diary_note:create",
    "create_appointment:create",
    "update_appointment:update",
    "create_consegna:create"
  ]
}
```
