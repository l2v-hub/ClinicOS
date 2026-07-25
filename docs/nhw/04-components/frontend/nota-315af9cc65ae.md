---
id: "component.frontend.frontend.src.types.nota"
kind: "typescript-interface"
title: "Nota"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Nota"
    line_start: "256"
    line_end: "268"
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

What does `component.frontend.frontend.src.types.nota` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.nota is the canonical typescript-interface named Nota.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/shared/NotesPage.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `Nota`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:256-268` — Nota

## Related Knowledge

- `belongs-to` → `project.frontend`
