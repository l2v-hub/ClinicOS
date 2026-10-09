# Independent QA — issue 407

Verdict: **BLOCKED** at this handoff solely because AC2's device visual check has not yet been performed. All scoped automated checks pass. This independent run used headless Chromium and viewport emulation; it must not be described as an actual-device visual inspection. Root can supply a separate actual visible Windows desktop browser check against the hermetic source below under the reconciled literal issue wording. No human panel/glare or physical-mobile-device certification is implied.

Application commit: `973d78e5e109032a36cf89cf80fd8eb2a848a649`.
Baseline application: `c11c0990f6313a53a8bcde467046eecef69e012a`.
Application source SHA256: `469fa3754fd8e9dee7166f53282edb1ea0e8688d20ad3112031c66ac4607be1f` (1427 source/build-input files).

## Contract and diff

Read original GitHub issue 407 and all comments (none), not merely the implementer summary. Original AC2 requires automatic checks on real tokens and visual completion "su dispositivo"; it does not specify human inspection, a physical mobile device or sunlight certification. Initial root wording imposed a stricter physical-panel limitation; root explicitly reconciled its task contract to a genuine visible Chrome desktop-browser visual check on the Windows host, without emulation. That check remains outstanding at this independent headless handoff. This does not satisfy or narrow other issues' human AT or ward-hardware requirements.

Reviewed the complete baseline-to-candidate diff: exactly three application paths. `frontend/src/App.css:66` adds a badge-text-only token, while lines 3572, 3591, 3597 and 5912 use it for four success status consumers. `frontend/src/design-system.css:622` applies the same token to the canonical success badge. `frontend/src/lib/__tests__/successBadgeContrast.test.ts` adds four source-bound tests. No unrelated application changes, altered status labels, accent/background changes, layout/control changes, backend/schema/API/auth/config/dependency edits or debug code. The known unrelated launcher modifications and generated coordination metadata remain excluded.

## Phases and acceptance

| Phase | Result | Evidence relative to this folder |
|---|---|---|
| 0 Contract | PASS; AC2 device portion outstanding | `../task-contract.md`; original issue 407 read directly |
| 1 Diff review | PASS | Source receipt; scoped three-file diff reviewed |
| 2 Types/build/tests | PASS with explicit baseline waiver, not all-green full suite | `command-results.json`, seven corresponding command logs |
| 3 Browser | PASS automated; device visual portion unverified | `test-results/browser-results.json`, screenshots, traces, videos, HTML report |
| 4 Security | PASS scoped checks | `security-scan.log`; checklist below |

| AC | Result | Objective result |
|---|---|---|
| AC1 | PASS automated | Actual roster badge and five shared loaded-CSS consumers reach 5.76966371490132:1 in normal/hover/keyboard-focused-parent states, both viewports. |
| AC2 | PARTIAL / device visual outstanding | Actual source-token four-test suite and 36 computed browser text samples pass; this run is not an actual-device visual check. |
| AC3 | PASS | Literal `Ricoverato` visible, not hidden from accessibility tree, no color-only status. Shared probe retains explicit text for all five variants. |
| AC4 | PASS measurements, no broad compliance claim | Actual row/open-control/icon/border/outline geometry and contrast recorded separately against element and parent surfaces; diagnostic limits below. |

## Independently executed commands

`QA407_OUTPUT=artifacts/task-validation/407-badge-contrast/independent node artifacts/task-validation/407-badge-contrast/qa-commands.mjs` exited 0 under its explicit gate rules:

- Frontend `tsc --noEmit`, `tsc -b`, Vite production build and frontend source/bundle secret scan: exit 0.
- Issue-specific contrast tests: **4 / 4 pass**, zero failures.
- Broader focused roster regressions: **30 total / 23 pass / 7 fail**, all seven named failures already present in pinned baseline full-suite output.
- Full frontend regressions: **1183 total / 1171 pass / 12 fail**, precisely the existing 12 names, zero new failures. Baseline proof commit `6c83db4bb3fb98acd34c7b4245cdd86b04c53565` is immutable; `command-results.json` records each failure and comparison. This is a scope waiver, not a claim that the full suite passes.
- Actual SPA browser runner: **6 / 6 groups pass**, separate desktop 1150×1004 and mobile 390×844 contexts. API interception allows only synthetic read fixtures plus synthetic simulator session creation; unexpected API, clinical writes, external requests, console errors, runtime errors and HTTP errors are all zero.
- Source receipt verifies exact candidate HEAD, clean tracked source and absence of untracked application overrides. Whole checkout is not asserted clean.

