---
id: "component.backend.backend.src.ai.sections.patient-narrative.narrativedrafttosectionrows"
kind: "typescript-function"
title: "narrativeDraftToSectionRows"
status: "observed"
summary: "Exported function from backend/src/ai/sections/patient-narrative.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/sections/patient-narrative.ts"
    symbol: "narrativeDraftToSectionRows"
    line_start: "74"
    line_end: "89"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/patient-narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.narrativedrafttosectionrows` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.narrativedrafttosectionrows is the canonical typescript-function named narrativeDraftToSectionRows.

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
- `backend/src/ai/__tests__/patient-narrative.test.ts`

## Invariants

The symbol is exported across its module boundary as `narrativeDraftToSectionRows`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:74-89` — narrativeDraftToSectionRows

## Related Knowledge

- `belongs-to` → `project.backend`
