---
id: "component.repository.package-script.package.json.agent-team-start"
kind: "package-script"
title: "clinicos:agent-team:start"
status: "observed"
summary: "Package script agent-team:start executes node agent-team/src/cli.mjs start."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "agent-team:start"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "package.json"
    confidence: "observed"
tags:
  - "package-script"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.repository.package-script.package.json.agent-team-start` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.agent-team-start is the canonical package-script named clinicos:agent-team:start.

## Inputs

Command invocation: `agent-team:start`.

## Outputs

Executable command: `node agent-team/src/cli.mjs start`.

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

- `package.json` — agent-team:start

## Related Knowledge

- `belongs-to` → `project.repository-automation`
