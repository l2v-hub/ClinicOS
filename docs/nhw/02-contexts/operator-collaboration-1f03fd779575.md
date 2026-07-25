---
id: "context.operator-collaboration"
kind: "bounded-context"
title: "Operator Collaboration"
status: "inferred"
summary: "Operator Collaboration bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "prisma/schema.prisma"
    line_start: "178"
    line_end: "190"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "377"
    line_end: "394"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "396"
    line_end: "412"
    confidence: "observed"
  - path: "backend/src/routes/note.ts"
    line_start: "98"
    line_end: "113"
    confidence: "observed"
  - path: "backend/src/routes/note.ts"
    line_start: "14"
    line_end: "22"
    confidence: "observed"
  - path: "backend/src/routes/note.ts"
    line_start: "25"
    line_end: "53"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/note.ts,backend/src/routes/note.ts,backend/src/routes/note.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.consegna"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/note.ts,backend/src/routes/note.ts,backend/src/routes/note.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.nota"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/note.ts,backend/src/routes/note.ts,backend/src/routes/note.ts"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.operator-collaboration` represent in ClinicOS?

## Canonical Definition

context.operator-collaboration is the canonical bounded-context named Operator Collaboration.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.consegna`
- `data.model.nota`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:178-190`
- `prisma/schema.prisma:377-394`
- `prisma/schema.prisma:396-412`
- `backend/src/routes/note.ts:98-113`
- `backend/src/routes/note.ts:14-22`
- `backend/src/routes/note.ts:25-53`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.consegna`
- `contains` → `data.model.nota`
