---
id: "component.backend.backend.src.lib.entra-auth.entraidentity"
kind: "typescript-interface"
title: "EntraIdentity"
status: "observed"
summary: "Exported interface from backend/src/lib/entra-auth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "EntraIdentity"
    line_start: "59"
    line_end: "63"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.lib.entra-auth.entraidentity` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.entra-auth.entraidentity is the canonical typescript-interface named EntraIdentity.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `EntraIdentity`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/entra-auth.ts:59-63` — EntraIdentity

## Related Knowledge

- `belongs-to` → `project.backend`
