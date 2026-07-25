---
id: "component.frontend.frontend.src.types.diagnosi"
kind: "typescript-interface"
title: "Diagnosi"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Diagnosi"
    line_start: "326"
    line_end: "337"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.types.diagnosi` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.diagnosi is the canonical typescript-interface named Diagnosi.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`

## Invariants

The symbol is exported across its module boundary as `Diagnosi`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:326-337` — Diagnosi

## Related Knowledge

- `belongs-to` → `project.frontend`
