---
id: "component.backend.backend.src.ai.sections.validate.sectionsresult"
kind: "typescript-interface"
title: "SectionsResult"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/validate.ts"
    symbol: "SectionsResult"
    line_start: "79"
    line_end: "83"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.validate.sectionsresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.validate.sectionsresult is the canonical typescript-interface named SectionsResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/narrative.test.ts`
- `backend/src/ai/__tests__/patient-narrative.test.ts`
- `backend/src/ai/sections/narrative.ts`

## Invariants

The symbol is exported across its module boundary as `SectionsResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/validate.ts:79-83` — SectionsResult

## Related Knowledge

- `belongs-to` → `project.backend`
