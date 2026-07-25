---
id: 'component.repository.package-script.backend.package.json.db-seed'
kind: 'package-script'
title: '@clinicos/backend:db:seed'
status: 'observed'
summary: 'Package script db:seed executes node dist/seed.js.'
bounded_contexts: []
sources:
  - path: 'backend/package.json'
    symbol: 'db:seed'
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

What does `component.repository.package-script.backend.package.json.db-seed` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.db-seed is the canonical package-script named @clinicos/backend:db:seed.

## Inputs

Command invocation: `db:seed`.

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

- `backend/package.json` — db:seed

## Related Knowledge

- `belongs-to` → `project.repository-automation`
