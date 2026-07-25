---
id: 'component.repository.package-script.package.json.build-backend'
kind: 'package-script'
title: 'clinicos:build:backend'
status: 'observed'
summary: 'Package script build:backend executes npm --prefix backend run build.'
bounded_contexts: []
sources:
  - path: 'package.json'
    symbol: 'build:backend'
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

What does `component.repository.package-script.package.json.build-backend` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.build-backend is the canonical package-script named clinicos:build:backend.

## Inputs

Command invocation: `build:backend`.

## Outputs

Executable command: `npm --prefix backend run build`.

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

- `package.json` — build:backend

## Related Knowledge

- `belongs-to` → `project.repository-automation`
