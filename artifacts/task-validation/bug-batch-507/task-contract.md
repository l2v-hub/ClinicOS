# Task Contract

## Impact Classification

Bug batch bug-batch-507. Only the accepted file scope is authorized.

## Current Behaviour

Creation factory previously used facility today; actual chart admission is resolved from presaInCarico, intake uses ingresso.dataPresa. Late asynchronous context and explicit date edits require per-field default provenance.
Harness-only evidence version: actual native C5 build/frontend tests passed; bundled Playwright qualified in40423083192. The same behavioral regression runs with a self-owned loopback server, sealed default environment and deterministic current evidence paths. All old plans, FAILED journals and four retained source snapshots remain preserved.

## Expected Behaviour

Proponi la data di ingresso per le nuove terapie

## Acceptance Criteria

[
  {
    "issue": 507,
    "criteria": [
      "New manual therapy start/once default dates use the actual resolved admission day, including delayed cartella hydration.",
      "Operator edits, saved/imported dates and explicit calendar dates retain precedence; no timezone shift of calendar dates.",
      "Independent actual-host and intake browser evidence, meaningful unit regressions, build, frontend tests and privacy checks pass with synthetic fixtures."
    ]
  }
]

## Test Plan

[
  {
    "command": "npm",
    "args": [
      "--prefix",
      "frontend",
      "run",
      "build"
    ]
  },
  {
    "command": "npm",
    "args": [
      "--prefix",
      "frontend",
      "test"
    ]
  },
  {
    "command": "node",
    "args": [
      "--import",
      "tsx",
      "e2e/issue507-smoke.mjs"
    ]
  }
]

## Evidence Plan

Synthetic local fixtures and fresh native-validated screenshot, trace and video at the versioned plan paths. No production data.

## Gate Status

SOURCE AND EVIDENCE QUALIFIED; independent source QA, current-head CI, genuine peer and fresh final Codex remain sequential gates.
