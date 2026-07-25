---
id: "component.backend.backend.src.lib.entra-auth.requireentraoperator"
kind: "typescript-function"
title: "requireEntraOperator"
status: "observed"
summary: "Exported function from backend/src/lib/entra-auth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/lib/entra-auth.ts"
    symbol: "requireEntraOperator"
    line_start: "137"
    line_end: "160"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/lib/entra-auth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.lib.entra-auth.requireentraoperator` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.entra-auth.requireentraoperator is the canonical typescript-function named requireEntraOperator.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/patient-documents.ts`

## Invariants

The symbol is exported across its module boundary as `requireEntraOperator`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/entra-auth.ts:137-160` — requireEntraOperator

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
