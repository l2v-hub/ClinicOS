---
id: "flow.operator-collaboration"
kind: "runtime-flow"
title: "Consegne and notes collaboration"
status: "inferred"
summary: "Consegne and notes collaboration workflow across ClinicOS components."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/routes/consegne.ts"
    line_start: "107"
    line_end: "122"
    confidence: "observed"
  - path: "backend/src/routes/consegne.ts"
    line_start: "18"
    line_end: "28"
    confidence: "observed"
  - path: "backend/src/routes/consegne.ts"
    line_start: "31"
    line_end: "59"
    confidence: "observed"
  - path: "backend/src/routes/consegne.ts"
    line_start: "62"
    line_end: "104"
    confidence: "observed"
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "buildConsegnaPreview"
    line_start: "139"
    line_end: "154"
    confidence: "observed"
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "CONSEGNA_CMD_RE"
    line_start: "27"
    line_end: "28"
    confidence: "observed"
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "CONSEGNA_LEAD_RE"
    line_start: "30"
    line_end: "30"
    confidence: "observed"
  - path: "backend/src/ai/actions/consegne.ts"
    symbol: "CONSEGNA_PATIENT_RE"
    line_start: "34"
    line_end: "35"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.delete-consegne-by-param-48"
    evidence: "backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-consegne-45"
    evidence: "backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-consegne-46"
    evidence: "backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.put-consegne-by-param-47"
    evidence: "backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.consegne.buildconsegnapreview"
    evidence: "backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/routes/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts,backend/src/ai/actions/consegne.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.operator-collaboration` represent in ClinicOS?

## Canonical Definition

flow.operator-collaboration is the canonical runtime-flow named Consegne and notes collaboration.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.delete-consegne-by-param-48`
- `api.backend.get-consegne-45`
- `api.backend.post-consegne-46`
- `api.backend.put-consegne-by-param-47`
- `component.backend.backend.src.ai.actions.consegne.buildconsegnapreview`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/consegne.ts:107-122`
- `backend/src/routes/consegne.ts:18-28`
- `backend/src/routes/consegne.ts:31-59`
- `backend/src/routes/consegne.ts:62-104`
- `backend/src/ai/actions/consegne.ts:139-154` — buildConsegnaPreview
- `backend/src/ai/actions/consegne.ts:27-28` — CONSEGNA_CMD_RE
- `backend/src/ai/actions/consegne.ts:30-30` — CONSEGNA_LEAD_RE
- `backend/src/ai/actions/consegne.ts:34-35` — CONSEGNA_PATIENT_RE

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.delete-consegne-by-param-48`
- `invokes` → `api.backend.get-consegne-45`
- `invokes` → `api.backend.post-consegne-46`
- `invokes` → `api.backend.put-consegne-by-param-47`
- `invokes` → `component.backend.backend.src.ai.actions.consegne.buildconsegnapreview`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.delete-consegne-by-param-48` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.get-consegne-45` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.backend.post-consegne-46` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.backend.put-consegne-by-param-47` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `component.backend.backend.src.ai.actions.consegne.buildconsegnapreview` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.ai.actions.consegne.consegna-cmd-re` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.ai.actions.consegne.consegna-lead-re` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.ai.actions.consegne.consegna-patient-re` | Defined by cited component | Owning component error contract |
