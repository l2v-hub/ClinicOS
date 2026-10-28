# Task Contract

## Impact Classification

Issue #507, accepted scope only.

## Current Behaviour

Genuine peer on 9e0a8dec7fb8bbf5edcaf00694be63f6fda577ff requested a correction.

## Expected Behaviour

Choosing a nonempty end date or the existing inclusive seven-day chip takes operator ownership of the start date before updating the end. Later admission edits preserve this interval. Empty end/Senza fine retain automatic lineage. Once-administration policy is unchanged; start-date default and administration date remain distinct.

## Acceptance Criteria

[
  {
    "issue": 507,
    "criteria": [
      "New manual therapy dataInizio defaults to the actual resolved admission day, including delayed cartella hydration and repeated intake admission corrections.",
      "New once administration dataSomministrazione remains at the facility current day or later admission day, so a past admission does not silently backdate a new one-off dose. Explicit operator dates keep precedence.",
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

Actual React browser with synthetic patient data only; native-validated PNG, trace and video at plan paths.

## Gate Status

Source independent QA and real native verification/evidence have passed on the immutable CODE. Six required checks on the final published head, new genuine Claude peer, fresh final Codex, protected merge and deployed acceptance are sequential pending gates. No issue closure or deployment acceptance is claimed.
