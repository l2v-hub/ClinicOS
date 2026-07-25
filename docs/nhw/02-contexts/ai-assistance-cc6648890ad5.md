---
id: "context.ai-assistance"
kind: "bounded-context"
title: "AI Assistance"
status: "inferred"
summary: "AI Assistance bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "prisma/schema.prisma"
    line_start: "535"
    line_end: "551"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "494"
    line_end: "505"
    confidence: "observed"
  - path: "backend/src/routes/ai-jobs.ts"
    line_start: "116"
    line_end: "123"
    confidence: "observed"
  - path: "backend/src/routes/ai-actions.ts"
    line_start: "77"
    line_end: "79"
    confidence: "observed"
  - path: "backend/src/routes/ai-audit.ts"
    line_start: "29"
    line_end: "69"
    confidence: "observed"
  - path: "backend/src/routes/ai-extraction.ts"
    line_start: "19"
    line_end: "35"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/ai-jobs.ts,backend/src/routes/ai-actions.ts,backend/src/routes/ai-audit.ts,backend/src/routes/ai-extraction.ts"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.aiauditevent"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/ai-jobs.ts,backend/src/routes/ai-actions.ts,backend/src/routes/ai-audit.ts,backend/src/routes/ai-extraction.ts"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.ai-assistance` represent in ClinicOS?

## Canonical Definition

context.ai-assistance is the canonical bounded-context named AI Assistance.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.aiauditevent`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:535-551`
- `prisma/schema.prisma:494-505`
- `backend/src/routes/ai-jobs.ts:116-123`
- `backend/src/routes/ai-actions.ts:77-79`
- `backend/src/routes/ai-audit.ts:29-69`
- `backend/src/routes/ai-extraction.ts:19-35`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.aiauditevent`
