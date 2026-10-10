# Independent QA — issue 432, structured therapy reconciliation

Final Decision: FAILED VALIDATION

Candidate application commit: `89888589ef1fcce8f200899aa07413c8bcb70325`.
Fresh dedicated QA checkout: `C:/w-intake-qa`. Integration/release authority remains with the root agent. No application files, manifests, lockfiles, schema, API routes, configuration, credentials or real records were edited by QA. No commit, push, issue write, merge, release or deployment was performed.

## Gate and acceptance evidence

| Phase | Result | Exact local evidence |
|---|---|---|
| Contract / issue and comments | PASS | `task-contract.md` validated; independently retrieved `issue.json`, issue open with zero comments |
| Diff review | Scoped PASS | Reviewed application diff `30f0b14..89888589`, reconciliation delta `f7052f414..89888589`, and final corrections `0c6a7e9..89888589`; source receipt and manifest bind the final source |
| Backend focused | PASS 67/67 | `scoped-final/backend.log` |
| Frontend focused | PASS 26/26 | `scoped-final/frontend.log` |
| QA-owned adversarial | PASS 10/10 | `adversarial.test.ts`, `logs/adversarial-final.log` |
| Actual patch service, mocked persistence | PASS 1/1 | `service-defense.test.ts`, `logs/service-defense-final-v2.log` |
| Frontend / backend types | PASS | `scoped-final/frontend-types.log`, `scoped-final/backend-types.log`, `scoped-final/receipt.json` |
| Frontend production Vite build | PASS | `scoped-final/frontend-build.log`, `scoped-final/receipt.json` |
| Native Playwright desktop/mobile | PASS 6/6 | `logs/browser-final.log`, `browser-final/playwright-report/index.html`, `browser-final/test-results/` |
| Secret scanner | PASS, 0 findings | `logs/security-final-build.log`: frontend source, final production build, QA build and changed new pure backend helper |
| Mandatory full frontend | FAIL: 1314 total / 1302 pass / 12 fail / 0 skip | `logs/full-final.log`, `regression-comparison.json`; exactly baseline failure names, no new final-source failure, no waiver |
| Production, real API / DB persistence, publication | NOT VERIFIED | Intentionally not exercised; no release or closure claim |

The scoped import reconciliation acceptance checks pass: every meaningful structured occurrence remains accounted for; uncertain extractions remain mandatory-review candidates with blank state, route, dates and schedules; extracted evidence is React-escaped and distinguished from verbatim text. Exact variants and duplicate occurrences retain independent source identity. Group order, same-name variants, conflict selections and refresh do not silently authorize another variant. Operator-reviewed values and exclusions survive source changes. Confirmation rejects omissions, unreviewed, outdated and deferred rows. New legacy seeding is covered, not retroactive rewriting of existing legacy drafts.

AC1/AC5 reconciliation are supported by the focused/adversarial tests and real shared review/proposal/summary components. The broader stored-plan/calendar AC2–AC4 source diff was reviewed but its historical browser evidence was not recertified by this intake-focused QA run. AC6 remains globally unsatisfied: mandatory full frontend is failing and real persisted confirmation/deployment/immutable GitHub publication are not verified. No automated extraction is a certificate that every medicine in an original document was recognized; source comparison remains necessary.

## Browser evidence

All six tests use one native Playwright worker and the QA-only loopback port 7543, with actual application components and all canonical styles. Results and concrete values are asserted, console/page errors and relevant HTTP failures must be empty, and external/clinical mutation traffic is blocked. Fonts are fulfilled locally by the harness. Draft reload proves browser `sessionStorage` retention only, not database persistence.

`browser-final/test-results/` contains 10 PNGs, six native `trace.zip` files and six `.webm` videos. The HTML report embeds its own trace resources. Representative verified result images:

- `browser-final/test-results/reconciliation-mobile-extr-95585-w-after-browser-only-reload/mobile-extracted-source.png`
- `browser-final/test-results/reconciliation-adversarial-628fe-me-name-variant-stays-blank/mobile-partial-review-not-authorized.png`
- `browser-final/test-results/reconciliation-desktop-pro-2277c--not-fabricated-source-text/desktop-proposal-source.png`
- `browser-final/test-results/reconciliation-desktop-pro-2277c--not-fabricated-source-text/desktop-summary-source.png`

The mobile extracted-source and adversarial summary images were visually inspected: escaped evidence is legible and bounded; missing clinical values remain visibly invalid. The generated fixture was independently regenerated through the actual backend helper on the final commit; its generator, input literals and output JSON are hash-bound by the manifest.

## Findings and provenance nuance

- Initial `0c6a7e9` full frontend independently reproduced the new summary diagnostic/source escaping failure plus baseline 12. The final summary correction restores the unchanged existing test; the final full run has only baseline 12.
- QA found that the shared `guardPageRows` accepted forged `originalText` on structured candidates. This was a helper invariance/defense-in-depth gap, **not a demonstrated endpoint exploit**: `patchDraft` already checked original-text equality after this helper and before persistence (`backend/src/intake/draft-service.ts:146`). An independent mocked actual-service test proves rejection before any update on the initial and final commits. The final shared guard also rejects the forgery, preserving legacy appended rows.
- Pending proposal source metadata was refreshed by the implementer before the final candidate. The independent adversarial test additionally proves current `groupId`/`inputHash`/row provenance with a stable id and preserved deferred decision.
- One initial final-source service test failed only because its expected error-message regex did not yet include the new earlier guard message. No application change followed it; the corrected QA expectation and rerun pass. Both logs remain retained.

## Security checklist and limitations

No secrets or real patient information in changed application code or synthetic fixtures/evidence; no clinical payload logging added; no new dependencies, endpoints, auth changes, raw HTML/SQL, provider calls, production flags or environment configuration changes. The source renderer uses ordinary React text. Immutable source metadata, source/outdated conflict gates and confirmation rejection are explicitly tested. The QA entry is not imported by the application and its server requires `QA_SYNTHETIC_ONLY=1`, rejects production mode and binds only to loopback.

`DATABASE_URL` is synthetic loopback port 1 for all backend checks. No broad backend/database suite was started. Mocked service results are not real DB or HTTP endpoint evidence. OCR/model completeness, real letters, existing legacy-draft migration, authenticated production, real provider behavior and release are unverified.

The checkout arrived with modified `run-claude-queue.ps1` and `start-claude-team.ps1`; their baseline hashes are preserved and verified unchanged. The final application diff is empty. This is an exact clean **application** source binding, not a claim that the entire checkout has no preexisting launcher changes or QA artifacts.

Final immutable evidence inventory: `artifact-manifest.json`; source, build, fixture and baseline comparison receipts: `final-source-receipt.json`, `regression-comparison.json`. No waiver is granted for any baseline failure.

Codex must now re-run the QA Gate.
