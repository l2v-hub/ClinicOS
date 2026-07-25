---
id: "context.delivery-quality-governance"
kind: "bounded-context"
title: "Delivery, Quality, and Governance"
status: "inferred"
summary: "Delivery, Quality, and Governance bounded context reconstructed from executable ClinicOS sources."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "prisma/schema.prisma"
    line_start: "535"
    line_end: "551"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "prisma/schema.prisma"
    confidence: "inferred"
tags:
  - "bounded-context"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Grouped from cohesive model names, mounted route prefixes, UI consumers, and persistence ownership."
---

## Question Answered

What does `context.delivery-quality-governance` represent in ClinicOS?

## Canonical Definition

context.delivery-quality-governance is the canonical bounded-context named Delivery, Quality, and Governance.

## Inputs

Commands and queries routed to the context-owned APIs and components.

## Outputs

State transitions and read models owned by this context.

## Dependencies

None observed

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

## Related Knowledge

- `belongs-to` → `system.clinicos`
