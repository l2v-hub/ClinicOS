---
id: "component.backend.backend.src.ai.config.aipublicstatus"
kind: "typescript-interface"
title: "AiPublicStatus"
status: "observed"
summary: "Exported interface from backend/src/ai/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/config.ts"
    symbol: "AiPublicStatus"
    line_start: "180"
    line_end: "189"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.config.aipublicstatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.config.aipublicstatus is the canonical typescript-interface named AiPublicStatus.

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

The symbol is exported across its module boundary as `AiPublicStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/config.ts:180-189` — AiPublicStatus

## Related Knowledge

- `belongs-to` → `project.backend`
