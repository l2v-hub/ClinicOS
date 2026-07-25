---
id: "context.therapy-administration"
kind: "bounded-context"
title: "Therapy Administration"
status: "inferred"
summary: "Therapy Administration bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "prisma/schema.prisma"
    line_start: "217"
    line_end: "239"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "259"
    line_end: "297"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "301"
    line_end: "314"
    confidence: "observed"
  - path: "backend/src/routes/patient-therapies.ts"
    line_start: "169"
    line_end: "188"
    confidence: "observed"
  - path: "backend/src/routes/patient-therapies.ts"
    line_start: "191"
    line_end: "217"
    confidence: "observed"
  - path: "backend/src/routes/therapy.ts"
    line_start: "26"
    line_end: "192"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.medicationadministration"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.therapyschedule"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/patient-therapies.ts,backend/src/routes/patient-therapies.ts,backend/src/routes/therapy.ts"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.therapy-administration` represent in ClinicOS?

## Canonical Definition

context.therapy-administration is the canonical bounded-context named Therapy Administration.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.medicationadministration`
- `data.model.therapyschedule`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:217-239`
- `prisma/schema.prisma:259-297`
- `prisma/schema.prisma:301-314`
- `backend/src/routes/patient-therapies.ts:169-188`
- `backend/src/routes/patient-therapies.ts:191-217`
- `backend/src/routes/therapy.ts:26-192`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.medicationadministration`
- `contains` → `data.model.therapyschedule`
