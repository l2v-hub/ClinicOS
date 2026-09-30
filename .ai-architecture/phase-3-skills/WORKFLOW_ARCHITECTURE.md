# Workflow Architecture — Phase 3

```
Identity (Role Simulator today / Entra later, requireOperator)
  → Role/Policy (requireAuthorizationContext; evaluateTools() = same hook as GET /tools, every turn)
  → Intent (Agno skill router, deterministic fallback)            backend/src/skills/interpreter.ts
  → Skill (catalog of compositions)                                backend/src/skills/catalog.ts
  → Workflow (explicit structured state, one turn per call)        backend/src/skills/engine.ts
  → Authorized Tools (ToolRegistry.invoke, re-authorized per call) backend/src/skills/executors.ts
  → Existing business logic (Phase 1 services)                     backend/src/tools/capabilities/*
  → Result (verified: write read back when the identity may read)
  → Audit (AiAuditEvent: skill:<id>:<stage> + tool:<name>)
```

No external workflow engine: a small state machine with an in-process store (`store.ts`, TTL 30 min,
bounded, owner-bound, pluggable `WorkflowStore` interface for a DB-backed store later).

## State contract (`WorkflowState`, `backend/src/skills/types.ts`)

| field                   | meaning                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `id`                    | UUID, also the audit correlation `skill-<id>` and the tool `requestId`              |
| `operatorId` / `roleId` | owner (only the owner can read/drive it) / policy role at start (informative)       |
| `skillId`, `status`     | skill and current state                                                             |
| `slots`                 | `patient {id,label}`, `patientQuery`, `values`, `text`, `date`, `query`, `at`       |
| `pending`               | slot the workflow is waiting for (`patient` / `values` / `text` / `query` / `date`) |
| `candidates`            | ambiguous targets offered to the user (never auto-picked)                           |
| `preview`               | structured preview (patient, action, values, notes, origin `ai`, tool, class)       |
| `writeRequestId`        | stable id of the write, reused on retry (idempotent tools dedupe it)                |
| `result` / `error`      | verified tool result / `{code, message}` from the backend                           |
| `interpreter`           | `agno` or `deterministic` (who selected the skill)                                  |
| `version` | optimistic concurrency: a save from a stale copy is refused (`WorkflowConflictError` → the turn answers with the current state, does nothing) |
| `history`               | ordered events (START … COMPLETED)                                                  |

### States

`START → CONTEXT_REQUIRED → (NEEDS_CLARIFICATION)* → READY → [NEEDS_CONFIRMATION] → EXECUTING → COMPLETED`
with exits `DENIED` (policy / human-only), `FAILED` (backend error, stale context), `CANCELLED` (user).
Terminal: COMPLETED, DENIED, FAILED, CANCELLED. `retry` is accepted only from FAILED for
requestId-idempotent writes (`vitals.record`, `handover.create`).

Invariants (tested, see E2E_TEST_REPORT.md):

1. policy evaluated at every turn and again by the Tool Layer at every call (revocation → DENIED);
2. no write without a resolved, unambiguous target and an explicit confirmation;
3. EXECUTING/COMPLETED block replays; the reply claims success only when the tool returned ok;
4. another identity gets `workflow_not_found` (no read, no drive);
5. two turns racing on the same workflow cannot both act (compare-and-set on `version`; QA H1 test).

## Context contract

| context         | source                                                                              | rule                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| identity, role  | server (session + active policy)                                                    | never from the body                                                                                          |
| capabilities    | `evaluateTools()` per turn                                                          | skill available ⇔ all required tools allowed                                                                 |
| current patient | `context.currentPatientId` from the page (+ display `currentPatientLabel`)          | used ONLY when the user refers to it ("questo ospite"); verified through `patients.clinical_summary` (exactly one row with the same id); the preview label comes from `patients.search` rows with the same id (client label = search hint only) |
| named patient   | `patients.search`                                                                   | 1 match → resolved; 0 or >1 → NEEDS_CLARIFICATION with candidates                                            |
| values          | parsed, validated with the service's own `parseParameterReading` before the preview | invalid → NEEDS_CLARIFICATION                                                                                |
| workflow state  | server store                                                                        | the LLM's memory is never a source of truth                                                                  |

"aggiungi pressione 120/80" without a target → `NEEDS_CLARIFICATION (pending: patient)`, no write,
even if the page has a patient open (the reply suggests «questo ospite»).

## API (`backend/src/skills/http.ts`)

- `GET /skills` → `{role, confirmationPolicyVersion, skills:[{id,name,description,category,kind,confirmationClass,confirmation,executable,available,partial,missingRequired,missingOptional,slots}]}`
- `POST /skills/converse` `{message?, workflowId?, action?: confirm|cancel|retry, context?: {currentPatientId?, currentPatientLabel?}}` →
  `{workflowId, status, skillId, reply, pending?, candidates?, preview?, result?, error?, interpreter?, suggestions?}`
- `GET /skills/workflows/:id` → state of the caller's own workflow

`/skills` is a self-governed prefix of the route gate (like `/tools`): it reads/writes nothing by
itself, every data access is a Tool Layer call with the caller's identity.

## Known limits

- In-process store: a backend restart drops open workflows (nothing half-written; the user restarts).
- Skill selection keywords (fallback) are Italian-only.
- `patients.search` treats a 16-character alphanumeric query as a codice fiscale (pre-existing): the
  skill retries with the longest token and filters on all tokens.
