---
id: "project.agent-team"
kind: "node-subsystem"
title: "agent-team"
status: "observed"
summary: "agent-team project rooted at agent-team."
bounded_contexts: []
sources:
  - path: "agent-team/src/cli.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "agent-team/src/cli.mjs"
    confidence: "observed"
tags:
  - "project"
  - "node-subsystem"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `project.agent-team` represent in ClinicOS?

## Canonical Definition

project.agent-team is the canonical node-subsystem named agent-team.

## Inputs

Project membership is inferred from its structural root.

## Outputs

Runtime or repository capability owned below `agent-team`.

## Dependencies

None observed

## Side Effects

Defined by owned components.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `agent-team`.

## Failure Modes

None observed

## Evidence

- `agent-team/src/cli.mjs`

## Related Knowledge

- `belongs-to` → `system.clinicos`
