# Task Contract

## Impact Classification

Issue #506, accepted scope only.

## Current Behaviour

Genuine peer on 5105becde8bb222652ab2df7e72b0d32f05a7262 requested a correction.

## Expected Behaviour

A failed save now releases the pending route; a later route asks again, non-navigation close cannot replay a stale destination, finished uploads clear the notice, and the same mobile confirmation is portalled outside the clipped workspace. Real four-width browser cases cover save failure, second route and visible confirmation.

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

Actual React browser with synthetic patient data only; native-validated PNG, trace and video at plan paths.

## Gate Status

Source independent QA and real native verification/evidence have passed on the immutable CODE. Six required checks on the final published head, new genuine Claude peer, fresh final Codex, protected merge and deployed acceptance are sequential pending gates. No issue closure or deployment acceptance is claimed.
