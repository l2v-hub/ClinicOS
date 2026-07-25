---
id: "flow.patient-intake"
kind: "runtime-flow"
title: "Patient intake extraction, review, apply, and confirmation"
status: "inferred"
summary: "Patient intake extraction, review, apply, and confirmation workflow across ClinicOS components."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/intake-drafts.ts"
    line_start: "75"
    line_end: "83"
    confidence: "observed"
  - path: "backend/src/routes/intake-drafts.ts"
    line_start: "86"
    line_end: "94"
    confidence: "observed"
  - path: "backend/src/routes/patient-intake.ts"
    line_start: "112"
    line_end: "136"
    confidence: "observed"
  - path: "backend/src/routes/intake-drafts.ts"
    line_start: "97"
    line_end: "105"
    confidence: "observed"
  - path: "backend/src/routes/intake-drafts.ts"
    line_start: "59"
    line_end: "72"
    confidence: "observed"
  - path: "backend/src/routes/intake-drafts.ts"
    line_start: "110"
    line_end: "121"
    confidence: "observed"
  - path: "backend/src/routes/intake-drafts.ts"
    line_start: "40"
    line_end: "56"
    confidence: "observed"
  - path: "backend/src/routes/patient-intake.ts"
    line_start: "83"
    line_end: "108"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-intake-drafts-52"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-intake-drafts-by-param-53"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patient-intake-documents-by-param-96"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.patch-intake-drafts-by-param-54"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-intake-drafts-51"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-intake-drafts-by-param-confirm-55"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-intake-drafts-from-import-50"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-patient-intake-discharge-letter-apply-95"
    evidence: "backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/intake-drafts.ts,backend/src/routes/patient-intake.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.patient-intake` represent in ClinicOS?

## Canonical Definition

flow.patient-intake is the canonical runtime-flow named Patient intake extraction, review, apply, and confirmation.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.get-intake-drafts-52`
- `api.backend.get-intake-drafts-by-param-53`
- `api.backend.get-patient-intake-documents-by-param-96`
- `api.backend.patch-intake-drafts-by-param-54`
- `api.backend.post-intake-drafts-51`
- `api.backend.post-intake-drafts-by-param-confirm-55`
- `api.backend.post-intake-drafts-from-import-50`
- `api.backend.post-patient-intake-discharge-letter-apply-95`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/intake-drafts.ts:75-83`
- `backend/src/routes/intake-drafts.ts:86-94`
- `backend/src/routes/patient-intake.ts:112-136`
- `backend/src/routes/intake-drafts.ts:97-105`
- `backend/src/routes/intake-drafts.ts:59-72`
- `backend/src/routes/intake-drafts.ts:110-121`
- `backend/src/routes/intake-drafts.ts:40-56`
- `backend/src/routes/patient-intake.ts:83-108`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.get-intake-drafts-52`
- `invokes` → `api.backend.get-intake-drafts-by-param-53`
- `invokes` → `api.backend.get-patient-intake-documents-by-param-96`
- `invokes` → `api.backend.patch-intake-drafts-by-param-54`
- `invokes` → `api.backend.post-intake-drafts-51`
- `invokes` → `api.backend.post-intake-drafts-by-param-confirm-55`
- `invokes` → `api.backend.post-intake-drafts-from-import-50`
- `invokes` → `api.backend.post-patient-intake-discharge-letter-apply-95`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.get-intake-drafts-52` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.get-intake-drafts-by-param-53` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.backend.get-patient-intake-documents-by-param-96` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.backend.patch-intake-drafts-by-param-54` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `api.backend.post-intake-drafts-51` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `api.backend.post-intake-drafts-by-param-confirm-55` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `api.backend.post-intake-drafts-from-import-50` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `api.backend.post-patient-intake-discharge-letter-apply-95` | Defined by cited component | Owning component error contract |
