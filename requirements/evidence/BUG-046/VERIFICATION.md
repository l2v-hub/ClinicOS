# BUG-046 / #68 — Verification (2026-06-22)

## Status: code FIXED + merged, blocked on PROD backend deploy (GitHub Actions billing)

### Code fix (on `main`)
- `backend/src/ai/sections/header-filter.ts` — `inlineLabels` / `headerLineLabels` detect
  header rows packed as multiple `label: value` pairs on one line, and absorb blank/value
  gaps between header rows. Commits `bf67e01`, `940f5c7`.
- Wiring confirmed: `job-service.ts` applies `filterRepeatedHeaders(rawText)` →
  `cleanedRawText` → `parseNarrativeFromMarkdown(cleanedRawText, …)` (lines 703–708).

### Unit evidence (local, current `main`)
- `header-filter.test.ts` — **15/15 pass**, incl. the BUG-046 regression
  *"inline multi-label header row repeated across pages is removed from later pages"*.
- `markdown-parse.test.ts` — **18/18 pass**.

### Prod E2E reproduction (proves prod is STALE, not a code bug)
Ran `e2e/prod-multipage-verify.mjs` with a 100% synthetic 2-page letter
(`ROSSI MARIO — PAZIENTE FITTIZIO`) against the deployed app. Result:

```
anamnesi_mergedBothPages: true
anamnesi_noHeaderBleed:    false   <-- repeated header STILL bleeds into Anamnesi on prod
```

The identical input is removed correctly by the current `main` code in unit tests, so the
deployed backend is running an OLD commit.

### Deploy blocker (root cause prod is stale)
`Deploy Backend to Railway` workflow fails instantly on every push to `main`:
> "The job was not started because recent account payments have failed or your spending
> limit needs to be increased." (run 27917968529, 2026-06-21)

Railway's API is also unreachable from the dev machine (TLS interception:
`invalid peer certificate: UnknownIssuer`), so a manual `railway up` is not possible here.

### To finish
Restore GitHub Actions billing (or deploy the backend to Railway from a network that can
reach Railway), then re-run `e2e/prod-multipage-verify.mjs` — expect `anamnesi_noHeaderBleed: true`.
