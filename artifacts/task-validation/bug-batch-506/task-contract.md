# Task Contract

## Impact Classification

Bug batch bug-batch-506. Only the accepted file scope is authorized.

## Current Behaviour

Global viewport modal overlays covered the shell in document, review, lazy-loading and resumed-intake phases; explicit page presentation reuses existing navigation and preserves pending-save and modal safeguards.
Harness-only evidence version: actual native C5 build/frontend tests passed; bundled Playwright qualified in40423083192. The same behavioral regression runs with a self-owned loopback server, sealed default environment and deterministic current evidence paths. All old plans, FAILED journals and four retained source snapshots remain preserved.

## Expected Behaviour

Mantieni import e bozze nello spazio principale della pagina

## Acceptance Criteria

[
  {
    "issue": 506,
    "criteria": [
      "Import, review and resumed draft fill the existing main pane without obscuring shell navigation at desktop/tablet/mobile widths.",
      "Page presentation is nonmodal; existing true dialogs preserve focus/Escape; leaving with a pending draft flushes the save, and failed save retains the draft.",
      "Independent actual React browser evidence, source integrity, build, frontend tests and privacy checks pass with explicit synthetic localhost fixtures."
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
      "e2e/issue506-workspace.mjs"
    ]
  }
]

## Evidence Plan

Synthetic local fixtures and fresh native-validated screenshot, trace and video at the versioned plan paths. No production data.

## Gate Status

SOURCE AND EVIDENCE QUALIFIED; independent source QA, current-head CI, genuine peer and fresh final Codex remain sequential gates.
