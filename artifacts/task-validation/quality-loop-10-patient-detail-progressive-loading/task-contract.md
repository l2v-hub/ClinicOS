# Task Contract

## Task

- Title: Quality loop 10 progressive patient-detail loading
- Slug: `quality-loop-10-patient-detail-progressive-loading`
- Type: frontend performance/usability refactor
- Date: 2026-08-29

## Baseline

The patient chart route is lazy at application level, but `PatientDetail.tsx` statically imports
every clinical tab. Its production route chunk is 315.53 kB (71.65 kB gzip), while the source file
is 106 kB and several rarely opened tab modules range from 15 kB to 71 kB source. Opening any
patient therefore downloads and parses discharge, wound care, restraints, documents, scores and
other specialist modules before the default overview can be used.

## Expected Behaviour

The chart header, overview and navigation become interactive without downloading every specialist
tab. A tab module loads only after its canonical navigation item is selected. Loading has one
consistent accessible placeholder, failures are recoverable through the existing route boundary,
and switching tabs preserves the current patient/session semantics and all clinical actions.

## Acceptance Criteria

- AC1: specialist tabs are split with explicit `React.lazy` boundaries; no eager import of their
  component implementation remains in `PatientDetail`.
- AC2: the initial PatientDetail production JS chunk decreases by at least 30% from 315.53 kB and
  remains below 220 kB uncompressed; each extracted chunk is bounded and named by the build.
- AC3: the loading placeholder uses `role=status`, `aria-live=polite` and consistent ClinicOS copy;
  no empty-state or zero clinical claim appears while a tab is loading.
- AC4: diary filter constants live in a dependency-light module so importing filter metadata does
  not eagerly import the diary component.
- AC5: default overview, tab/group navigation, patient switching, tab badges, patient-scoped
  consegne and write callbacks retain their current contracts.
- AC6: frontend build, full frontend tests, focused lazy-boundary guard test, scoped lint and
  `git diff --check` pass; independent UX/performance and security reviews report no P0/P1.
- AC7: validation receipt records exact before/after chunk sizes and residual heavy chunks without
  claiming network/Web-Vitals results that were not measured.

## Gate Status

PASS FOR BRANCH — production deploy remains externally gated.
