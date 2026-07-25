---
id: "component.frontend.frontend.src.components.shared.sections.types.semanticannotation"
kind: "typescript-interface"
title: "SemanticAnnotation"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/types.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/components/shared/sections/types.ts"
    symbol: "SemanticAnnotation"
    line_start: "32"
    line_end: "37"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.types.semanticannotation` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.types.semanticannotation is the canonical typescript-interface named SemanticAnnotation.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/NarrativeClinicalSection.tsx`
- `frontend/src/components/shared/sections/SemanticTaggedText.tsx`
- `frontend/src/components/shared/sections/__tests__/segments.test.ts`
- `frontend/src/components/shared/sections/datePrefix.ts`
- `frontend/src/components/shared/sections/deriveSections.ts`
- `frontend/src/components/shared/sections/segments.ts`

## Invariants

The symbol is exported across its module boundary as `SemanticAnnotation`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/types.ts:32-37` — SemanticAnnotation

## Related Knowledge

- `belongs-to` → `project.frontend`
