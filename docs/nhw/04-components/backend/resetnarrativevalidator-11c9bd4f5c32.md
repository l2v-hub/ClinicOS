---
id: "component.backend.backend.src.ai.sections.narrative.resetnarrativevalidator"
kind: "typescript-function"
title: "_resetNarrativeValidator"
status: "observed"
summary: "Exported function from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "_resetNarrativeValidator"
    line_start: "256"
    line_end: "258"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.resetnarrativevalidator` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.resetnarrativevalidator is the canonical typescript-function named _resetNarrativeValidator.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `_resetNarrativeValidator`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:256-258` — _resetNarrativeValidator

## Related Knowledge

- `belongs-to` → `project.backend`
