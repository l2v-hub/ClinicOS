---
id: "component.backend.backend.src.ai.sections.narrative.dischargenarrativedraft"
kind: "typescript-interface"
title: "DischargeNarrativeDraft"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "DischargeNarrativeDraft"
    line_start: "34"
    line_end: "60"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.dischargenarrativedraft` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.dischargenarrativedraft is the canonical typescript-interface named DischargeNarrativeDraft.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/markdown-parse.ts`
- `backend/src/ai/sections/patient-narrative.ts`
- `backend/src/intake/__tests__/confirm-draft-guards.test.ts`
- `backend/src/intake/__tests__/seed-draft-from-import.test.ts`
- `backend/src/intake/draft-service.ts`

## Invariants

The symbol is exported across its module boundary as `DischargeNarrativeDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:34-60` — DischargeNarrativeDraft

## Related Knowledge

- `belongs-to` → `project.backend`
