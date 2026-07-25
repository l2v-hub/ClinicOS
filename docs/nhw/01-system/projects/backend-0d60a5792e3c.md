---
id: "project.clinicos.backend"
kind: "node-package"
title: "@clinicos/backend"
status: "observed"
summary: "@clinicos/backend project rooted at backend."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/package.json"
    confidence: "observed"
tags:
  - "project"
  - "node-package"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `project.clinicos.backend` represent in ClinicOS?

## Canonical Definition

project.clinicos.backend is the canonical node-package named @clinicos/backend.

## Inputs

Manifest: `backend/package.json`.

## Outputs

Runtime or repository capability owned below `backend`.

## Dependencies

None observed

## Side Effects

Defined by owned components.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `backend`.

## Failure Modes

None observed

## Evidence

- `backend/package.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
