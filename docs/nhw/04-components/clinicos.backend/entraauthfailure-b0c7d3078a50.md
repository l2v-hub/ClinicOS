---
id: "component.backend.backend.src.lib.entra-auth.entraauthfailure"
kind: "typescript-type-alias"
title: "EntraAuthFailure"
status: "observed"
summary: "Exported type-alias from backend/src/lib/entra-auth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "EntraAuthFailure"
    line_start: "55"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.lib.entra-auth.entraauthfailure` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.entra-auth.entraauthfailure is the canonical typescript-type-alias named EntraAuthFailure.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `EntraAuthFailure`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/entra-auth.ts:55-57` — EntraAuthFailure

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
