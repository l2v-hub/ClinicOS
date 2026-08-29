# Task Contract

## Task

- Title: Quality loop 13 canonical operational headers
- Slug: `quality-loop-13-canonical-operational-headers`
- Type: UX consistency/accessibility
- Date: 2026-08-29

## Baseline

Dashboard, Patients and multi-patient Parameters use the canonical `PageHeader`, while Handover and
Notes still use the smaller legacy `view-header` with a different heading level, spacing and no
breadcrumb. Their create actions also do not expose the expanded state or controlled panel to
assistive technology.

## Expected Behaviour

Handover and Notes use the same title hierarchy, breadcrumb, subtitle and action placement as the
other high-frequency operational pages. Existing counts, filters, forms and callbacks remain
unchanged. The create buttons report whether their form panel is open.

## Acceptance Criteria

- AC1: both pages render `PageHeader` and no longer render `view-header`.
- AC2: breadcrumbs are `ClinicOS / Consegne` and `ClinicOS / Note`.
- AC3: titles, summary counts and the red unread status retain their meaning.
- AC4: create buttons retain callbacks and expose `type=button`, `aria-expanded` and matching
  `aria-controls` panel IDs.
- AC5: no request, domain prop, mutation, filtering or runtime data flow changes.
- AC6: Agenda and `PageShell` remain outside scope to avoid control-density and nested-scroll risk.
- AC7: deterministic guards, frontend build, full regression, scoped lint, diff check and two
  independent reviews pass.

## Gate Status

PASS FOR BRANCH — production deploy remains externally gated
