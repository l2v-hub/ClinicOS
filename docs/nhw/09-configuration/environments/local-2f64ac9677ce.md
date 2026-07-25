---
id: 'config.environment.local'
kind: 'runtime-environment'
title: 'Local development environment'
status: 'observed'
summary: 'Local frontend, backend, AI runtime, and PostgreSQL use package scripts and Docker Compose defaults.'
bounded_contexts: []
sources:
  - path: 'package.json'
    confidence: 'observed'
  - path: 'docker-compose.yml'
    confidence: 'observed'
  - path: 'frontend/src/config.ts'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'system.clinicos'
    evidence: 'package.json,docker-compose.yml,frontend/src/config.ts'
    confidence: 'observed'
tags:
  - 'runtime-environment'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `config.environment.local` represent in ClinicOS?

## Canonical Definition

config.environment.local is the canonical runtime-environment named Local development environment.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Local frontend, backend, AI runtime, and PostgreSQL use package scripts and Docker Compose defaults.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Starts local processes and a PostgreSQL container when invoked.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `package.json`
- `docker-compose.yml`
- `frontend/src/config.ts`

## Related Knowledge

- `belongs-to` → `system.clinicos`
