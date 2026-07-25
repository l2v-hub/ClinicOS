---
id: "config.environment.railway"
kind: "runtime-environment"
title: "Railway deployment environment"
status: "observed"
summary: "Backend and AI runtime use separate Railway services, startup commands, health paths, and environment variables."
bounded_contexts: []
sources:
  - path: "railway.json"
    confidence: "observed"
  - path: "clinicos-ai-runtime/railway.json"
    confidence: "observed"
  - path: ".github/workflows/deploy-backend.yml"
    confidence: "observed"
  - path: ".github/workflows/deploy-runtime.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "railway.json,clinicos-ai-runtime/railway.json,.github/workflows/deploy-backend.yml,.github/workflows/deploy-runtime.yml"
    confidence: "observed"
tags:
  - "runtime-environment"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `config.environment.railway` represent in ClinicOS?

## Canonical Definition

config.environment.railway is the canonical runtime-environment named Railway deployment environment.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Backend and AI runtime use separate Railway services, startup commands, health paths, and environment variables.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Builds, migrates, starts, and health-checks production services.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `railway.json`
- `clinicos-ai-runtime/railway.json`
- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-runtime.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
