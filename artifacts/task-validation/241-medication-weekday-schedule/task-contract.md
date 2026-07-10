# Task Contract

## Task
- Title: Issue #241 — PUT bypasses giorniSettimana normalization
- Slug: 241-medication-weekday-schedule
- Type: bugfix (regression fix on top of prior #241 feature)
- Date: 2026-07-10
- Issue: https://github.com/<org>/ClinicOS/issues/241
- Prior evidence (superseded, kept for history): `artifacts/task-validation/241-farmaco-giorni-settimana/`
- Branch: `fix/issue-241-giorni-settimana` (worktree `.wt-fix/241`)

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no (pill rendering already reads `giorniSettimana` as-is; no component change needed) |
| Backend/API | yes — `PUT /patients/:patientId/therapies/:therapyId` in `backend/src/routes/patient-therapies.ts` |
| Database/Persistence | yes — same column (`PatientTherapy.giorniSettimana`, TEXT nullable) can be written with non-canonical data via PUT today |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no (no PHI in the field itself, only weekday codes) |
| Config / Env | no |

## Current Behaviour

The POST route (`createTherapyInTx` → `therapy-create.ts`) always canonicalizes the
`giorniSettimana` field through `normalizeGiorniSettimana()` before persisting: it dedupes,
sorts ISO weekday codes (1=Mon…7=Sun), and collapses "all 7 days" / empty input to `null`
(= every day).

The PUT route (`backend/src/routes/patient-therapies.ts`, handler at lines ~73-135) does NOT
apply the same normalization. `'giorniSettimana'` is listed in the `scalarAllowed` array
(line 92) and is copied verbatim from the request body into the Prisma `updates` object
(lines 96-98), exactly like any other plain scalar (e.g. `farmacoNome`). Unlike
`commercialStrengthValue`, which DOES get post-processed after the copy loop (lines 99-100),
`giorniSettimana` gets no post-processing at all.

Consequence: a PUT request can persist non-canonical or invalid CSV such as `'9,9,x,2,2,1'`
(duplicates, out-of-range values, unsorted) or edge-case strings that should mean "every day"
but don't collapse to `null`. Because the `/therapy-slots` weekday filter (see
`giorni-settimana.test.ts`, `appearsOn()`) does `giorni.split(',').map(parseInt).includes(iso)`,
a stray non-numeric token is harmless (NaN never matches) but a malformed/incomplete day list
can silently suppress a therapy from days it should appear on, and there is no defense against
future PUT payloads that pass something semantically equivalent to "every day" without
collapsing to the canonical `null` sentinel that AC5 depends on for backward compatibility.

## Expected Behaviour

PUT normalizes `giorniSettimana` exactly like POST: after the `scalarAllowed` copy loop, if the
key was present in the update body, replace it with
`normalizeGiorniSettimana(updates.giorniSettimana as string | null)`. Result is always either
`null` (every day / no restriction) or a canonical CSV of unique, ascending ISO weekday codes
1..7 (e.g. `'1,2,4,7'`). This mirrors the `commercialStrengthValue` post-processing pattern
already present in the same handler.

## Acceptance Criteria

