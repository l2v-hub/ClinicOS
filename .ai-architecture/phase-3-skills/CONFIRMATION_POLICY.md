# Confirmation Policy — version 1

Code of record: `backend/src/skills/confirmation.ts` (`CONFIRMATION_POLICY_VERSION = 1`).

| class               | examples                                           | behaviour                                                                                              |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **READ**            | vitals.recent, patient.overview, handover.overview | executed without extra confirmation when the policy allows the tools                                   |
| **LOW_RISK_WRITE**  | handover.create                                    | preview + confirmation (an AI-initiated write is never silent)                                         |
| **SENSITIVE_WRITE** | vitals.record, diary.add_observation               | structured preview + explicit confirmation, read-back verification                                     |
| **HIGH_RISK**       | therapy.prescribe, administration.record           | never executed by the assistant: `DENIED (human_control_required)` + hand-off to the existing GUI flow |

Upgrade rule: if any tool of the skill has the Phase 2 policy effect `ALLOWED_WITH_CONFIRMATION` for
the caller, a READ skill also becomes preview + confirmation (`reason: policy_effect`). The Tool Layer
enforces it again (`confirmation_required` without `confirmed: true`).

## What counts as a confirmation

- `action: "confirm"` (UI button), or a whole-message explicit reply: «sì», «conferma», «confermo»,
  «ok», «procedi», «va bene», «esegui», «certo».
- Never the LLM: the Agno route has no confirm field; `sanitizeAgnoRoute` drops anything else.
- «sì ma cambia la pressione» / «sì, conferma» are NOT confirmations. A correction is accepted only
  when explicit: new vital-sign values, or «correggi: nuovo testo» for notes/handovers → new preview;
  anything else re-asks (the note text can never become «sì, conferma»).
- Cancellation: `action: "cancel"` or «annulla», «no», «lascia stare», «stop» → CANCELLED, no write.

## Preview (before commit)

`understand → prepare → preview → confirm → execute → verify → audit`

```json
{
  "skillId": "vitals.record",
  "action": "Registrazione parametri vitali",
  "patient": { "id": "…", "label": "Rossi Mario" },
  "values": { "Pressione": "120/80", "SpO₂": "97", "Orario rilevazione": "30/09, 18:10" },
  "notes": ["Autore: operatore corrente (risolto dal server)."],
  "origin": "ai",
  "tool": "parameters.create_reading",
  "confirmationClass": "SENSITIVE_WRITE"
}
```

The assistant says an operation happened only after the tool returned `ok`; writes are read back
(`parameters.list_readings`) when the identity may read them.

## Derived from real capabilities — to validate with the customer

- HIGH_RISK list (prescription, administration) mirrors Phase 2 critical capabilities.
- `handover.create` defaults (priorità normale, tipo Monitoraggio) — flagged in the catalog.
- Administrator READ_ONLY clinical reads inherited from the Phase 2 baseline (flagged in ROLE_SKILL_MATRIX).
