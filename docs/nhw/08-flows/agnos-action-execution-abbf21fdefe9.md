---
id: "flow.agnos-action-execution"
kind: "runtime-flow"
title: "Agnos planning and allowlisted action execution"
status: "inferred"
summary: "Agnos planning and allowlisted action execution workflow across ClinicOS components."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "AgnosChannel"
    line_start: "43"
    line_end: "43"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "AgnosOperatorContext"
    line_start: "57"
    line_end: "61"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "AgnosPlan"
    line_start: "63"
    line_end: "63"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "AUDIT_CHANNEL"
    line_start: "45"
    line_end: "45"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "auditedActionType"
    line_start: "49"
    line_end: "54"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "defaultLoadPreviewContext"
    line_start: "131"
    line_end: "148"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "defaultRunRead"
    line_start: "120"
    line_end: "128"
    confidence: "observed"
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "derivePlan"
    line_start: "69"
    line_end: "86"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.orchestrate.agnoschannel"
    evidence: "backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext"
    evidence: "backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.actions.orchestrate.agnosplan"
    evidence: "backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts,backend/src/ai/actions/orchestrate.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.agnos-action-execution` represent in ClinicOS?

## Canonical Definition

flow.agnos-action-execution is the canonical runtime-flow named Agnos planning and allowlisted action execution.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `component.backend.backend.src.ai.actions.orchestrate.agnoschannel`
- `component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext`
- `component.backend.backend.src.ai.actions.orchestrate.agnosplan`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/ai/actions/orchestrate.ts:43-43` — AgnosChannel
- `backend/src/ai/actions/orchestrate.ts:57-61` — AgnosOperatorContext
- `backend/src/ai/actions/orchestrate.ts:63-63` — AgnosPlan
- `backend/src/ai/actions/orchestrate.ts:45-45` — AUDIT_CHANNEL
- `backend/src/ai/actions/orchestrate.ts:49-54` — auditedActionType
- `backend/src/ai/actions/orchestrate.ts:131-148` — defaultLoadPreviewContext
- `backend/src/ai/actions/orchestrate.ts:120-128` — defaultRunRead
- `backend/src/ai/actions/orchestrate.ts:69-86` — derivePlan

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `component.backend.backend.src.ai.actions.orchestrate.agnoschannel`
- `invokes` → `component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext`
- `invokes` → `component.backend.backend.src.ai.actions.orchestrate.agnosplan`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `component.backend.backend.src.ai.actions.orchestrate.agnoschannel` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.agnosoperatorcontext` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.agnosplan` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.audit-channel` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.auditedactiontype` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.defaultloadpreviewcontext` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.defaultrunread` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.ai.actions.orchestrate.deriveplan` | Defined by cited component | Owning component error contract |
