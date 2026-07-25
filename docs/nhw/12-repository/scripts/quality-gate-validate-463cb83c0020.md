---
id: "component.repository.package-script.package.json.quality-gate-validate"
kind: "package-script"
title: "clinicos:quality-gate:validate"
status: "observed"
summary: "Package script quality-gate:validate executes node scripts/quality-gate/validate-task-contract.js."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "quality-gate:validate"
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

What does `component.repository.package-script.package.json.quality-gate-validate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.quality-gate-validate is the canonical package-script named clinicos:quality-gate:validate.

## Inputs

Command invocation: `quality-gate:validate`.

## Outputs

Executable command: `node scripts/quality-gate/validate-task-contract.js`.

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

- `package.json` — quality-gate:validate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
