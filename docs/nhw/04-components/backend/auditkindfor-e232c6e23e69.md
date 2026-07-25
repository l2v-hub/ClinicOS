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
    target: "project.backend"
    evidence: "backend/src/ai/voice/audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
