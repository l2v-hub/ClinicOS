---
id: 'data.model.operatorschedule'
kind: 'data-model'
title: 'OperatorSchedule'
status: 'observed'
summary: 'Prisma persistence model OperatorSchedule.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'OperatorSchedule'
    line_start: '58'
    line_end: '65'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.operator'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
tags:
  - 'prisma'
  - 'database-model'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `data.model.operatorschedule` represent in ClinicOS?

## Canonical Definition

data.model.operatorschedule is the canonical data-model named OperatorSchedule.

## Inputs

- `id: String` (id, required, default=cuid())
- `operatorId: String` (unique, required)
- `data: Json` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `operator: Operator` (required)

## Outputs

Persisted PostgreSQL row for `OperatorSchedule`.

## Dependencies

- - `operator` → `Operator` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `operatorId`: unique; required
- `data`: required
- `createdAt`: required
- `updatedAt`: required
- `operator`: required

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:58-65` — OperatorSchedule

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.operator`
