---
id: "component.repository.package-script.package.json.quality-gate-check-closure"
kind: "package-script"
title: "clinicos:quality-gate:check-closure"
status: "observed"
summary: "Package script quality-gate:check-closure executes node scripts/quality-gate/check-closure.js."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "quality-gate:check-closure"
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

What does `component.repository.package-script.package.json.quality-gate-check-closure` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.quality-gate-check-closure is the canonical package-script named clinicos:quality-gate:check-closure.

## Inputs

Command invocation: `quality-gate:check-closure`.

## Outputs

Executable command: `node scripts/quality-gate/check-closure.js`.

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

- `package.json` — quality-gate:check-closure

## Related Knowledge

- `belongs-to` → `project.repository-automation`
