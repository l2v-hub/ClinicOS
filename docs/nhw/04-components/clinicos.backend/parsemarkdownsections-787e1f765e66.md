---
id: "component.backend.backend.src.ai.sections.markdown-parse.parsemarkdownsections"
kind: "typescript-function"
title: "parseMarkdownSections"
status: "observed"
summary: "Exported function from backend/src/ai/sections/markdown-parse.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/markdown-parse.ts"
    symbol: "parseMarkdownSections"
    line_start: "147"
    line_end: "181"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/markdown-parse.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.markdown-parse.parsemarkdownsections` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.markdown-parse.parsemarkdownsections is the canonical typescript-function named parseMarkdownSections.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/markdown-parse.test.ts`

## Invariants

The symbol is exported across its module boundary as `parseMarkdownSections`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/markdown-parse.ts:147-181` — parseMarkdownSections

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
