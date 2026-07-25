---
id: 'component.repository.package-script.package.json.agent-team-doctor'
kind: 'package-script'
title: 'clinicos:agent-team:doctor'
status: 'observed'
summary: 'Package script agent-team:doctor executes node agent-team/src/cli.mjs doctor.'
bounded_contexts: []
sources:
  - path: 'package.json'
    symbol: 'agent-team:doctor'
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

What does `component.repository.package-script.package.json.agent-team-doctor` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.agent-team-doctor is the canonical package-script named clinicos:agent-team:doctor.

## Inputs

Command invocation: `agent-team:doctor`.

## Outputs

Executable command: `node agent-team/src/cli.mjs doctor`.

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

- `package.json` — agent-team:doctor

## Related Knowledge

- `belongs-to` → `project.repository-automation`
