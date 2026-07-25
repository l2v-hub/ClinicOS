---
id: "component.frontend.frontend.src.icons.icochevronleft"
kind: "typescript-react-component"
title: "IcoChevronLeft"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoChevronLeft"
    line_start: "118"
    line_end: "129"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icochevronleft` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icochevronleft is the canonical typescript-react-component named IcoChevronLeft.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminAgenda.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoChevronLeft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:118-129` — IcoChevronLeft

## Related Knowledge

- `belongs-to` → `project.frontend`
