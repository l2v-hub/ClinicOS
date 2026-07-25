---
id: "component.backend.backend.src.ai.sections.markdown-parse.narrativesectioncontentlosterror"
kind: "typescript-class"
title: "NarrativeSectionContentLostError"
status: "observed"
summary: "Exported class from backend/src/ai/sections/markdown-parse.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/markdown-parse.ts"
    symbol: "NarrativeSectionContentLostError"
    line_start: "265"
    line_end: "272"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/markdown-parse.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.markdown-parse.narrativesectioncontentlosterror` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.markdown-parse.narrativesectioncontentlosterror is the canonical typescript-class named NarrativeSectionContentLostError.

## Inputs

Defined by the source signature at the cited span.

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/markdown-parse.test.ts`

## Invariants

The symbol is exported across its module boundary as `NarrativeSectionContentLostError`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/markdown-parse.ts:265-272` — NarrativeSectionContentLostError

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
