---
id: "component.repository.package-script.package.json.nhw-validate"
kind: "package-script"
title: "clinicos:nhw:validate"
status: "observed"
summary: "Package script nhw:validate executes node scripts/nhw/validate.mjs."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "nhw:validate"
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

What does `component.repository.package-script.package.json.nhw-validate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.nhw-validate is the canonical package-script named clinicos:nhw:validate.

## Inputs

Command invocation: `nhw:validate`.

## Outputs

Executable command: `node scripts/nhw/validate.mjs`.

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

- `package.json` — nhw:validate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
