---
id: "component.backend.backend.src.routes.ai-actions.agnosoperatorfrom"
kind: "typescript-function"
title: "agnosOperatorFrom"
status: "observed"
summary: "Exported function from backend/src/routes/ai-actions.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/ai-actions.ts"
    symbol: "agnosOperatorFrom"
    line_start: "28"
    line_end: "32"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-actions.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-actions.agnosoperatorfrom` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-actions.agnosoperatorfrom is the canonical typescript-function named agnosOperatorFrom.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-voice.ts`

## Invariants

The symbol is exported across its module boundary as `agnosOperatorFrom`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-actions.ts:28-32` — agnosOperatorFrom

## Related Knowledge

- `belongs-to` → `project.backend`
