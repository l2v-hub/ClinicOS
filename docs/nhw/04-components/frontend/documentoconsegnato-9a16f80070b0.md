---
id: "component.frontend.frontend.src.types.documentoconsegnato"
kind: "typescript-interface"
title: "DocumentoConsegnato"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/types.ts"
    symbol: "DocumentoConsegnato"
    line_start: "577"
    line_end: "589"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.documentoconsegnato` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.documentoconsegnato is the canonical typescript-interface named DocumentoConsegnato.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/DocumentiTab.tsx`

## Invariants

The symbol is exported across its module boundary as `DocumentoConsegnato`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:577-589` — DocumentoConsegnato

## Related Knowledge

- `belongs-to` → `project.frontend`
