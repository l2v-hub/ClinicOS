---
id: "component.repository.package-script.package.json.nhw-generate"
kind: "package-script"
title: "clinicos:nhw:generate"
status: "observed"
summary: "Package script nhw:generate executes node scripts/nhw/generate.mjs."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "nhw:generate"
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

What does `component.repository.package-script.package.json.nhw-generate` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.nhw-generate is the canonical package-script named clinicos:nhw:generate.

## Inputs

Command invocation: `nhw:generate`.

## Outputs

Executable command: `node scripts/nhw/generate.mjs`.

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

- `package.json` — nhw:generate

## Related Knowledge

- `belongs-to` → `project.repository-automation`
