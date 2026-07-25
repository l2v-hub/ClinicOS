---
id: "component.frontend.frontend.src.components.shared.sections.dateprefix.detectdateprefixannotations"
kind: "typescript-function"
title: "detectDatePrefixAnnotations"
status: "observed"
summary: "Exported function from frontend/src/components/shared/sections/datePrefix.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "frontend/src/components/shared/sections/datePrefix.ts"
    symbol: "detectDatePrefixAnnotations"
    line_start: "26"
    line_end: "42"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/datePrefix.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.dateprefix.detectdateprefixannotations` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.dateprefix.detectdateprefixannotations is the canonical typescript-function named detectDatePrefixAnnotations.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/__tests__/datePrefix.test.ts`

## Invariants

The symbol is exported across its module boundary as `detectDatePrefixAnnotations`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/datePrefix.ts:26-42` — detectDatePrefixAnnotations

## Related Knowledge

- `belongs-to` → `project.frontend`
