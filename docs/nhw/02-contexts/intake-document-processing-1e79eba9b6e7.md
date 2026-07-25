---
id: "context.intake-document-processing"
kind: "bounded-context"
title: "Intake and Document Processing"
status: "inferred"
summary: "Intake and Document Processing bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "prisma/schema.prisma"
    line_start: "494"
    line_end: "505"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "507"
    line_end: "530"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "457"
    line_end: "491"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "241"
    line_end: "257"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "437"
    line_end: "451"
    confidence: "observed"
  - path: "backend/src/routes/ai-jobs.ts"
    line_start: "116"
    line_end: "123"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/ai-jobs.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.importaudit"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/ai-jobs.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.importjob"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/ai-jobs.ts"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.intake-document-processing` represent in ClinicOS?

## Canonical Definition

context.intake-document-processing is the canonical bounded-context named Intake and Document Processing.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.importaudit`
- `data.model.importjob`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:494-505`
- `prisma/schema.prisma:507-530`
- `prisma/schema.prisma:457-491`
- `prisma/schema.prisma:241-257`
- `prisma/schema.prisma:437-451`
- `backend/src/routes/ai-jobs.ts:116-123`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.importaudit`
- `contains` → `data.model.importjob`
