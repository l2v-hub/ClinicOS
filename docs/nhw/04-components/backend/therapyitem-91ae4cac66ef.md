---
id: "component.backend.backend.src.ai.gateway.filters.therapyitem"
kind: "typescript-interface"
title: "TherapyItem"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "TherapyItem"
    line_start: "86"
    line_end: "92"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.therapyitem` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.therapyitem is the canonical typescript-interface named TherapyItem.

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

The symbol is exported across its module boundary as `TherapyItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:86-92` — TherapyItem

## Related Knowledge

- `belongs-to` → `project.backend`
