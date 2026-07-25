---
id: "component.repository.package-script.package.json.build-frontend"
kind: "package-script"
title: "clinicos:build:frontend"
status: "observed"
summary: "Package script build:frontend executes npm --prefix frontend run build."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "build:frontend"
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

What does `component.repository.package-script.package.json.build-frontend` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.build-frontend is the canonical package-script named clinicos:build:frontend.

## Inputs

Command invocation: `build:frontend`.

## Outputs

Executable command: `npm --prefix frontend run build`.

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

- `package.json` — build:frontend

## Related Knowledge

- `belongs-to` → `project.repository-automation`
