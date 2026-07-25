---
id: "component.agent-team.agent-team.src.core.locks.acquiregithubclaim"
kind: "typescript-function"
title: "acquireGitHubClaim"
status: "observed"
summary: "Exported function from agent-team/src/core/locks.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/locks.mjs"
    symbol: "acquireGitHubClaim"
    line_start: "35"
    line_end: "79"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/locks.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.locks.acquiregithubclaim` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.locks.acquiregithubclaim is the canonical typescript-function named acquireGitHubClaim.

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
- `agent-team/tests/unit/claim-lifecycle.test.mjs`

## Invariants

The symbol is exported across its module boundary as `acquireGitHubClaim`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/locks.mjs:35-79` — acquireGitHubClaim

## Related Knowledge

- `belongs-to` → `project.agent-team`