- AC1 — Weekday selection: creating/editing a therapy exposes a weekday selector
  (`therapy-weekdays` / `weekday-{1..7}` toggles) and the choice is reflected in a summary pill
  (`therapy-days-summary`). *(pre-existing, from original #241 feature; re-verified here)*
- AC2 — Single day: selecting exactly one weekday persists and displays only that day.
- AC3 — Multiple days: selecting several weekdays (e.g. Lun/Mar/Gio/Dom = 1,2,4,7) persists and
  displays all of them, deduped and sorted regardless of toggle order.
- AC4 — Persistence after reload: after editing an existing therapy's weekdays via **PUT** and
  reloading the page (`page.reload()`), the summary pill still reflects the edited (canonical)
  set — this is the AC that was previously unverified and is the crux of this regression fix.
- AC5 — Backward compatibility: therapies with no weekday restriction (`giorniSettimana = null`)
  continue to appear every day; PUT-ing a body that omits `giorniSettimana` must not touch the
  existing value (untouched key ⇒ absent from `updates`, per the `scalarAllowed` copy-loop
  guard `body[key] !== undefined`).
- AC6 (new, regression-specific) — PUT normalizes non-canonical input: a PUT payload with
  duplicate/out-of-order/all-7 weekday codes is canonicalized identically to POST
  (`normalizeGiorniSettimana`), never persisted raw.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `giorni-settimana.test.ts` already covers `normalizeGiorniSettimana` in isolation; extended with PUT-shaped garbage inputs (`'9,9,x,2,2,1'`, `'7,1,3'`, all-7, empty) to prove the exact normalizer the PUT route now calls behaves identically to the POST path — the shared pure function is the smallest unit that proves the fix without needing an HTTP harness. |
| Integration | no | No new Prisma/tx integration test added; the transaction shape in PUT is unchanged (only the `updates.giorniSettimana` value differs), covered by existing route logic + unit test on the normalizer it now calls. |
| API | no | No supertest harness exists in this backend; behaviour is exercised end-to-end via the Playwright spec instead (POST create → PUT edit → assert pill). |
| Playwright | yes | `e2e/remediation/issue-241.spec.ts` exercises the actual bug path: create a therapy via POST, then **edit it via the UI (which calls PUT)**, toggling a weekday off, and asserts the persisted/reloaded pill reflects the edit — this is the only test that proves the PUT route (not just the POST route) is normalizing. |
| Persistence after refresh | yes | Same spec: `page.reload()` + reopen tab after the PUT-driven edit, assert pill unchanged — directly targets AC4. |
| Agnos action registry | no | Not touched. |
| Voice simulation | no | Not touched. |
| OCR/import test | no | Not touched. |
| Security/privacy scan | no | No PHI/secrets in the field; synthetic patient (Moretti Elena) only. |

## Evidence Plan

Required evidence:
- validation-report.md (this dir)
- unit test output (`giorni-settimana.test.ts` run log)
- Playwright screenshot of the pill after PUT-driven edit + reload
- Playwright trace (`trace.zip`), `playwright-report/`, `test-results/`
- video of the edit → reload flow
- prior evidence (`241-farmaco-giorni-settimana/`) referenced as baseline for the POST-only path

## Risks

- **Silent data loss on old rows**: rows written before this fix may already contain
  non-canonical `giorniSettimana` values (e.g. unsorted or duplicated) from earlier PUT calls.
  This fix does not backfill/migrate existing rows — it only prevents new non-canonical writes.
  Mitigation: the weekday filter (`appearsOn`) is tolerant of unsorted/duplicated-but-valid CSV
  (it just does an `includes` check), so old rows keep working correctly for valid day codes;
  only truly malformed values (already broken before this fix) are unaffected by this change
  until the row is next PUT-updated (which will then canonicalize it).
- **Behavioural change on partial updates**: if a caller relies on PUT preserving a raw
  (non-canonical) string byte-for-byte, this fix changes that string on save. No such caller is
  known; the frontend only ever sends values the weekday-toggle UI produces (already a `1..7`
  comma set), so in practice this only affects historical/malformed inputs or direct API
  callers bypassing the UI.
- **normalizeGiorniSettimana(null) behaviour**: passing `null` returns `null`, so if a future
  caller PUTs `giorniSettimana: null` explicitly (to clear the restriction) it still works;
  verified by existing unit test `assert.equal(normalizeGiorniSettimana(null), null)`.

## QA Surface Chosen

Real UI flow via Playwright against the running local stack (frontend :5173 + backend :3001 +
Postgres) — no synthetic QA-only endpoint needed, since the therapy edit UI already exists and
directly exercises the PUT route under test.

## Gate Status

READY FOR IMPLEMENTATION
