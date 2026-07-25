---
id: "component.backend.backend.src.lib.entra-auth.resetjwkscache"
kind: "typescript-function"
title: "resetJwksCache"
status: "observed"
summary: "Exported function from backend/src/lib/entra-auth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "resetJwksCache"
    line_start: "51"
    line_end: "53"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.lib.entra-auth.resetjwkscache` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.entra-auth.resetjwkscache is the canonical typescript-function named resetJwksCache.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/entra-auth.test.ts`
- `backend/src/__tests__/patient-documents-entra.test.ts`

## Invariants

The symbol is exported across its module boundary as `resetJwksCache`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/entra-auth.ts:51-53` — resetJwksCache

## Related Knowledge

- `belongs-to` → `project.backend`
