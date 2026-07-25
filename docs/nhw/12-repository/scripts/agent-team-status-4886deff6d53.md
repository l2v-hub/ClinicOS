---
id: 'component.repository.package-script.package.json.agent-team-status'
kind: 'package-script'
title: 'clinicos:agent-team:status'
status: 'observed'
summary: 'Package script agent-team:status executes node agent-team/src/cli.mjs status.'
bounded_contexts: []
sources:
  - path: 'package.json'
    symbol: 'agent-team:status'
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

What does `component.repository.package-script.package.json.agent-team-status` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.agent-team-status is the canonical package-script named clinicos:agent-team:status.

## Inputs

Command invocation: `agent-team:status`.

## Outputs

Executable command: `node agent-team/src/cli.mjs status`.

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

- `package.json` — agent-team:status

## Related Knowledge

- `belongs-to` → `project.repository-automation`
