---
id: 'component.repository.package-script.frontend.package.json.test'
kind: 'package-script'
title: 'frontend:test'
status: 'observed'
summary: 'Package script test executes node ../scripts/run-node-tests.mjs.'
bounded_contexts: []
sources:
  - path: 'frontend/package.json'
    symbol: 'test'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'frontend/package.json'
    confidence: 'observed'
tags:
  - 'package-script'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.repository.package-script.frontend.package.json.test` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.frontend.package.json.test is the canonical package-script named frontend:test.

## Inputs

Command invocation: `test`.

## Outputs

Executable command: `node ../scripts/run-node-tests.mjs`.

## Dependencies

Package manifest: `frontend/package.json`.

## Side Effects

Defined by the invoked command and its subprocesses.

## Consumers

Developers, CI/CD workflows, deployment platforms, and autonomous agents.

## Invariants

The manifest command is authoritative for this script name.

## Failure Modes

Non-zero command exit, missing dependency, invalid configuration, or unavailable external service.

## Evidence

- `frontend/package.json` — test

## Related Knowledge

- `belongs-to` → `project.repository-automation`
