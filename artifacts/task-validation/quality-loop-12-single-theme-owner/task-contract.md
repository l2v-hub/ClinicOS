# Task Contract

## Task

- Title: Quality loop 12 single theme owner
- Slug: `quality-loop-12-single-theme-owner`
- Type: UX consistency/CSS architecture/performance hygiene
- Date: 2026-08-29

## Baseline

The imported CSS graph has three theme owners. `App.css` contains the effective canonical tokens,
`clinicos-restyle.css` repeats the same font request and a divergent token root, and `index.css`
retains Vite-era aliases plus an automatic dark theme. Source order currently hides most conflicts,
but an import reorder can silently change spacing, color, typography and clinical surfaces.

## Expected Behaviour

`App.css` is the only application-token and font owner. `clinicos-restyle.css` remains a
selector-only refinement layer. `index.css` keeps rendering normalization and its existing global
element dimensions, but resolves typography, text and code surfaces through canonical tokens and
cannot switch the clinical application into a partial dark theme.

## Acceptance Criteria

- AC1: the imported style graph contains exactly one top-level token root.
- AC2: it contains exactly one Google Fonts request.
- AC3: no active reference remains to `--heading`, `--mono`, `--text-h` or `--code-bg`.
- AC4: no automatic dark-scheme token override can retarget the clinical theme.
- AC5: responsive sidebar overrides, semantic clinical colors and selector-level restyle rules are
  unchanged.
- AC6: deterministic guards, frontend build, full frontend regression, scoped lint, diff check and
  independent UX/performance and security reviews pass.
- AC7: validation reports CSS output size separately from the much larger unresolved
  `app-additions.css` cleanup.

## Gate Status

PASS FOR BRANCH — production deploy remains externally gated
