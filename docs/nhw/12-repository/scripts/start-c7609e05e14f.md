---
id: "component.repository.package-script.backend.package.json.start"
kind: "package-script"
title: "@clinicos/backend:start"
status: "observed"
summary: "Package script start executes node dist/server.js."
bounded_contexts: []
sources:
  - path: "backend/package.json"
    symbol: "start"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "backend/package.json"
    confidence: "observed"
tags:
  - "package-script"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.repository.package-script.backend.package.json.start` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.backend.package.json.start is the canonical package-script named @clinicos/backend:start.

## Inputs

Command invocation: `start`.

## Outputs

Executable command: `node dist/server.js`.

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

- `backend/package.json` — start

## Related Knowledge

- `belongs-to` → `project.repository-automation`
