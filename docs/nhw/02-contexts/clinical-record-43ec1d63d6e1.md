---
id: "context.clinical-record"
kind: "bounded-context"
title: "Clinical Record"
status: "inferred"
summary: "Clinical Record bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "prisma/schema.prisma"
    line_start: "150"
    line_end: "157"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "178"
    line_end: "190"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "159"
    line_end: "176"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "507"
    line_end: "530"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "414"
    line_end: "432"
    confidence: "observed"
  - path: "prisma/schema.prisma"
    line_start: "132"
    line_end: "148"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.cartella"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.clinicalnote"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.clinicalrecord"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma"
    confidence: "inferred"
  - type: "contains"
    target: "data.model.importdocument"
    evidence: "prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma,prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.clinical-record` represent in ClinicOS?

## Canonical Definition

context.clinical-record is the canonical bounded-context named Clinical Record.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

- `data.model.cartella`
- `data.model.clinicalnote`
- `data.model.clinicalrecord`
- `data.model.importdocument`

## Side Effects

Defined by owned endpoint and persistence units.

## Consumers

Frontend workflows and cross-context runtime flows.

## Invariants

Ownership is assigned by observed cohesion; cross-context dependencies remain explicit graph edges.

## Failure Modes

Context-level failures are the union of owned endpoint, domain, persistence, and integration failures.

## Evidence

- `prisma/schema.prisma:150-157`
- `prisma/schema.prisma:178-190`
- `prisma/schema.prisma:159-176`
- `prisma/schema.prisma:507-530`
- `prisma/schema.prisma:414-432`
- `prisma/schema.prisma:132-148`

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `contains` → `data.model.cartella`
- `contains` → `data.model.clinicalnote`
- `contains` → `data.model.clinicalrecord`
- `contains` → `data.model.importdocument`
