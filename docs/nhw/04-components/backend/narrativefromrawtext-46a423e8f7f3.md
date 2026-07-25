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
    target: "project.backend"
    evidence: "backend/src/ai/sections/narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
