---
id: "component.frontend.frontend.src.types.diarioauthortype"
kind: "typescript-type-alias"
title: "DiarioAuthorType"
status: "observed"
summary: "Exported type-alias from frontend/src/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/types.ts"
    symbol: "DiarioAuthorType"
    line_start: "619"
    line_end: "620"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.types.diarioauthortype` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.diarioauthortype is the canonical typescript-type-alias named DiarioAuthorType.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx`

## Invariants

The symbol is exported across its module boundary as `DiarioAuthorType`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:619-620` — DiarioAuthorType

## Related Knowledge

- `belongs-to` → `project.frontend`
