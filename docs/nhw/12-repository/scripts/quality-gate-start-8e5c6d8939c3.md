---
id: 'component.repository.package-script.package.json.quality-gate-start'
kind: 'package-script'
title: 'clinicos:quality-gate:start'
status: 'observed'
summary: 'Package script quality-gate:start executes node scripts/quality-gate/create-task-contract.js.'
bounded_contexts: []
sources:
  - path: 'package.json'
    symbol: 'quality-gate:start'
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

What does `component.repository.package-script.package.json.quality-gate-start` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.quality-gate-start is the canonical package-script named clinicos:quality-gate:start.

## Inputs

Command invocation: `quality-gate:start`.

## Outputs

Executable command: `node scripts/quality-gate/create-task-contract.js`.

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

- `package.json` — quality-gate:start

## Related Knowledge

- `belongs-to` → `project.repository-automation`
