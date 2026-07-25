---
id: "component.backend.backend.src.ai.types.extractionfile"
kind: "typescript-interface"
title: "ExtractionFile"
status: "observed"
summary: "Exported interface from backend/src/ai/types.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/types.ts"
    symbol: "ExtractionFile"
    line_start: "7"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.types.extractionfile` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.extractionfile is the canonical typescript-interface named ExtractionFile.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `ExtractionFile`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:7-16` — ExtractionFile

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
