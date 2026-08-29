# Task Contract

## Task

- Title: Quality loop 11 canonical design tokens
- Slug: `quality-loop-11-canonical-design-tokens`
- Type: UX consistency/accessibility/CSS architecture
- Date: 2026-08-29

## Baseline

`App.css` declares two global `:root` blocks. `--sidebar-w` is first set to 240 px and later
overridden to 96 px, while navigation, semantic intent, card and quick-entry tokens are split
between the blocks. The extra-muted text token is `#8595a8`, only about 3.06:1 against the white
surface, and is used throughout headers, labels, metadata and empty states.

## Expected Behaviour

One canonical root owns brand, semantic, layout, typography and component tokens. The effective
desktop sidebar remains 96 px, intentional responsive overrides remain scoped to media queries,
and extra-muted text meets WCAG AA contrast on the canonical white surface. This cycle changes no
component layout or clinical behavior.

## Acceptance Criteria

- AC1: `App.css` contains exactly one top-level `:root` token block.
- AC2: no token is declared twice inside that block; desktop `--sidebar-w` remains 96 px.
- AC3: `--text-xmuted` reaches at least 4.5:1 against `--surface` without changing semantic status
  colors or clinical alert meaning.
- AC4: responsive sidebar overrides remain media-scoped and unchanged.
- AC5: a deterministic test parses tokens, rejects duplicate root declarations and computes the
  contrast gate.
- AC6: frontend production build, full frontend tests, scoped style/test lint, diff check and two
  independent reviews pass.
- AC7: validation records behavior-preserving token consolidation separately from unresolved CSS
  bundle weight and page-level component standardization.

## Gate Status

PASS FOR BRANCH — production deploy remains externally gated
