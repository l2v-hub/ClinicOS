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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
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
