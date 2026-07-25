---
id: "component.backend.backend.src.ai.actions.orchestrate.executecommandinput"
kind: "typescript-interface"
title: "ExecuteCommandInput"
status: "observed"
summary: "Exported interface from backend/src/ai/actions/orchestrate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/actions/orchestrate.ts"
    symbol: "ExecuteCommandInput"
    line_start: "218"
    line_end: "225"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/actions/orchestrate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.orchestrate.executecommandinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.orchestrate.executecommandinput is the canonical typescript-interface named ExecuteCommandInput.

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

The symbol is exported across its module boundary as `ExecuteCommandInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/orchestrate.ts:218-225` — ExecuteCommandInput

## Related Knowledge

- `belongs-to` → `project.backend`
