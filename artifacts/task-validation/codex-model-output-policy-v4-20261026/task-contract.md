# Task Contract

## Task
- Title: Codex model execution and Claude review contract reliability
- Slug: codex-model-output-policy-v4-20261026
- Type: bugfix
- Date: 2026-10-26

## Current Behaviour

Actual normal Codex clinical corrections failed with an unretained generic error. A synthetic progress trace proves the original fatal stdout limit can reject valid model work. After the source3 correction and six green native checks, actual Claude review4 generated approved plus three findings, correctly rejected by unchanged native validation. Native revision adoption also omitted a canonical handoff authorization history field.

## Expected Behaviour

Retain the source3 bounded-memory model streaming fix; align generation instructions with existing strict review semantics; expose finite diagnostic metadata without raw provider/clinical text; preserve canonical consumed handoff authorization histories on adoption.

## Acceptance Criteria
- AC1: Model stdout exceeding2MiB can finish with a valid bounded typed result; owned32KiB tails, fatal64KiB stderr, timeout/process-group, path and schema guards remain.
- AC2: All default/controller/review/verification combined caps and negative result/timeout protections remain; status numbers require status/HTTP context.
- AC3: Both Claude generation paths require approved only with zero findings and supported acceptance evidence; any finding forbids approval, changes-requested requires findings, BLOCKED permits an empty list. No report/result normalization or finding suppression occurs.
- AC4: Permanent diagnostics expose only fixed safe metadata and cannot change original outcomes or errors; no raw provider text, secret or patient data is published.
- AC5: Native adoption preserves exact reviewHandoffHistory and spent grants/attempts; all existing histories, budgets, validators and protected ownership continue unchanged.
- AC6: NEW independent QA source identity, actual immutable packet verification and all six current-head native CI successes precede a genuine corrected peer request; NEW independent final Codex follows approval before ordinary protected merge. Future sequential gates are not requirements to fabricate before earlier review.

## Test Plan

Real synthetic child RED/GREEN streaming and negative limits; unchanged native strict-validator consistency cases including approved+LOW and BLOCKED empty; diagnostic privacy and callback outcome tests; actual native adoption/recovery journal preservation fixture; full native1689 tests with1686PASS/0FAIL/3 platform skips. No clinical/patient data or provider replay.

## Gate Status

Source4 authored; independent QA and later exact-head CI/peer/final/merge are sequential genuine gates.
