# Task Validation Report

## Task

- Title: Diary therapy preview manual fallback
- Slug: diary-therapy-preview-manual-fallback
- Commit: branch `fix/diario-anteprima-fallback` (from origin/main)
- Date: 2026-09-30

## Implementation Summary

"Anteprima terapia" no longer dead-ends on "Anteprima non disponibile. Riprova.":

- every failure states its cause (server not reachable, interpreter not active on the server (404),
  service unavailable (503 + server reason), interpreter error (5xx), unreadable response,
  unreadable text (400));
- except for 401/403, the therapy form opens anyway for manual compilation: fields empty, diary
  text copied into the notes, notice "Lettura automatica non riuscita: compila la terapia a mano",
  "Riprova" still available; confirmation goes through the normal with-therapy flow (server
  validation unchanged);
- when the preview works but misses data, a "Da compilare a mano" notice lists what the
  interpreter did not understand (farmaco, dosaggio, via di somministrazione, orari, quantità per dose).

Root cause of the reported message in the user's environment: the backend answering the frontend
did not provide the preview (local stub on :3001 → 404; production backend `/auth/status` reports
`mode: disabled` → 503 on every clinical endpoint).

## Files Changed

- `frontend/src/components/operator/cartella/diaryTherapy.ts` — reasoned error messages, `previewFailureAllowsManual`, `manualTherapyPreview`, `unreadFields`, notice text.
- `frontend/src/components/operator/cartella/DiaryTherapyPanel.tsx` — manual fallback, unread-fields notice, retry reset.
- `frontend/src/components/operator/cartella/DiaryTherapyPanel.css` — notice layout.
- `frontend/src/components/operator/cartella/__tests__/diaryTherapy.test.ts` — 3 new tests.
- `qa-evidence/diary-preview/preview-fallback-evidence.mjs` — browser evidence script.

## Acceptance Criteria Result

| AC                                         | Result | Evidence                                                                              |
| ------------------------------------------ | -----: | ------------------------------------------------------------------------------------- |
| AC1 failure → reason + editable form       |   PASS | browser step 1 (real 404), `screenshots/01-preview-404-manual-form.png`; unit tests   |
| AC2 401/403 → no form                      |   PASS | unit test `previewFailureAllowsManual`                                                |
| AC3 partial preview → missing fields named |   PASS | browser step 2, `screenshots/02-partial-preview-unread-fields.png`; unit test         |
| AC4 tests + build, no regressions          |   PASS | 927 tests / 918 pass / 9 fail = same 9 pre-existing as before (924/915/9); build pass |

## Test Results

| Test             | Result | Evidence                                                               |
| ---------------- | -----: | ---------------------------------------------------------------------- |
| Unit             |   PASS | `logs/unit-diaryTherapy.log` 19/19                                     |
| Integration      |     NA | backend unchanged                                                      |
| API              |     NA | backend unchanged                                                      |
| Playwright       |   PASS | `logs/playwright-results.json` 2/2, `trace/diary-preview-fallback.zip` |
| Persistence      |     NA | no data written by the fix                                             |
| Agnos AI         |     NA |                                                                        |
| Voice            |     NA |                                                                        |
| OCR              |     NA |                                                                        |
| Security/privacy |   PASS | clinical text only in POST bodies / local form; no new logging         |

## Runtime Evidence

`screenshots/`, `trace/`, `logs/` (console 404s = endpoints the test stub does not implement, incl. the preview — the reproduced scenario).

## Logs

Only sanitized logs are allowed.

## Residual Risks

Production backend reports `AUTH_MODE` disabled (all clinical endpoints 503): environment issue outside this fix, reported to the user.

## Final Decision

CLOSED — VERIFIED
