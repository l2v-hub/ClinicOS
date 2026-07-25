---
id: "component.backend.backend.src.ai.gateway.services.resolvenarrativesource"
kind: "typescript-function"
title: "resolveNarrativeSource"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/services.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/gateway/services.ts"
    symbol: "resolveNarrativeSource"
    line_start: "558"
    line_end: "580"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/services.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.resolvenarrativesource` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.resolvenarrativesource is the canonical typescript-function named resolveNarrativeSource.

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

The symbol is exported across its module boundary as `resolveNarrativeSource`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:558-580` — resolveNarrativeSource

## Related Knowledge

- `belongs-to` → `project.backend`
