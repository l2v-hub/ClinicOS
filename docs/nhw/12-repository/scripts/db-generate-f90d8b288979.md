---
id: 'component.repository.package-script.package.json.db-generate'
kind: 'package-script'
title: 'clinicos:db:generate'
status: 'observed'
summary: 'Package script db:generate executes npm --prefix backend run prisma:generate.'
bounded_contexts: []
sources:
  - path: 'package.json'
    symbol: 'db:generate'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.repository.package-script.package.json.db-generate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.db-generate is the canonical package-script named clinicos:db:generate.

## Inputs

Command invocation: `db:generate`.

## Outputs

Executable command: `npm --prefix backend run prisma:generate`.

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

- `package.json` — db:generate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
