---
id: "component.backend.backend.src.ai.types.providercapabilities"
kind: "typescript-interface"
title: "ProviderCapabilities"
status: "observed"
summary: "Exported interface from backend/src/ai/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/types.ts"
    symbol: "ProviderCapabilities"
    line_start: "64"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.types.providercapabilities` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.types.providercapabilities is the canonical typescript-interface named ProviderCapabilities.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/providers/google-gemma.ts`
- `backend/src/ai/providers/mock.ts`

## Invariants

The symbol is exported across its module boundary as `ProviderCapabilities`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/types.ts:64-68` — ProviderCapabilities

## Related Knowledge

- `belongs-to` → `project.backend`
