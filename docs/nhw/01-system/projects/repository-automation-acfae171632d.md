---
id: "project.repository-automation"
kind: "operational-tooling"
title: "repository-automation"
status: "observed"
summary: "repository-automation project rooted at scripts."
bounded_contexts: []
sources:
  - path: "scripts/quality-gate/check-closure.js"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "scripts/quality-gate/check-closure.js"
    confidence: "observed"
tags:
  - "project"
  - "operational-tooling"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `project.repository-automation` represent in ClinicOS?

## Canonical Definition

project.repository-automation is the canonical operational-tooling named repository-automation.

## Inputs

Project membership is inferred from its structural root.

## Outputs

Runtime or repository capability owned below `scripts`.

## Dependencies

None observed

## Side Effects

Defined by owned components.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `scripts`.

## Failure Modes

None observed

## Evidence

- `scripts/quality-gate/check-closure.js`

## Related Knowledge

- `belongs-to` → `system.clinicos`
