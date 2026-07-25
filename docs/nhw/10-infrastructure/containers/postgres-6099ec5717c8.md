---
id: "integration.container.postgres"
kind: "integration"
title: "postgres"
status: "observed"
summary: "integration.container.postgres declared by docker-compose.yml."
bounded_contexts: []
sources:
  - path: "docker-compose.yml"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "docker-compose.yml"
    confidence: "observed"
tags:
  - "infrastructure"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `integration.container.postgres` represent in ClinicOS?

## Canonical Definition

integration.container.postgres is the canonical integration named postgres.

## Inputs

`["5432:5432"]`

## Outputs

`"postgres:16-alpine"`

## Dependencies

`["clinicos_postgres_data:/var/lib/postgresql/data"]`

## Side Effects

Defined by the cited infrastructure or requirement source.

## Consumers

Runtime deployment, local development, or governance automation.

## Invariants

Executable deployment configuration outranks narrative deployment documentation.

## Failure Modes

Configuration drift, unavailable platform, failed health check, or unmet declared requirement.

## Evidence

- `docker-compose.yml`

## Related Knowledge

- `belongs-to` → `system.clinicos`
