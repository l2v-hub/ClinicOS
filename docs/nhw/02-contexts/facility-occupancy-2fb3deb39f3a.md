---
id: "context.facility-occupancy"
kind: "bounded-context"
title: "Facility Occupancy"
status: "inferred"
summary: "Facility Occupancy bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.facility-occupancy"
sources:
  - path: "prisma/schema.prisma"
    line_start: "343"
    line_end: "356"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "358"
    line_end: "375"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "330"
    line_end: "341"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    line_start: "458"
    line_end: "485"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    line_start: "293"
    line_end: "325"
    confidence: "observed"
  - path: "backend/src/routes/admin-rooms.ts"
    line_start: "643"
    line_end: "662"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.bed"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.room"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts,backend/src/routes/admin-rooms.ts"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.facility-occupancy` represent in ClinicOS?

## Canonical Definition

context.facility-occupancy is the canonical bounded-context named Facility Occupancy.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.bed`
- `data.model.room`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:343-356`
- `prisma/schema.prisma:358-375`
- `prisma/schema.prisma:330-341`
- `backend/src/routes/admin-rooms.ts:458-485`
- `backend/src/routes/admin-rooms.ts:293-325`
- `backend/src/routes/admin-rooms.ts:643-662`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.bed`
- `contains` → `data.model.room`
