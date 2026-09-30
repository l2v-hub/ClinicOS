# Task Contract

## Task

- Title: Diary therapy preview manual fallback
- Slug: diary-therapy-preview-manual-fallback
- Type: bugfix
- Date: 2026-09-30
- Source: user report 2026-09-30 — "Anteprima terapia" shows only "Anteprima non disponibile. Riprova."; expected: open the therapy form anyway and say what failed / what was not understood / what to fill by hand.
- Branch/worktree: `feat/diario-terapia-frontend` @ `C:/w10`

## Impact Classification

| Area                 |                                 Impacted |
| -------------------- | ---------------------------------------: |
| Frontend/UI          | yes (DiaryTherapyPanel, diaryTherapy.ts) |
| Backend/API          |                                       no |
| Database/Persistence |                                       no |
| Agnos AI / Chatbot   |                                       no |
| Voice                |                                       no |
| OCR / Import         |                                       no |
| Auth / Permissions   |                                       no |
| Privacy / Security   |  no (clinical text stays in POST bodies) |
| Config / Env         |                                       no |

## Current Behaviour

Any therapy-preview failure other than 400/401/403 (network, 404, 5xx, malformed body) shows the
generic "Anteprima non disponibile. Riprova." and NO form: the operator cannot proceed. A successful
preview with missing fields does not say which fields the interpreter did not understand.

## Expected Behaviour

- Preview failure (network/404/5xx/400/malformed) → specific reason + the therapy form opens for
  manual compilation (diary text copied into the note, fields empty), "Riprova" still available.
  401/403 keep blocking (confirmation would be refused anyway).
- Successful preview → notices also list every field the interpreter did not read (drug, dose,
  route, times, quantity) as "da compilare a mano".

## Acceptance Criteria

- AC1: On network error / 404 / 5xx / invalid body, the panel shows the reason and the editable therapy form; confirming works through the normal with-therapy flow.
- AC2: On 401/403 no form is shown (explicit message).
- AC3: On a preview missing drug/dose/route/times/quantity, a notice lists each missing field as to be filled manually.
- AC4: Frontend unit tests + build pass; no regressions vs baseline.

## Test Plan

| Test type                 | Required | Reason                                                                        |
| ------------------------- | -------: | ----------------------------------------------------------------------------- |
| Unit                      |      yes | pure helpers (fallback preview, missing-field notices, error reasons)         |
| Integration               |       no |                                                                               |
| API                       |       no | backend unchanged                                                             |
| Playwright                |      yes | panel behaviour with stubbed preview failure and partial preview (page.route) |
| Persistence after refresh |       no |                                                                               |
| Agnos action registry     |       no |                                                                               |
| Voice simulation          |       no |                                                                               |
| OCR/import test           |       no |                                                                               |
| Security/privacy scan     |       no |                                                                               |

## Evidence Plan

Required evidence:

- validation-report.md
- unit test output
- screenshots of fallback and partial preview

## Risks

- Manual fallback must not bypass server validation: confirmation still goes through with-therapy (server validates).

## Gate Status

READY FOR IMPLEMENTATION
