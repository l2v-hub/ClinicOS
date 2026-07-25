---
id: 'component.repository.package-script.backend.package.json.build'
kind: 'package-script'
title: '@clinicos/backend:build'
status: 'observed'
summary: 'Package script build executes npx prisma generate --schema=../prisma/schema.prisma && tsc -p tsconfig.json.'
bounded_contexts: []
sources:
  - path: 'backend/package.json'
    symbol: 'build'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'backend/package.json'
    confidence: 'observed'
tags:
  - 'package-script'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.repository.package-script.backend.package.json.build` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.build is the canonical package-script named @clinicos/backend:build.

## Inputs

Command invocation: `build`.

## Outputs

Executable command: `npx prisma generate --schema=../prisma/schema.prisma && tsc -p tsconfig.json`.

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

- `backend/package.json` — build

## Related Knowledge

- `belongs-to` → `project.repository-automation`
