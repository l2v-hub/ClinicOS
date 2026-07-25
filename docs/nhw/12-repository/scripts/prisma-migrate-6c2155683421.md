---
id: "component.repository.package-script.backend.package.json.prisma-migrate"
kind: "package-script"
title: "@clinicos/backend:prisma:migrate"
status: "observed"
summary: "Package script prisma:migrate executes prisma migrate deploy --schema=../prisma/schema.prisma."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    symbol: "prisma:migrate"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "backend/package.json"
    confidence: "observed"
tags:
  - "package-script"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.repository.package-script.backend.package.json.prisma-migrate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.prisma-migrate is the canonical package-script named @clinicos/backend:prisma:migrate.

## Inputs

Command invocation: `prisma:migrate`.

## Outputs

Executable command: `prisma migrate deploy --schema=../prisma/schema.prisma`.

## Dependencies

Package manifest: `backend/package.json`.

## Side Effects

Defined by the invoked command and its subprocesses.

## Consumers

Developers, CI/CD workflows, deployment platforms, and autonomous agents.

## Invariants

The manifest command is authoritative for this script name.

## Failure Modes

Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.

## Evidence

- `backend/package.json` — prisma:migrate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
