---
id: "component.agent-team.agent-team.src.core.config.loadconfig"
kind: "typescript-function"
title: "loadConfig"
status: "observed"
summary: "Exported function from agent-team/src/core/config.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/config.mjs"
    symbol: "loadConfig"
    line_start: "74"
    line_end: "89"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/config.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.config.loadconfig` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.config.loadconfig is the canonical typescript-function named loadConfig.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/cli.mjs`
- `agent-team/tests/integration/once-failure-reporting.test.mjs`
- `agent-team/tests/integration/remediation-loop.test.mjs`
- `agent-team/tests/unit/claim-worktree-authority.test.mjs`
- `agent-team/tests/unit/config.test.mjs`
- `agent-team/tests/unit/lease-heartbeat.test.mjs`

## Invariants

The symbol is exported across its module boundary as `loadConfig`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/config.mjs:74-89` — loadConfig

## Related Knowledge

- `belongs-to` → `project.agent-team`
