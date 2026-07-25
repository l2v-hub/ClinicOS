---
id: "component.repository.package-script.package.json.agent-team-once"
kind: "package-script"
title: "clinicos:agent-team:once"
status: "observed"
summary: "Package script agent-team:once executes node agent-team/src/cli.mjs once."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "agent-team:once"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.repository.package-script.package.json.agent-team-once` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.agent-team-once is the canonical package-script named clinicos:agent-team:once.

## Inputs

Command invocation: `agent-team:once`.

## Outputs

Executable command: `node agent-team/src/cli.mjs once`.

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

- `package.json` — agent-team:once

## Related Knowledge

- `belongs-to` → `project.repository-automation`
