---
id: "project.backend"
kind: "node-package"
title: "backend"
status: "observed"
summary: "backend project rooted at backend."
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `project.backend` represent in ClinicOS?

## Canonical Definition

project.backend is the canonical node-package named backend.

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
