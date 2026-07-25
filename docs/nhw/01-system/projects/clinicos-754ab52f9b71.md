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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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
