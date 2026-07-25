---
id: "component.repository.package-script.package.json.dev-backend"
kind: "package-script"
title: "clinicos:dev:backend"
status: "observed"
summary: "Package script dev:backend executes npm --prefix backend run dev."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "dev:backend"
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

What does `component.repository.package-script.package.json.dev-backend` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.dev-backend is the canonical package-script named clinicos:dev:backend.

## Inputs

Command invocation: `dev:backend`.

## Outputs

Executable command: `npm --prefix backend run dev`.

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

- `package.json` — dev:backend

## Related Knowledge

- `belongs-to` → `project.repository-automation`
