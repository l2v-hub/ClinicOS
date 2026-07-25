---
id: "component.frontend.frontend.src.components.shared.sections.types.sourcerange"
kind: "typescript-interface"
title: "SourceRange"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "SourceRange"
    line_start: "39"
    line_end: "44"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.sourcerange` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.sourcerange is the canonical typescript-interface named SourceRange.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `SourceRange`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:39-44` — SourceRange

## Related Knowledge

- `belongs-to` → `project.frontend`
