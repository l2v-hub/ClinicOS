---
id: "finding.drift.readme-backend-port"
kind: "architectural-finding"
title: "README backend port drift"
status: "drifted"
summary: "README setup examples include port 4000 while executable backend startup defaults to port 3001."
bounded_contexts: []
sources:
  - path: "README.md"
    confidence: "observed"
  - path: "backend/src/server.ts"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "README.md,backend/src/server.ts"
    confidence: "observed"
tags:
  - "architectural-finding"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `finding.drift.readme-backend-port` represent in ClinicOS?

## Canonical Definition

finding.drift.readme-backend-port is the canonical architectural-finding named README backend port drift.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

README setup examples include port 4000 while executable backend startup defaults to port 3001.

## Dependencies

Owning knowledge target: `system.clinicos`.

## Side Effects

Operators following stale examples can target the wrong local backend port.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `README.md`
- `backend/src/server.ts`

## Related Knowledge

- `belongs-to` → `system.clinicos`
