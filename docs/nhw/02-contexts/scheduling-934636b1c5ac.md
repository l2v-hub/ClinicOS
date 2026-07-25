---
id: "context.scheduling"
kind: "bounded-context"
title: "Scheduling"
status: "inferred"
summary: "Scheduling bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "prisma/schema.prisma"
    line_start: "192"
    line_end: "215"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "58"
    line_end: "65"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "301"
    line_end: "314"
    confidence: "observed"
  - path: "backend/src/routes/appointments.ts"
    line_start: "125"
    line_end: "140"
    confidence: "observed"
  - path: "backend/src/routes/appointments.ts"
    line_start: "20"
    line_end: "39"
    confidence: "observed"
  - path: "backend/src/routes/operators.ts"
    line_start: "77"
    line_end: "90"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/operators.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.appointment"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/appointments.ts,backend/src/routes/appointments.ts,backend/src/routes/operators.ts"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.scheduling` represent in ClinicOS?

## Canonical Definition

context.scheduling is the canonical bounded-context named Scheduling.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.appointment`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:192-215`
- `prisma/schema.prisma:58-65`
- `prisma/schema.prisma:301-314`
- `backend/src/routes/appointments.ts:125-140`
- `backend/src/routes/appointments.ts:20-39`
- `backend/src/routes/operators.ts:77-90`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.appointment`
