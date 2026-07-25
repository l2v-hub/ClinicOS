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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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
