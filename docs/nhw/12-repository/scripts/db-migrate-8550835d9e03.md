---
id: 'component.repository.package-script.package.json.db-migrate'
kind: 'package-script'
title: 'clinicos:db:migrate'
status: 'observed'
summary: 'Package script db:migrate executes npm --prefix backend run prisma:migrate.'
bounded_contexts: []
sources:
  - path: 'package.json'
    symbol: 'db:migrate'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'package.json'
    confidence: 'observed'
tags:
  - 'package-script'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.repository.package-script.package.json.db-migrate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.db-migrate is the canonical package-script named clinicos:db:migrate.

## Inputs

Command invocation: `db:migrate`.

## Outputs

Executable command: `npm --prefix backend run prisma:migrate`.

## Dependencies

Package manifest: `package.json`.

## Side Effects

Defined by the invoked command and its subprocesses.

## Consumers

Developers, CI/CD workflows, deployment platforms, and autonomous agents.

## Invariants

The manifest command is authoritative for this script name.

## Failure Modes

Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.

## Evidence

- `package.json` — db:migrate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
