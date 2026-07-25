---
id: "component.frontend.frontend.src.components.shared.agnos.useagnoschat.agnosagent"
kind: "typescript-type-alias"
title: "AgnosAgent"
status: "observed"
summary: "Exported type-alias from frontend/src/components/shared/agnos/useAgnosChat.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "frontend/src/components/shared/agnos/useAgnosChat.ts"
    symbol: "AgnosAgent"
    line_start: "18"
    line_end: "18"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/agnos/useAgnosChat.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.agnos.useagnoschat.agnosagent` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.agnos.useagnoschat.agnosagent is the canonical typescript-type-alias named AgnosAgent.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/AgnosPanel.tsx`

## Invariants

The symbol is exported across its module boundary as `AgnosAgent`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/agnos/useAgnosChat.ts:18-18` — AgnosAgent

## Related Knowledge

- `belongs-to` → `project.frontend`
