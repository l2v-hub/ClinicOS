---
id: "test.governance.quality-gate"
kind: "quality-gate"
title: "Task validation and closure gate"
status: "observed"
summary: "Task contracts, validation reports, test evidence, and closure script form the repository acceptance gate."
bounded_contexts: []
sources:
  - path: "scripts/quality-gate/create-task-contract.js"
    confidence: "observed"
  - path: "scripts/quality-gate/validate-task-contract.js"
    confidence: "observed"
  - path: "scripts/quality-gate/check-closure.js"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "context.delivery-quality-governance"
    evidence: "scripts/quality-gate/create-task-contract.js,scripts/quality-gate/validate-task-contract.js,scripts/quality-gate/check-closure.js"
    confidence: "observed"
tags:
  - "quality-gate"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `test.governance.quality-gate` represent in ClinicOS?

## Canonical Definition

test.governance.quality-gate is the canonical quality-gate named Task validation and closure gate.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Task contracts, validation reports, test evidence, and closure script form the repository acceptance gate.

## Dependencies

Owning knowledge target: `context.delivery-quality-governance`.

## Side Effects

Creates and validates acceptance artifacts and blocks unverified closure.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `scripts/quality-gate/create-task-contract.js`
- `scripts/quality-gate/validate-task-contract.js`
- `scripts/quality-gate/check-closure.js`

## Related Knowledge

- `belongs-to` → `context.delivery-quality-governance`
