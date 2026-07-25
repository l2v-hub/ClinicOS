---
id: "component.agent-team.agent-team.src.adapters.github.creategithubadapter"
kind: "typescript-function"
title: "createGitHubAdapter"
status: "observed"
summary: "Exported function from agent-team/src/adapters/github.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/adapters/github.mjs"
    symbol: "createGitHubAdapter"
    line_start: "1"
    line_end: "112"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/adapters/github.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.agent-team.agent-team.src.adapters.github.creategithubadapter` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.adapters.github.creategithubadapter is the canonical typescript-function named createGitHubAdapter.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/status.mjs`
- `agent-team/src/runtime.mjs`
- `agent-team/tests/unit/github.test.mjs`

## Invariants

The symbol is exported across its module boundary as `createGitHubAdapter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/adapters/github.mjs:1-112` — createGitHubAdapter

## Related Knowledge

- `belongs-to` → `project.agent-team`
