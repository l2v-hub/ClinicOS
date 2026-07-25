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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
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
