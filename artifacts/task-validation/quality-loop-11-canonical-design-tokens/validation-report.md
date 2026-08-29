# Validation Report

## Outcome

Cycle 11 consolidates the global design tokens without changing the effective desktop or responsive
sidebar geometry. The extra-muted text role now meets WCAG AA contrast on the canonical surface.
Independent UX/performance and security reviews are PASS with no residual P0/P1 introduced by the
diff, so the cycle is PASS for branch publication.

## Token evidence

| Gate | Before | After |
| --- | ---: | ---: |
| Top-level `:root` token blocks | 2 | 1 |
| Duplicate `--sidebar-w` at top level | 240 px then 96 px | canonical 96 px |
| `--text-xmuted` | `#8595a8` | `#64758a` |
| Contrast on `--surface: #fff` | 3.06:1 | 4.72:1 |

The mobile 220 px and small-laptop 88 px sidebar overrides remain inside their original media
queries. Brand, success, warning, danger and info values are unchanged, so clinical severity is not
remapped by this cycle.

## Validation evidence

| Gate | Result |
| --- | --- |
| Frontend production build / TypeScript | PASS |
| Frontend regression | PASS, 183/183 |
| Design-token guards | PASS, 3/3 |
| Scoped test ESLint | PASS, 0 findings |
| `git diff --check` | PASS; configured LF/CRLF warning only |

The guard discovers top-level roots by brace depth, rejects duplicate token names, asserts the
canonical desktop width, calculates relative luminance/contrast and verifies both responsive media
overrides.

## Explicit residuals

- Built CSS remains 234.42 kB raw / 39.55 kB gzip. Consolidating ownership removes ambiguity but
  does not materially reduce bundle size.
- Many pages still use raw buttons, headers, inline styles and local component rules. Those require
  incremental component adoption and visual regression coverage; this cycle does not claim global
  visual uniformity is complete.
- `clinicos-restyle.css` still owns a separate token root and font import, while `index.css` retains
  legacy theme rules. Those are a follow-up consolidation target rather than a claim of this cycle.
- No browser screenshot or Web Vitals measurement is claimed for this source-level token cycle.
- Production deploy remains gated by Vercel authentication/project binding and real Entra/target
  PostgreSQL configuration.

## Rollback

Revert the cycle commit. There are no database, API, authentication or persisted-data changes.
