---
id: "component.backend.backend.src.ai.voice.audit.auditkindfor"
kind: "typescript-function"
title: "auditKindFor"
status: "observed"
summary: "Exported function from backend/src/ai/voice/audit.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/voice/audit.ts"
    symbol: "auditKindFor"
    line_start: "27"
    line_end: "31"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.audit.auditkindfor` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.audit.auditkindfor is the canonical typescript-function named auditKindFor.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `auditKindFor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/audit.ts:27-31` — auditKindFor

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
