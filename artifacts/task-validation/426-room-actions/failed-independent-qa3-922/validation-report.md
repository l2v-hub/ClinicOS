# Issue426 independent QA3

Final Decision: FAILED VALIDATION

Application commit: 922a801f5c64cbeff02e2c14298d4dd5a16e622f. Accepted baseline b7ae14d120c1e70ccf72784206a505f8c48f975e. Detached C:/w-426-qa3, application read-only; only assigned independent-qa3 artifact scope written. Original issue and comments read in original-issue.json; no comments. Original photographs/PHI not used.

| Phase / original AC | Result | Evidence relative to this folder |
|---|---|---|
| Contract / scope | PASS | task-contract.md, qa3-assignment-policy.md; full eight-path diff reviewed, presentation/model extraction preserves handlers, routes, auth, bounds, no dependencies/backend/schema/config changes |
| AC1 unique room/bed accessible identity | PASS | browser01/test-results/browser-results.json; 2rooms/4beds exact title/aria names; supplemental01 hostile/separator literals and no HTML execution |
| AC2 same captured resource in tooltip/header/dialog | FAIL for complete visible context | Bed and room/confirmation headings PASS including32W/16L bounds, original identity during rename, keyboard/focus. New destructive button full resource still clips/spills for valid32W at390px; confirm-bounds01 failure, diagnostic geometry |
| AC3 distinct destructive icon/style and existing confirmation | PASS for icon/guard, FAIL usability of full bounded button text | browser01 distinct SVG/danger16px gap and cancel; confirm-bounds01/screenshots/failure-0.png confirms clipped target on destructive control. No confirm/delete click |
| AC4 verify without live elimination | PASS | all API/auth guarded before wire; original five frozen recipes20/20 PASS, new1FAIL; zero DELETE and real mutations, expected controlled mock409 exactly once in each supplemental/long run |
| Build/types/focused | PASS | commands01/command-results.json, seven raw logs: frontend/backend types, tsc-b, actual Vite React compiler,23/23 focused, secret scan |
| Regression | Exact baseline delta PASS, NOT global green |1266 tests,1254pass,12same accepted failures,0new; commands01/full-regression.log and baseline proof057dc6ca6374203d4a1c86d1e5c4b14b73810d48 |
| Security | Scoped PASS | security01/comparison.json zero/zero native findings; no raw SQL/unsafe HTML/secrets/new permissions/dependencies; synthetic supervisor/rooms/empty patients only |

## Blocking finding F1

RoomActions.css lines41–45 attempt wrapping the destructive button but existing inline-flex anonymous text item retains min-content width. The valid32-character room identifier of W letters produces button scrollWidth435 versus clientWidth311 at390×844; glyph rectangle left−58.359/right474.344 extends outside the button37.594..352.391 and viewport0..390. The actual screenshot independently inspected confirms red resource text spilling both sides. Message wraps fully315/315; room/bed/confirmation headings pass their stronger geometry tests. This is real rendered clipping, not a false-positive presence assertion.

Original new recipe confirm-bounds.mjs and failure retained unchanged. Separate confirm-bounds-diagnostic.mjs changes only earlier persistence of the exact same geometry, retains every assertion, and reproduces the same failure; no softened assertions/rerun overwrite. Remediation belongs to root application writer; no release recommendation.

## Artifact map

- browser01:6 PASS; supplemental01:5 PASS; long01:6 PASS; room-headers01:2 PASS; delete-header01:1 PASS.
- confirm-bounds01:1 FAIL; confirm-bounds-diagnostic01: same FAIL, diagnostic only, not a new passing case.
- Each run retains screenshots, trace ZIP, video WEBM, raw test-results and log. Failed contexts closed in finally retain recorded random-name WEBM.
- Strong failing PNG: confirm-bounds01/screenshots/failure-0.png.
- Exact geometry: confirm-bounds-diagnostic01/test-results/confirmation-complete-text-geometry.json.
- Frozen five originals plus new recipe hashes: browser-recipes-frozen.json.
- Library-assertion generated HTML summary: playwright-report/index.html (NOT native Playwright Test HTML runner report).
- Physical source before/after and source-git-binding.json bind all1539 files, raw hashes recorded honestly; strictUTF8 CRLF-only Git normalization distinguished from exact bytes.
- artifact-manifest.json seals every own artifact except itself, including failed/tooling attempts. Nothing outside assigned artifact scope altered.

Own hidden Vite server PID26324 command and listener7521 checked before stop; server-stop-policy.json and server-stop-receipt.json record STOPPED. All browser contexts/processes explicitly closed and lane7521 handed to root.

No deployment/GitHub/commit/push action, real DB persistence, physical hardware or actual assistive-technology certification claimed. Mock reload is stateful synthetic fixture only.

Codex must now re-run the QA Gate.
