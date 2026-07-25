---
id: "component.backend.backend.src.ai.sections.markdown-parse.assertnonarrativesectionloss"
kind: "typescript-function"
title: "assertNoNarrativeSectionLoss"
status: "observed"
summary: "Exported function from backend/src/ai/sections/markdown-parse.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/markdown-parse.ts"
    symbol: "assertNoNarrativeSectionLoss"
    line_start: "279"
    line_end: "285"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/markdown-parse.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.markdown-parse.assertnonarrativesectionloss` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.markdown-parse.assertnonarrativesectionloss is the canonical typescript-function named assertNoNarrativeSectionLoss.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/markdown-parse.test.ts`

## Invariants

The symbol is exported across its module boundary as `assertNoNarrativeSectionLoss`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/markdown-parse.ts:279-285` — assertNoNarrativeSectionLoss

## Related Knowledge

- `belongs-to` → `project.backend`
