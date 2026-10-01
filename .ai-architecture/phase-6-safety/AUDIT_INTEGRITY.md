# Phase 6 — Audit Integrity

## 1. Audit contract (policy-sensitive and write actions)

Table `AiAuditEvent`. A confirmed Assistant write produces, under one `requestId`
(`skill-<workflowId>`):

| Row (`actionType`)        | Carries                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `skill:<id>:request` | identity (`operatorId`), role (`operatorRole`), channel `ai_assistant`, `input:voice` when dictated, `interpreter:*` — resident not yet resolved (`patientId` null) |
| `skill:<id>:proposal` | resident (`patientId`), `preview:<previewId>` |
| `skill:<id>:confirmation` | `ui_event` (button), preview id, resident |
| `tool:<tool>` | Tool Layer outcome ok / denied / error, origin, resident (same `requestId`) |
| `skill:<id>:execute` | final outcome, resident; vitals also log the read-back `tool:parameters.list_readings` |

Classic GUI writes keep their operational audit rows (`diary_create`, `therapy_create`,
`diary_therapy_create`, …) with the authenticated operator; Phase 6 propagates the Tool origin
so an AI-prepared prescription is recorded with channel `ai`/`ai_assistant`, not `ui`.

Fields recorded: identity, role, resident, skill, tool, preview id (payload binding),
confirmation, origin/channel, timestamp, outcome. Never recorded: audio, transcript text,
clinical free text, secrets.

## 2. Guarantees and evidence

| Guarantee                                 | Mechanism                                                                                                                                        | Test            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Every write is reconstructable            | request → proposal → confirmation → tool → execute rows, same identity / channel / resident                                                      | AUD-01          |
| Identity cannot be spoofed                | operatorId from the verified session                                                                                                             | AUD-02          |
| Origin is truthful for AI-prepared writes | `OperationalAuditInput.channel` from Tool `ctx.origin` (Phase 6 fix G6)                                                                          | AUD-03          |
| History cannot change retroactively       | Triggers `clinicos_ai_audit_append_only` refuse UPDATE / DELETE (row) and TRUNCATE (statement) — migration `20261001090000_ai_audit_append_only` | AUD-04          |
| Failure never logged as success           | execute row written after the outcome; denied stays denied                                                                                       | AUD-05, PROV-02 |
| Denied tool calls are logged              | Tool Layer `denied` rows                                                                                                                         | AUTH-01         |
| Infrastructure failures are logged        | Tool Layer `error` rows (`scope_unavailable`)                                                                                                    | FC-04           |
| Body-scoped writes carry the resident     | `patientIdOf` reads `body.patientId` / `pazienteId` (Phase 6 fix G7)                                                                             | AUD-01          |
| Preview equals saved data                 | executor uses the stored preview payload; administration re-check                                                                                | AUD-01, TX-05   |

## 3. Operational notes

- Tests no longer delete audit rows (`patient-diary-therapy-db.test.ts`, `tools/__tests__/diary.test.ts`
  had `aiAuditEvent.deleteMany`; removed because the trigger refuses it — test databases
  accumulate rows, which is the intended production behaviour).
- Retention / purge, if ever required by GDPR, must be an explicit, audited DB-operations
  procedure (drop trigger → purge → recreate) — never application code.
- A DB superuser can still disable the trigger; protection against that belongs to database
  governance (roles, backups, log shipping), out of scope for the application.
