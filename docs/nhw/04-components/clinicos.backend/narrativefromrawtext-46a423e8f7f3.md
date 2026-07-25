---
id: "component.backend.backend.src.ai.sections.narrative.narrativefromrawtext"
kind: "typescript-function"
title: "narrativeFromRawText"
status: "observed"
summary: "Exported function from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "narrativeFromRawText"
    line_start: "230"
    line_end: "243"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.narrativefromrawtext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.narrativefromrawtext is the canonical typescript-function named narrativeFromRawText.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `narrativeFromRawText`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:230-243` — narrativeFromRawText

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
