---
id: 'data.model.cartella'
kind: 'data-model'
title: 'Cartella'
status: 'observed'
summary: 'Prisma persistence model Cartella.'
bounded_contexts:
  - 'context.clinical-record'
sources:
  - path: 'prisma/schema.prisma'
    symbol: 'Cartella'
    line_start: '150'
    line_end: '157'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.prisma'
    evidence: 'prisma/schema.prisma'
    confidence: 'observed'
  - type: 'depends-on'
    target: 'data.model.patient'
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

What does `data.model.cartella` represent in ClinicOS?

## Canonical Definition

data.model.cartella is the canonical data-model named Cartella.

## Inputs

- `id: String` (id, required, default=cuid())
- `patientId: String` (unique, required)
- `data: Json` (required)
- `createdAt: DateTime` (required, default=now())
- `updatedAt: DateTime` (required)
- `patient: Patient` (required)

## Outputs

Persisted PostgreSQL row for `Cartella`.

## Dependencies

- - `patient` → `Patient` (required-one; onDelete=Cascade)

## Side Effects

Database reads and writes through Prisma clients.

## Consumers

Backend routes, services, migrations, and operational jobs.

## Invariants

- `id`: identifier; required
- `patientId`: unique; required
- `data`: required
- `createdAt`: required
- `updatedAt`: required
- `patient`: required

## Failure Modes

Constraint violations, relation violations, unavailable database, or Prisma operation errors.

## Evidence

- `prisma/schema.prisma:150-157` — Cartella

## Related Knowledge

- `belongs-to` → `project.prisma`
- `depends-on` → `data.model.patient`
