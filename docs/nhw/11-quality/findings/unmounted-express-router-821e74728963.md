---
id: "finding.coupling.unmounted-express-router"
kind: "architectural-finding"
title: "Unmounted Express router"
status: "observed"
summary: "1 route declarations are not mounted by the Express composition root."
bounded_contexts: []
sources:
  - path: "backend/src/routes/health.ts"
    symbol: "router"
    line_start: "5"
    line_end: "11"
    confidence: "observed"
relations:
  - type: "violates"
    target: "api.backend.get-root-49"
    evidence: "backend/src/routes/health.ts"
    confidence: "observed"
tags:
  - "coupling"
  - "route-mount"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `finding.coupling.unmounted-express-router` represent in ClinicOS?

## Canonical Definition

finding.coupling.unmounted-express-router is the canonical architectural-finding named Unmounted Express router.

## Inputs

- `api.backend.get-root-49`

## Outputs

Explicit route reachability finding.

## Dependencies

Express route declarations and composition-root mount discovery.

## Side Effects

The declared handler is unreachable through its intended router mount.

## Consumers

Architecture impact analysis and route maintenance.

## Invariants

A router-local declaration is not an exposed API unless mounted.

## Failure Modes

Agents that inspect only the route file can incorrectly claim the endpoint is reachable.

## Evidence

- `backend/src/routes/health.ts:5-11` — router

## Related Knowledge

- `violates` → `api.backend.get-root-49`
