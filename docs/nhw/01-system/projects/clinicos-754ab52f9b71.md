---
id: "project.clinicos"
kind: "node-package"
title: "clinicos"
status: "observed"
summary: "clinicos project rooted at .."
bounded_contexts: []
sources:
  - path: "package.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "package.json"
    confidence: "observed"
tags:
  - "project"
  - "node-package"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `project.clinicos` represent in ClinicOS?

## Canonical Definition

project.clinicos is the canonical node-package named clinicos.

## Inputs

Manifest: `package.json`.

## Outputs

Runtime or repository capability owned below `.`.

## Dependencies

- frontend
- backend

## Side Effects

Defined by owned components.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `.`.

## Failure Modes

None observed

## Evidence

- `package.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
