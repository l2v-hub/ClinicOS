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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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
