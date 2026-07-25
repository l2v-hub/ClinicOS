---
id: "flow.patient-diary-narrative"
kind: "runtime-flow"
title: "Patient diary and narrative management"
status: "inferred"
summary: "Patient diary and narrative management workflow across ClinicOS components."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/narrative-sections.ts"
    line_start: "20"
    line_end: "27"
    confidence: "observed"
  - path: "backend/src/routes/narrative-sections.ts"
    line_start: "30"
    line_end: "42"
    confidence: "observed"
  - path: "backend/src/routes/narrative-sections.ts"
    line_start: "72"
    line_end: "72"
    confidence: "observed"
  - path: "backend/src/routes/internal-ai.ts"
    line_start: "98"
    line_end: "101"
    confidence: "observed"
  - path: "backend/src/routes/narrative-sections.ts"
    line_start: "71"
    line_end: "71"
    confidence: "observed"
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "annToTag"
    line_start: "128"
    line_end: "136"
    confidence: "observed"
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "buildField"
    line_start: "100"
    line_end: "126"
    confidence: "observed"
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "buildNarrativeDraft"
    line_start: "139"
    line_end: "210"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-by-param-narrative-sections-72"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-by-param-narrative-sections-by-param-73"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.patch-patients-by-param-narrative-sections-by-param-75"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-internal-ai-patient-narrative-sections-66"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.put-patients-by-param-narrative-sections-by-param-74"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.sections.narrative.buildnarrativedraft"
    evidence: "backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/narrative-sections.ts,backend/src/routes/internal-ai.ts,backend/src/routes/narrative-sections.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts,backend/src/ai/sections/narrative.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.patient-diary-narrative` represent in ClinicOS?

## Canonical Definition

flow.patient-diary-narrative is the canonical runtime-flow named Patient diary and narrative management.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.get-patients-by-param-narrative-sections-72`
- `api.backend.get-patients-by-param-narrative-sections-by-param-73`
- `api.backend.patch-patients-by-param-narrative-sections-by-param-75`
- `api.backend.post-internal-ai-patient-narrative-sections-66`
- `api.backend.put-patients-by-param-narrative-sections-by-param-74`
- `component.backend.backend.src.ai.sections.narrative.buildnarrativedraft`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/narrative-sections.ts:20-27`
- `backend/src/routes/narrative-sections.ts:30-42`
- `backend/src/routes/narrative-sections.ts:72-72`
- `backend/src/routes/internal-ai.ts:98-101`
- `backend/src/routes/narrative-sections.ts:71-71`
- `backend/src/ai/sections/narrative.ts:128-136` — annToTag
- `backend/src/ai/sections/narrative.ts:100-126` — buildField
- `backend/src/ai/sections/narrative.ts:139-210` — buildNarrativeDraft

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.get-patients-by-param-narrative-sections-72`
- `invokes` → `api.backend.get-patients-by-param-narrative-sections-by-param-73`
- `invokes` → `api.backend.patch-patients-by-param-narrative-sections-by-param-75`
- `invokes` → `api.backend.post-internal-ai-patient-narrative-sections-66`
- `invokes` → `api.backend.put-patients-by-param-narrative-sections-by-param-74`
- `invokes` → `component.backend.backend.src.ai.sections.narrative.buildnarrativedraft`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.get-patients-by-param-narrative-sections-72` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.get-patients-by-param-narrative-sections-by-param-73` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.backend.patch-patients-by-param-narrative-sections-by-param-75` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.backend.post-internal-ai-patient-narrative-sections-66` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `api.backend.put-patients-by-param-narrative-sections-by-param-74` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.ai.sections.narrative.anntotag` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.ai.sections.narrative.buildfield` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.ai.sections.narrative.buildnarrativedraft` | Defined by cited component | Owning component error contract |
