---
id: "flow.patient-lifecycle"
kind: "runtime-flow"
title: "Patient creation, resolution, update, and deletion"
status: "inferred"
summary: "Patient creation, resolution, update, and deletion workflow across ClinicOS components."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patients.ts"
    line_start: "889"
    line_end: "914"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "7"
    line_end: "18"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "28"
    line_end: "41"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "918"
    line_end: "938"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "22"
    line_end: "26"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "816"
    line_end: "877"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "718"
    line_end: "812"
    confidence: "observed"
  - path: "backend/src/routes/patients.ts"
    line_start: "75"
    line_end: "716"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.delete-patients-by-param-109"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-102"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-by-param-104"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-by-param-cartella-110"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.get-patients-settings-103"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.patch-patients-by-param-108"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-patients-107"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-patients-demo-setup-106"
    evidence: "backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts,backend/src/routes/patients.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.patient-lifecycle` represent in ClinicOS?

## Canonical Definition

flow.patient-lifecycle is the canonical runtime-flow named Patient creation, resolution, update, and deletion.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.delete-patients-by-param-109`
- `api.backend.get-patients-102`
- `api.backend.get-patients-by-param-104`
- `api.backend.get-patients-by-param-cartella-110`
- `api.backend.get-patients-settings-103`
- `api.backend.patch-patients-by-param-108`
- `api.backend.post-patients-107`
- `api.backend.post-patients-demo-setup-106`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/patients.ts:889-914`
- `backend/src/routes/patients.ts:7-18`
- `backend/src/routes/patients.ts:28-41`
- `backend/src/routes/patients.ts:918-938`
- `backend/src/routes/patients.ts:22-26`
- `backend/src/routes/patients.ts:816-877`
- `backend/src/routes/patients.ts:718-812`
- `backend/src/routes/patients.ts:75-716`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.backend.delete-patients-by-param-109`
- `invokes` → `api.backend.get-patients-102`
- `invokes` → `api.backend.get-patients-by-param-104`
- `invokes` → `api.backend.get-patients-by-param-cartella-110`
- `invokes` → `api.backend.get-patients-settings-103`
- `invokes` → `api.backend.patch-patients-by-param-108`
- `invokes` → `api.backend.post-patients-107`
- `invokes` → `api.backend.post-patients-demo-setup-106`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.delete-patients-by-param-109` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.get-patients-102` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.backend.get-patients-by-param-104` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.backend.get-patients-by-param-cartella-110` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `api.backend.get-patients-settings-103` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `api.backend.patch-patients-by-param-108` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `api.backend.post-patients-107` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `api.backend.post-patients-demo-setup-106` | Defined by cited component | Owning component error contract |
