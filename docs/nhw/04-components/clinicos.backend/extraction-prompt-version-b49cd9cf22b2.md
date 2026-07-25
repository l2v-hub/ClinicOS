---
id: "component.backend.backend.src.ai.version.extraction-prompt-version"
kind: "typescript-constant"
title: "EXTRACTION_PROMPT_VERSION"
status: "observed"
summary: "Exported constant from backend/src/ai/version.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/version.ts"
    symbol: "EXTRACTION_PROMPT_VERSION"
    line_start: "5"
    line_end: "5"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/version.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.version.extraction-prompt-version` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.version.extraction-prompt-version is the canonical typescript-constant named EXTRACTION_PROMPT_VERSION.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/config.ts`
- `backend/src/ai/providers/google-gemma.ts`
- `backend/src/ai/providers/mock.ts`

## Invariants

The symbol is exported across its module boundary as `EXTRACTION_PROMPT_VERSION`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/version.ts:5-5` — EXTRACTION_PROMPT_VERSION

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
