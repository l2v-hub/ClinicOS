---
id: 'config.environment.github-actions'
kind: 'runtime-environment'
title: 'GitHub Actions environment'
status: 'observed'
summary: 'CI workflows provide test, security, deployment, and model-configuration environments with secret names only.'
bounded_contexts: []
sources:
  - path: '.github/workflows/ai-runtime-tests.yml'
    confidence: 'observed'
  - path: '.github/workflows/ai-import-e2e.yml'
    confidence: 'observed'
  - path: '.github/workflows/deploy-backend.yml'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: '.github/workflows/ai-runtime-tests.yml,.github/workflows/ai-import-e2e.yml,.github/workflows/deploy-backend.yml'
    confidence: 'observed'
tags:
  - 'runtime-environment'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `config.environment.github-actions` represent in ClinicOS?

## Canonical Definition

config.environment.github-actions is the canonical runtime-environment named GitHub Actions environment.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

CI workflows provide test, security, deployment, and model-configuration environments with secret names only.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Runs deterministic validation and authorized deployment jobs.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `.github/workflows/ai-runtime-tests.yml`
- `.github/workflows/ai-import-e2e.yml`
- `.github/workflows/deploy-backend.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
