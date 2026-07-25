---
id: "component.backend.backend.src.ai.assistant.composer.composeresult"
kind: "typescript-interface"
title: "ComposeResult"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/composer.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/composer.ts"
    symbol: "ComposeResult"
    line_start: "21"
    line_end: "25"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/composer.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.composer.composeresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.composer.composeresult is the canonical typescript-interface named ComposeResult.

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

The symbol is exported across its module boundary as `ComposeResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/composer.ts:21-25` — ComposeResult

## Related Knowledge

- `belongs-to` → `project.backend`
