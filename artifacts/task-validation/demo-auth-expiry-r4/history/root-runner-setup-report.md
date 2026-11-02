# Retained root test-runner setup attempt

During implementation round 3, a first ad-hoc focused command used `node --import
tsx --test` without the repository CSS stub. The component file failed with
`ERR_UNKNOWN_FILE_EXTENSION` for Login.css; the two new parser regressions also
failed with `auth_status_invalid` as expected. This was not a production/browser
failure or a reason to weaken assertions.

The corrected command uses the existing `scripts/stub-css-loader.mjs` after tsx
and the existing frontend tsconfig. Its retained red receipt shows exactly 7
passing tests and the 2 genuinely failing parser regressions, with no setup
failure. The subsequent retained green receipt has all 9 tests passing. No
assertions were skipped; malformed-expiry cases were moved from generic
parse-rejection expectations to explicit mode-authority assertions.

A first local commit attempt had no configured author identity and created no
commit. It was retried with per-command identity matching the existing verified
repository author; no global Git configuration or user project files changed.
The red-only test commit is 642b5002fa18095581be07a27e8493efff0ad9a1;
the UI fix is 3360976e (full identity will be bound by the integrated QA receipt).
