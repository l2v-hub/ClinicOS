# Task Contract — versioned clarification8

## Current Behaviour

Original issue507 explicitly asks therapy scheduling start dates to default to admission. Current code already keeps dataInizio at admission for periodica, al_bisogno and una_tantum; dataSomministrazione is a separate field with current-day-or-future default. The old generated AC incorrectly combined both fields. The genuine negative final review is preserved, not reclassified as approved.

## Expected Behaviour

Proponi la data di ingresso per le nuove terapie

## Acceptance Criteria

- AC1: New manual therapy dataInizio defaults to the actual resolved admission day, including delayed cartella hydration and repeated intake admission corrections.
- AC2: New once administration dataSomministrazione remains at the facility current day or later admission day, so a past admission does not silently backdate a new one-off dose. Explicit operator dates keep precedence.
- AC3: Operator edits, saved/imported dates and explicit calendar dates retain precedence; no timezone shift of calendar dates.
- AC4: Independent actual-host and intake browser evidence, meaningful unit regressions, build, frontend tests and privacy checks pass with synthetic fixtures.

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

Actual native run40429879923 on CODE db2a891fe982dac8c42f8fb5a3e91a49404f30fa, all3commands PASS and native-validated fresh PNG/trace/video. Application and harness source remain byte-identical. Old original-cold-probe JSON is explicitly historical; current-results JSON is the actual native finite proof, without invented per-assert output. No new browser run is claimed for this metadata-only revision.

## Gate Status

PARTIAL — new independent contract/evidence QA, exact new-head six CI, genuine peer3, fresh final Codex, protected merge and deployment remain pending.
