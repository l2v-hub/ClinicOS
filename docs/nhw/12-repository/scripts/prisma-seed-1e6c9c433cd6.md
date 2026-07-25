---
id: "component.repository.package-script.backend.package.json.prisma-seed"
kind: "package-script"
title: "@clinicos/backend:prisma:seed"
status: "observed"
summary: "Package script prisma:seed executes node dist/seed.js."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    symbol: "prisma:seed"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.repository.package-script.backend.package.json.prisma-seed` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.prisma-seed is the canonical package-script named @clinicos/backend:prisma:seed.

## Inputs

Command invocation: `prisma:seed`.

## Outputs

Executable command: `node dist/seed.js`.

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

- `backend/package.json` — prisma:seed

## Related Knowledge

- `belongs-to` → `project.repository-automation`