## Browser measurements and limits

The real application's index/main/App entry renders `PatientRoster`, not a toy-only substitute. Its literal `Ricoverato` badge is 14px normal text, computed foreground `rgb(11,107,96)` and background `rgb(231,247,240)`, with element/ancestor opacity 1. Three states on each viewport yield exactly 5.76966371490132:1. Mobile focus is explicitly the card's open button, not a fictitious focusable card. Desktop focus is reached through real keyboard Tab navigation on the actual row.

An additional **QA-only DOM probe** runs beneath the real application using its already loaded CSS, without token/color overrides. It measures `.stato-pill--ricovero-ricoverato`, `.stato-pill--attivo`, `.stato-pill--consegna-completata`, `.status-badge--success`, and a clickable `.ds-badge--ok`. This proves shared CSS consumers in three states per viewport; it does not claim full production-screen coverage of all consumers. Probe text sizes are 10.5/12px and remain normal-text threshold tests.

Computed color conversion uses a browser canvas sRGB pixel for rgb/rgba/oklab/color-mix; alpha is composited across ancestor backgrounds. Every measured text surface is opaque, eliminating quantization/alpha effects on its exact badge ratio. Actual control backgrounds and colors are recorded independently. No screenshot is represented as a measured physical display-luminance result.

AC4 diagnostics do **not** promote the text result to a control-compliance assertion. The actual desktop row focus outline is #2f6bed (2px, -2px offset), about 4.247:1 against its focused-row inside surface and 4.722:1 against white outside. The actual desktop chevron #16202e on white is about 16.404:1. Its #e1e7f0 border measures about 1.243:1 against white inside (outside varies by row state and is recorded). The mobile open-button chevron/text #1d4fc4 on white is about 7.076:1; its #c9d3e1 border about 1.512:1 on white. Shared #245bb5 focus outline is about 6.484:1 against white. Borders below 3:1 are disclosed, not fixed or claimed passing by this badge-only scope. Visibility, geometry, identifying glyphs and whether each border is essential remain separate considerations; untested controls receive no claim.

## Real artifacts

- `screenshots/desktop-roster-default.png`, `desktop-roster-hover.png`, `desktop-roster-focused-parent.png`: actual roster result.
- `screenshots/desktop-actual-control-focus.png`: actual nearby control focus diagnostic.
- `screenshots/desktop-shared-css-probe.png`: clearly labeled QA-only shared CSS probe.
- `screenshots/mobile-roster-default.png`, `mobile-roster-hover.png`, `mobile-roster-focused-parent.png`: emulated mobile actual roster result.
- `screenshots/mobile-actual-control-focus.png`, `mobile-shared-css-probe.png`.
- `trace.zip`, `mobile-trace.zip`.
- `video/desktop.webm`, `video/mobile.webm`.
- `playwright-report/index.html`, `test-results/browser-results.json`.
- `command-results.json`, command logs, `source-receipt.json`, `publication-manifest.json`.

First browser attempt had a fixture route mismatch (`parameters/readings` versus actual `parameter-readings`), producing one intentionally guarded 500; corrected only the harness. The next successful attempt revealed that a regex color parser was insufficient for Chrome's computed oklab row surface; corrected only the measurement harness, added settled-transition waits and reran all six groups. Prior attempts are preserved under `debug-attempts/` and excluded from successful publication evidence. No application repair was made by QA.

## Security checklist and handoff

No plaintext credentials, genuine connection strings, real-patient information or secrets in changes/artifacts. All patient/operator data are explicitly synthetic. Dummy simulator token is not an authentic credential. No new application logging, endpoint, authorization behavior, dependency, production configuration or injection surface. Source/bundle secret scanner passed. No production page or API used by browser tests; all clinical mutations blocked. No database is needed for this CSS-only issue, and simulated read transport is disclosed.

The QA-only server's `--device` mode defines the frontend API on the same loopback 7471 `/api` origin and supplies the same synthetic roster, identities and read endpoints; all clinical mutations/unknown API requests are denied. `GET /api/__qa407/receipt` supplies sanitized guard counts for root's separate device check. This mode is not a production config/app mutation; syntax checked here, actual visible-device execution belongs to root. Default server mode still supports the independent Playwright interception rerun. Port 7471 server and browsers owned by QA are stopped, and no listener remained at handoff. Root owns the next browser lane.

**Codex must now re-run the QA Gate.**
