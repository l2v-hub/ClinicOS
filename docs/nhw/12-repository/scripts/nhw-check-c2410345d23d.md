---
id: "component.repository.package-script.package.json.nhw-check"
kind: "package-script"
title: "clinicos:nhw:check"
status: "observed"
summary: "Package script nhw:check executes npm run test:nhw && npm run nhw:generate && npm run nhw:validate."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "nhw:check"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.repository.package-script.package.json.nhw-check` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.nhw-check is the canonical package-script named clinicos:nhw:check.

## Inputs

Command invocation: `nhw:check`.

## Outputs

Executable command: `npm run test:nhw && npm run nhw:generate && npm run nhw:validate`.

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

- `package.json` — nhw:check

## Related Knowledge

- `belongs-to` → `project.repository-automation`
