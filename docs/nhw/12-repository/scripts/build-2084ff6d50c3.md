---
id: "component.repository.package-script.package.json.build"
kind: "package-script"
title: "clinicos:build"
status: "observed"
summary: "Package script build executes npm run build:frontend && npm run build:backend."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "build"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.repository.package-script.package.json.build` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.build is the canonical package-script named clinicos:build.

## Inputs

Command invocation: `build`.

## Outputs

Executable command: `npm run build:frontend && npm run build:backend`.

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

- `package.json` — build

## Related Knowledge

- `belongs-to` → `project.repository-automation`
