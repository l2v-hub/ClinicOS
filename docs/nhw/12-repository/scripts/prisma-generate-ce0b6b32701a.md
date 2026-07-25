---
id: "component.repository.package-script.backend.package.json.prisma-generate"
kind: "package-script"
title: "@clinicos/backend:prisma:generate"
status: "observed"
summary: "Package script prisma:generate executes prisma generate --schema=../prisma/schema.prisma."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    symbol: "prisma:generate"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.repository.package-script.backend.package.json.prisma-generate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.prisma-generate is the canonical package-script named @clinicos/backend:prisma:generate.

## Inputs

Command invocation: `prisma:generate`.

## Outputs

Executable command: `prisma generate --schema=../prisma/schema.prisma`.

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

- `backend/package.json` — prisma:generate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
