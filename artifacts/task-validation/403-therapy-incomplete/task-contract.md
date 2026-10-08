# Task Contract: #403 visible incomplete therapy programming

## Impact Classification

Frontend presentation, navigation and accessibility only. No dosing/planner/read engine, backend, schema, dependencies or capability policy changes. Synthetic local QA data only; no live patient mutations.

## Current Behaviour

The calendar reports zero doses and renders 24 empty hours before listing incomplete prescriptions. The warning is below the first screen and the grid introduces another vertical scroll container.

## Expected Behaviour

Show distinct scheduled-dose and incomplete-prescription counts before the grid. Explain zero scheduled doses explicitly. Make incomplete details reachable there without a nested vertical scroller. Authorized prescribers can open the existing populated prescription editor; other roles see the prescribing clinician as their reference. Never infer exact hours from named time bands.

QA iteration repair: summary also precedes date toolbar/heading so it remains visible on mobile with legitimate optional-demographics reminders. Calendar-linked editing opts into exact saved times only: no legacy band/default restoration; other legacy entry points retain compatibility. Newly added editor rows have blank times requiring explicit entry. Shared clinical calendar engine/read logic remains untouched. Restore unrelated formatter changes before final QA.

## Acceptance Criteria

1. AC1: At 1150x1004 and mobile390, the initial calendar screen distinguishes scheduled doses/exact hours from incomplete therapies, including the mixed valid/invalid and PRN cases.
2. AC2: Zero scheduled doses with incomplete therapies has an explicit empty-state explanation, distinct from a genuinely empty calendar. Day/week labels and counts match the displayed period.
3. AC3: Exact times and clinical engine remain unchanged. Only therapy.update receives editing actions; opening them uses the complete calendar prescription and focuses the existing populated editor. No write occurs from viewing or navigating. Other roles are referred to the prescribing clinician.
4. AC4: Warning and expandable details precede the grid and share its outer vertical scroll path. Keyboard and mobile access pass; week content remains reachable without page overflow.

## Test Plan

Add focused render/source regression tests; preserve and run calendar engine/read, therapy in-place/create tests. Run types, build and full frontend tests, compare with the exact known 12-failure baseline (zero new failures). New dedicated independent QA exercises the actual SPA against intercepted synthetic APIs: incomplete2/zero, mixed, PRN, day/week, nurse/doctor, populated editing from a later complete-list page, no navigation writes, keyboard focus, desktop/mobile and scroll behaviour. Review unexpected console/runtime/relevant HTTP failures.

## Evidence Plan

Bind source receipt to immutable candidate commit before independent QA. Capture screenshots, named final video, trace, HTML/JSON results and sanitized test logs. Root reruns gate, publishes only a verified exact-source candidate, checks Git-linked Vercel READY and public assets/health without live patient writes, commits proof-only artifacts, posts pinned screenshots on #403 and closes only verified ACs. User explicitly authorizes sequential fixes, commits/pushes/deployment and GitHub proof/closure. No claim of clinical/hardware validation.

## Gate Status

READY FOR IMPLEMENTATION

## Ownership / policy receipt

Root alone writes application files in C:/Workspace/ClinicOSHouse-worktrees/insulin-online-20261008. Read-only researcher completed. Independent QA owns only this task's evidence after the application freeze. Decision: allow scoped frontend changes/synthetic evidence/authorized release; deny simultaneous app writers, secret/PHI publication, real patient test mutations or capability weakening. Unrelated dirty files remain untouched.
