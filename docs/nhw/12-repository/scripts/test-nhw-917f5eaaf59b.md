---
id: "component.repository.package-script.package.json.test-nhw"
kind: "package-script"
title: "clinicos:test:nhw"
status: "observed"
summary: "Package script test:nhw executes node --test scripts/nhw/test/contracts.test.mjs scripts/nhw/test/inventory.test.mjs scripts/nhw/test/typescript-extractor.test.mjs scripts/nhw/test/python-extractor.test.mjs scripts/nhw/test/prisma-extractor.test.mjs scripts/nhw/test/repository-extractor.test.mjs scripts/nhw/test/markdown-graph.test.mjs scripts/nhw/test/coverage-validator.test.mjs scripts/nhw/test/knowledge-compiler.test.mjs scripts/nhw/test/determinism.test.mjs."
bounded_contexts: []
sources:
  - path: "package.json"
    symbol: "test:nhw"
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

What does `component.repository.package-script.package.json.test-nhw` represent in ClinicOS?

## Canonical Definition

component.repository.package-script.package.json.test-nhw is the canonical package-script named clinicos:test:nhw.

## Inputs

Command invocation: `test:nhw`.

## Outputs

Executable command: `node --test scripts/nhw/test/contracts.test.mjs scripts/nhw/test/inventory.test.mjs scripts/nhw/test/typescript-extractor.test.mjs scripts/nhw/test/python-extractor.test.mjs scripts/nhw/test/prisma-extractor.test.mjs scripts/nhw/test/repository-extractor.test.mjs scripts/nhw/test/markdown-graph.test.mjs scripts/nhw/test/coverage-validator.test.mjs scripts/nhw/test/knowledge-compiler.test.mjs scripts/nhw/test/determinism.test.mjs`.

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

- `package.json` — test:nhw

## Related Knowledge

- `belongs-to` → `project.repository-automation`
