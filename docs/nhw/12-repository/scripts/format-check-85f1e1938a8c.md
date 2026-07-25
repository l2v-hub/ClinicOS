---
id: "component.repository.package-script.package.json.format-check"
kind: "package-script"
title: "clinicos:format:check"
status: "observed"
summary: "Package script format:check executes prettier --check .."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "format:check"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.repository.package-script.package.json.format-check` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.format-check is the canonical package-script named clinicos:format:check.

## Inputs

Command invocation: `format:check`.

## Outputs

Executable command: `prettier --check .`.

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

- `package.json` — format:check

## Related Knowledge

- `belongs-to` → `project.repository-automation`
