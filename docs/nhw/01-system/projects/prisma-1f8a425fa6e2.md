---
id: "project.prisma"
kind: "data-schema"
title: "prisma"
status: "observed"
summary: "prisma project rooted at prisma."
bounded_contexts: []
sources:
  - path: "prisma/schema.prisma"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma"
    confidence: "observed"
tags:
  - "project"
  - "data-schema"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `project.prisma` represent in ClinicOS?

## Canonical Definition

project.prisma is the canonical data-schema named prisma.

## Inputs

Project membership is inferred from its structural root.

## Outputs

Runtime or repository capability owned below `prisma`.

## Dependencies

None observed

## Side Effects

Defines persistent schema.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `prisma`.

## Failure Modes

None observed

## Evidence

- `prisma/schema.prisma`

## Related Knowledge

- `belongs-to` → `system.clinicos`
