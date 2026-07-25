---
id: "component.backend.backend.src.ai.voice.provider.fakevoicesttprovideroptions"
kind: "typescript-interface"
title: "FakeVoiceSttProviderOptions"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/provider.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/provider.ts"
    symbol: "FakeVoiceSttProviderOptions"
    line_start: "33"
    line_end: "40"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/provider.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.provider.fakevoicesttprovideroptions` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.provider.fakevoicesttprovideroptions is the canonical typescript-interface named FakeVoiceSttProviderOptions.

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

The symbol is exported across its module boundary as `FakeVoiceSttProviderOptions`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/provider.ts:33-40` — FakeVoiceSttProviderOptions

## Related Knowledge

- `belongs-to` → `project.backend`
