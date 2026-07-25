---
id: "component.backend.backend.src.ai.sections.narrative.sourcereference"
kind: "typescript-interface"
title: "SourceReference"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "SourceReference"
    line_start: "26"
    line_end: "32"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.sourcereference` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.sourcereference is the canonical typescript-interface named SourceReference.

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

The symbol is exported across its module boundary as `SourceReference`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:26-32` — SourceReference

## Related Knowledge

- `belongs-to` → `project.backend`
