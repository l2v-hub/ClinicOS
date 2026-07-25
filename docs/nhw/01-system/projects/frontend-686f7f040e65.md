---
id: "project.frontend"
kind: "node-package"
title: "frontend"
status: "observed"
summary: "frontend project rooted at frontend."
bounded_contexts: []
sources:
  - path: "frontend/package.json"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "frontend/package.json"
    confidence: "observed"
tags:
  - "project"
  - "node-package"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `project.frontend` represent in ClinicOS?

## Canonical Definition

project.frontend is the canonical node-package named frontend.

## Inputs

Manifest: `frontend/package.json`.

## Outputs

Runtime or repository capability owned below `frontend`.

## Dependencies

None observed

## Side Effects

Defined by owned components.

## Consumers

ClinicOS system composition and downstream project consumers.

## Invariants

Owned repository prefix: `frontend`.

## Failure Modes

None observed

## Evidence

- `frontend/package.json`

## Related Knowledge

- `belongs-to` → `system.clinicos`
