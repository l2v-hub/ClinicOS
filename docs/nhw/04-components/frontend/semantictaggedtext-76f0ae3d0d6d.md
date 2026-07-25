---
id: "component.frontend.frontend.src.components.shared.sections.semantictaggedtext.semantictaggedtext"
kind: "typescript-react-component"
title: "SemanticTaggedText"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/sections/SemanticTaggedText.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/sections/SemanticTaggedText.tsx"
    symbol: "SemanticTaggedText"
    line_start: "24"
    line_end: "58"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/SemanticTaggedText.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.semantictaggedtext.semantictaggedtext` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.semantictaggedtext.semantictaggedtext is the canonical typescript-react-component named SemanticTaggedText.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/ImportSectionsReview.tsx`
- `frontend/src/components/shared/sections/NarrativeClinicalSection.tsx`

## Invariants

The symbol is exported across its module boundary as `SemanticTaggedText`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/SemanticTaggedText.tsx:24-58` — SemanticTaggedText

## Related Knowledge

- `belongs-to` → `project.frontend`
