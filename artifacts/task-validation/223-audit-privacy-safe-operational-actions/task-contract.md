# Task Contract

## Task
- Title: 223 audit privacy safe operational actions
- Slug: 223-audit-privacy-safe-operational-actions
- Type: change
- Date: 2026-07-06
- GitHub Issue: #223 (Audit privacy-safe delle azioni operative, p0, parent #163)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no (colonna String invariata; solo commento aggiornato) |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

L'audit persistente PHI-safe (`ai/audit-store.ts::recordAuditEvent`) esiste ma è modellato per le azioni
Agnos (channel `testo`|`voce`). Le azioni operative UI/REST non hanno un helper standard: manca una primitiva
condivisa che registri actor/action/entity/outcome/timestamp in modo PHI-safe (nomi di campo, mai payload).

## Expected Behaviour

Esiste `recordOperationalAudit(...)` che standardizza l'audit minimale per le azioni operative UI/Agnos:
actor (id/ruolo), action (`entita.verbo` + kind), entity (patientId opzionale), outcome, timestamp, channel
`ui`. Per costruzione l'API accetta SOLO id e NOMI di campo — nessun parametro può trasportare payload/valori
clinici o segreti. Test che verificano i record sanitizzati.

## Acceptance Criteria

- AC1: Audit records actor/action/entity/outcome/timestamp — l'evento prodotto li contiene tutti.
- AC2: Audit excludes PHI-heavy payloads and secrets — l'API non accetta valori/payload; solo id + nomi campo.
- AC3: Tests verify sanitized audit records — test sul mapping + assenza PHI, via spy `setAuditPersistence`.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `operational-audit.test.ts`: mapping actor/action/entity/outcome/timestamp + channel `ui` + solo nomi campo |
| Integration | no | |
| API | no | Helper puro; le route lo adotteranno nei rispettivi issue |
| Playwright | no | Nessuna UI |
| Persistence after refresh | no | |
| Security/privacy scan | yes | È l'oggetto del task |

## Evidence Plan

- validation-report.md
- output test `operational-audit.test.ts` verde → test-results/
- registrazione nella lista `backend/package.json`

## Risks

- Rischio: helper non adottato dalle route (seam isolata). Mitigazione: superficie minima e standard; l'adozione
  per-dominio è nei rispettivi issue (#214 consegne, ecc.). Il valore qui è la primitiva PHI-safe + i test.
- Rischio: falso senso di sicurezza. Mitigazione: l'API accetta SOLO id/nomi (nessun campo payload) → PHI
  strutturalmente impossibile.

## Gate Status

READY FOR IMPLEMENTATION
