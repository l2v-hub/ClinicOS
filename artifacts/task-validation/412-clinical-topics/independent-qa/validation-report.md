# Issue 412 — independent QA

Final Decision: READY FOR CODEX QA

Application commit: `3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56`.
Accepted baseline: `8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df`.
Dedicated fresh QA reviewer: no application edits, Git writes, release or production requests. Root owns publication and the final gate.

## Original criteria, read directly from GitHub

| Criterion | Result | Evidence relative to this report |
|---|---|---|
| One entry per Allergie, Diagnosi, Anamnesi | PASS | browser/test-results/browser-results.json; adversarial-browser-final/test-results/browser-results.json: both legacy deep-link aliases and allergy anchor |
| Current data distinct from source with access to details | PASS | browser/screenshots/reviewed-original-current-distinct.png; source comparison, provenance, original/reviewed text, simulated failed save/retry/reload assertions |
| Document absence does not become patient absence | PASS | unknown structured allergy state unchanged; meaningful negative remains source; error/loading never become absence; compact group disclaimer and visible unresolved conflict |
| Empty blocks not individual expanded cards | PASS | adversarial-browser-final/screenshots/desktop-compact-seven-absences.png; browser/screenshots/mobile-current-source.png; seven grouped absences initially closed and chart-only empty history collapsed |

## Gate phases

| Phase | Result | Evidence |
|---|---|---|
| Contract | PASS | ../task-contract.md; original issue 412 body and zero comments read directly with authenticated CLI; no real audit imagery copied |
| Diff review | PASS | Ten scoped frontend source/test files relative to accepted baseline. No backend/API/schema/auth/config/dependency changes. Existing editor defaults preserved; no raw clinical adoption. Renderer remains escaped React text. |
| Build/types | PASS | commands/frontend-types.log; backend-types.log; frontend-tsc-build.log; vite-build.log |
| Focused tests | PASS | commands/focused.log: 43/43; adversarial-unit.log: 3/3 independently authored compatibility, future-topic/conflict and absence safety tests |
| Full frontend suite | BASELINE LIMIT | commands/full-regression.log: 1202 tests,1190 pass,12 existing failures; command-results.json exact failure-name comparison to pinned411 evidence, zero new failures. Not all-green certification. |
| Browser original | PASS | browser/test-results/browser-results.json: seven assertion groups; actual SPA with fully intercepted synthetic API; traces, videos, screenshots, HTML result report |
| Browser adversarial | PASS | adversarial-browser-final/test-results/browser-results.json: nine groups, extra unsupported meaningful topic + blank conflict retained, injected markup visible as text/no img/no execution; current unsaved history draft retained through failed-source retry; aliases/anchor and mobile physician keyboard access |
| Security | PASS WITH BASELINE LIMIT | commands/security-scan.log plus security-review.json. Root full scan contains481 pre-existing findings (3 critical177 high301 medium), including exactly one touched-file MEDIUM React XSS heuristic at unchanged comment explicitly saying no dangerouslySetInnerHTML. Independent equality/line comparison and live injection assertion: not suppressed, no new sink. No global clean-security claim. |
| Source integrity | PASS | source-before/source-receipt.json == source-after/source-receipt.json; frozen immutable-manifest.json |

## Independent review details and limits

- Original backend `pickDisplayText` derives displayText exclusively from reviewedText/originalText; an independent displayText-only payload is not a valid current backend DTO. No invented source-data requirement added.
- Native source details are initially closed but provenance and conflicts stay visible. Expanded original shared component status labels remain source-context information beside explicit disclaimers, never structured allergy truth.
- Default editor behavior outside this chart composition remains compatible, verified independently with SSR. Current structured history draft survives source retry without remount or accidental persistence.
- No clinical endpoints, authorization, database or persistence implementation changed. Save/reload tests prove existing frontend handling against simulated in-memory narrative PUT only, NOT backend/database persistence or production clinical writes.
- Desktop and mobile screenshots were visually inspected. The initial desktop conflict screenshot does not include the below-fold absence group; the additional targeted desktop screenshot explicitly captures it. Mobile whole-page screenshot includes all three topic owners and the compact group.
- All API errors are forbidden except deliberate synthetic source/read/save503 failures; console503 messages are scoped to those injected paths. Unexpected requests, other writes, external requests and page errors are zero.
- Deployment, before-state screenshot and GitHub evidence attachment are root release responsibilities and not claimed by this QA session. Root must rerun its gate before deciding release.

Codex must now re-run the QA Gate.
