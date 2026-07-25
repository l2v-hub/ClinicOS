---
id: "component.backend.backend.src.ai.sections.narrative.narrativetag"
kind: "typescript-interface"
title: "NarrativeTag"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "NarrativeTag"
    line_start: "18"
    line_end: "24"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.narrativetag` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.narrativetag is the canonical typescript-interface named NarrativeTag.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `NarrativeTag`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:18-24` — NarrativeTag

## Related Knowledge

- `belongs-to` → `project.backend`
