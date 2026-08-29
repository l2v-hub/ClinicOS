# Validation Report

## Outcome

Cycle 10 is **PASS for branch publication**. The patient chart keeps its header, overview and
navigation in the initial route chunk while fifteen specialist components load on first use.
Clinical props, callbacks, tab IDs and patient/session orchestration are unchanged.

## Measured production build

| Artifact | Before (`057defca`) | After | Change |
| --- | ---: | ---: | ---: |
| PatientDetail JS | 315.53 kB | 64.33 kB | -79.6% |
| PatientDetail JS gzip | 71.65 kB | 12.11 kB | -83.1% |

The result exceeds the contract's 30% reduction and 220 kB upper bound. Extracted chunks range
from 1.55 kB to 59.40 kB raw. The largest is `DimissioneTab` (59.40 kB / 14.43 kB gzip), followed
by `PresaInCaricoTab` (37.35 kB / 10.21 kB gzip), `ContenzioniTab` (31.97 kB / 8.48 kB gzip) and
`MedicazioniTab` (28.02 kB / 7.26 kB gzip). `InvioPSModal` is also on-demand at 15.15 kB.

No network timing or Web Vitals claim is made: these values are deterministic Vite production
artifact sizes, not a browser performance trace.

## UX and safety behaviour

- The local Suspense boundary wraps only the chart content; patient header and navigation remain.
- Loading uses `role="status"`, `aria-live="polite"`, `aria-busy="true"` and one consistent label.
- A lazy tab never falls through to a false empty state while its module is loading.
- The existing application error boundary catches rejected imports.
- Diary filter metadata is a dependency-free module, so the navigation filter does not import the
  diary implementation.
- The diary initial read is scheduled with a cancellable zero-delay timer, avoiding synchronous
  state updates inside the effect and cancelling cleanly on unmount/patient switch.
- A patient ID change remounts the whole chart; diary reads also use AbortController, request
  sequence and success/error/finally guards, preventing cross-patient stale rendering.
- Nested therapy, vital-sign and NRS imports reuse the same accessible fallback; no second-level
  `fallback=null` can create a blank clinical panel.

## Validation evidence

| Gate | Result |
| --- | --- |
| Frontend production build / TypeScript | PASS |
| Frontend regression | PASS, 180/180 |
| Lazy/privacy boundary guard tests | PASS, 4/4 |
| Scoped ESLint for new loader/filter/test and touched diary | PASS, 0 findings |
| `git diff --check` | PASS; configured LF/CRLF warnings only |

The static guards require all fifteen loader exports, prohibit representative eager specialist
imports in `PatientDetail`, verify the accessible fallback and ensure diary filter metadata has no
React/component dependency. Independent UX/performance and security re-reviews are both PASS with
no residual P0/P1 after the loading and patient-retargeting remediations.

## Residuals

- `PatientDetail.tsx` remains a large source file with pre-existing React compiler lint debt around
  ref-reading navigation callbacks. This cycle removes bundled dependencies but does not claim to
  complete the source-level decomposition.
- Global CSS remains 234.44 kB raw (39.55 kB gzip) and is unchanged; token consolidation is a
  separate UX performance cycle.
- The application entry and intake/pdf chunks remain the largest frontend artifacts and are future
  measured candidates.
- Production deploy is still externally gated by Vercel authentication/project binding and real
  Entra/target PostgreSQL configuration.

## Rollback

Revert the cycle commit. No database, API, authorization or persisted clinical-data contract is
changed by this refactor.
