---
id: "test.governance.agent-team-protocol"
kind: "governance-protocol"
title: "Claude development and Codex QA protocol"
status: "observed"
summary: "Agent-team protocol separates development work, independent QA, remediation, and evidence-bound closure."
bounded_contexts: []
sources:
  - path: "agent-team/src/core/protocol.mjs"
    confidence: "observed"
  - path: "agent-team/src/workers/claude-development-worker.mjs"
    confidence: "observed"
  - path: "agent-team/src/workers/codex-qa-worker.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/protocol.mjs,agent-team/src/workers/claude-development-worker.mjs,agent-team/src/workers/codex-qa-worker.mjs"
    confidence: "observed"
tags:
  - "governance-protocol"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `test.governance.agent-team-protocol` represent in ClinicOS?

## Canonical Definition

test.governance.agent-team-protocol is the canonical governance-protocol named Claude development and Codex QA protocol.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Agent-team protocol separates development work, independent QA, remediation, and evidence-bound closure.

## Dependencies

Owning knowledge target: `project.agent-team`.

## Side Effects

Creates protocol comments, claims, evidence bindings, remediation state, and QA outcomes.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `agent-team/src/core/protocol.mjs`
- `agent-team/src/workers/claude-development-worker.mjs`
- `agent-team/src/workers/codex-qa-worker.mjs`

## Related Knowledge

- `belongs-to` → `project.agent-team`
