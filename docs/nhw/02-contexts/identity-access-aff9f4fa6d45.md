---
id: 'context.identity-access'
kind: 'bounded-context'
title: 'Identity and Access'
status: 'inferred'
summary: 'Identity and Access bounded context reconstructed from executable ClinicOS sources.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'prisma/schema.prisma'
    line_start: '38'
    line_end: '54'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '58'
    line_end: '65'
    confidence: 'observed'
  - path: 'prisma/schema.prisma'
    line_start: '21'
    line_end: '36'
    confidence: 'observed'
  - path: 'backend/src/routes/operators.ts'
    line_start: '58'
    line_end: '72'
    confidence: 'observed'
  - path: 'backend/src/routes/operators.ts'
    line_start: '77'
    line_end: '90'
    confidence: 'observed'
  - path: 'backend/src/routes/operators.ts'
    line_start: '123'
    line_end: '185'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.operator'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.operatorschedule'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts'
    confidence: 'inferred'
  - type: 'contains'
    target: 'data.model.user'
    evidence: 'prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,backend/src/routes/operators.ts,backend/src/routes/operators.ts,backend/src/routes/operators.ts'
    confidence: 'inferred'
tags:
  - 'bounded-context'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
inference_rule: 'Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership.'
---

## Question Answered

What does `context.identity-access` represent in ClinicOS?

## Canonical Definition

context.identity-access is the canonical bounded-context named Identity and Access.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.operator`
- `data.model.operatorschedule`
- `data.model.user`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:38-54`
- `prisma/schema.prisma:58-65`
- `prisma/schema.prisma:21-36`
- `backend/src/routes/operators.ts:58-72`
- `backend/src/routes/operators.ts:77-90`
- `backend/src/routes/operators.ts:123-185`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.operator`
- `contains` → `data.model.operatorschedule`
- `contains` → `data.model.user`
