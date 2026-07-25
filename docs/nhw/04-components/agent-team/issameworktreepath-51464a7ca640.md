---
id: "component.agent-team.agent-team.src.adapters.git.issameworktreepath"
kind: "typescript-function"
title: "isSameWorktreePath"
status: "observed"
summary: "Exported function from agent-team/src/adapters/git.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/adapters/git.mjs"
    symbol: "isSameWorktreePath"
    line_start: "11"
    line_end: "13"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/adapters/git.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.agent-team.agent-team.src.adapters.git.issameworktreepath` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.adapters.git.issameworktreepath is the canonical typescript-function named isSameWorktreePath.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/runtime.mjs`

## Invariants

The symbol is exported across its module boundary as `isSameWorktreePath`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/adapters/git.mjs:11-13` — isSameWorktreePath

## Related Knowledge

- `belongs-to` → `project.agent-team`
