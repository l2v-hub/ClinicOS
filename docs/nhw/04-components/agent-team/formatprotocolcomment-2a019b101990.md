---
id: "component.agent-team.agent-team.src.core.protocol.formatprotocolcomment"
kind: "typescript-function"
title: "formatProtocolComment"
status: "observed"
summary: "Exported function from agent-team/src/core/protocol.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/protocol.mjs"
    symbol: "formatProtocolComment"
    line_start: "8"
    line_end: "11"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/protocol.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.protocol.formatprotocolcomment` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.protocol.formatprotocolcomment is the canonical typescript-function named formatProtocolComment.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/core/locks.mjs`
- `agent-team/src/runtime.mjs`
- `agent-team/src/workers/claude-development-worker.mjs`
- `agent-team/src/workers/codex-qa-worker.mjs`
- `agent-team/tests/unit/protocol.test.mjs`

## Invariants

The symbol is exported across its module boundary as `formatProtocolComment`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/protocol.mjs:8-11` — formatProtocolComment

## Related Knowledge

- `belongs-to` → `project.agent-team`
