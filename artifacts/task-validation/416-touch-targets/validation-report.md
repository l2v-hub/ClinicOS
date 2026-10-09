# Validation report — GitHub 416

## Final Decision

BLOCKED

Original AC3 requires touch on the intended physical device with hands in realistic conditions. No such evidence is available. Software touch emulation is not human, glove, device or clinical acceptance. Issue416 must remain OPEN; candidate application source must not be promoted, deployed or included in another release. Publishing sanitized partial evidence is separately authorized by the human's GitHub-evidence request, not by QA or Ruflo.

## Exact inputs and ownership

Root sole application writer: C:/w-416, local candidate `a57cffe6337929f4021913d7b319a85e5feef9f8`, 12 source/test files. Accepted production/main remains415 `0d7adc361b92c8466655d9ed830d2b87bbd0f419`; no416 main/candidate branch push or production deployment. Separate evidence-only checkout C:/w-416-proof is based on accepted415, not the candidate. Primary dirty checkout and pending405/408/410 untouched.

Actual candidate SPA/server and root build/test inputs: SHA256 `c27747cce4221c33a65ba7bd2045772ba7d2c83b189e9b7e171a9e54b603c4a9`, 1455 files, unchanged before/after in `root-final/source-receipt.json`, `root-rerun/source-receipt.json`, `root-rerun/after/source-receipt.json`. Application source matches its frozen commit, no untracked application overrides, no changes to clinical definitions/scores/persistence/API/auth/schema/config/dependencies.

New independent QA: isolated detached C:/w-416-qa, application read-only, exclusive browser lane until its explicit handoff; distinct build/test physical SHA256 `e814a23f6ff352f2359c4fe78f1332b0cf4296228935330a0e64d121a3e0f185`, 1455 inputs. Browser server is root c277 input, not falsely attributed to e814. Independent `source-mapping.json` checks all1455 canonical Git blobs equal; exactly11 files differ only CRLF/LF. Both physical receipts and per-file mapping preserved, not conflated. Root verified all136 immutable QA files; manifest SHA256 `90eea51c5949ef18bd7c3365cf20e61808648d5ce15558ddf13f43593f572949`. Original issue/comments freshly fetched by root and independent QA; no comments at that capture.

## Acceptance criteria

| Original criterion | Result | Evidence and limits |
|---|---|---|
| AC1 identified frequent controls at least44×44 CSSpx or operator-validated equivalent | PASS software finite inventory | Direct actual44 measurements, no invented equivalence: root14 groups, independent24 groups, root rerun of independent24 groups;455 main control instances min44 both dimensions plus22 PAINAD non-choice buttons/fields. Patient roster/header/chart/inline actions/module catalog/workspace and supervisor rooms/bed fields. Native paper radios26px are unchanged whole-cell choices and explicitly outside this44 claim; no operator certification invented. |
| AC2 adjacent hitboxes non-overlapping and visible focus | PASS software inventory | Both independent and root rerun38 pair groups/476 native focus records; edge-midpoint and center hit tests, native Tab/Shift+Tab/Enter/Space/Escape and roving-tab semantics. Dynamic mobile header145↔64 metric, unobscured focus, emulated edge tap activates intended print/clear, unrelated-route cleanup returns coarse40 token. |
| AC3 touch on intended device, realistic hands | EXTERNALLY UNVERIFIED | No physical device/operator/hands/gloves evidence; emulation cannot waive or satisfy this criterion. Overall BLOCKED, no source release or issue closure. |
| AC4 not automatically classify every36px control as WCAG-AA failure | PASS interpretation |44 is contextual bedside design goal. No blanket WCAG-AA, whole-app accessibility, physical or clinical certification. |

## Gate phases and regression checks

| Phase | Result |
|---|---|
| Contract before implementation | Validated; original criteria, scope, finite inventory and external gate explicit in `task-contract.md` |
| Scoped implementation/diff/security review | All12 files reviewed by independent QA and root; shared screen-only token/real search separation/action gaps/visible action text/bounded layout observer only; original handlers retained |
| Frontend/backend types, production frontend build | PASS independently and root rerun |
| Focused tests |66/66 PASS each; existing print test now checks the visible-text class with the same selective-dialog handler |
| Supplemental SSR |4/4 PASS each with QA-only Vite URL loader; normal full-suite invocation is not altered |
| Normal full regression |1219 tests/1207 PASS/12 FAIL, all12 identical to pinned415 proof82920e256904b8a967ecb343cc19add281f58ed0; zero new failures. Not globally green. |
| Root ordinary browser |14/14 PASS, final `root-rerun/browser/test-results/results.json` |
| Independent browser and root reexecution |24/24 PASS each,7 nurse/supervisor contexts, plus adversarial resize/focus/edge-tap/cleanup and22 active PAINAD non-choice controls each |
| Draft persistence after reload | Existing local PAINAD draft survives catalog/history/reload/relogin/resume; first question retains native keyboard focus. No claim of backend save/finalization testing |
| Security source/dist | Zero findings in independent/root source/newdist secret scans |
| Broad security | Root scan481 pre-existing findings,7 dependency findings,0 touched; independent compared all481 findings with accepted415, not broad rerun and not blanket green certification |
| Publication | Requires canonical staged-blob hash checks, every immutable QA file including preliminary failures, configured-credential comparisons and decompressed ZIP member scans before proof-only commit/push |
| Completion/promotion gate | BLOCKED; repository check-closure must reject completion with exit2 |

## Evidence and reproducibility

All paths below are relative to this task directory. Actual SPA screenshots, context traces/videos and assertion-generated static HTML reports use only synthetic nurse/supervisor/patient/room fixtures. APIs are intercepted before navigation; simulator login and POST patient search are synthetic/read-only. No external/domain/production patient test writes or unexpected routes. No real attached patient photos/medical letter in public proof.

- `root-rerun/commands/`: actual commands/logs/full-suite baseline comparison.
- `root-rerun/browser/`: ordinary14 results/geometries, final screenshots,6 traces/videos and HTML; representative desktop-roster/modules and supervisor-desktop-rooms screenshots are embedded on GitHub.
- `root-rerun/independent-browser/`: root rerun of QA24 groups, raw geometries/focus/state,7 traces/videos and final screenshots.
- `root-rerun/adversarial/`, `root-rerun/form-inventory/`: separately rerun adversarial/mobile sticky-header cleanup and active PAINAD non-choice inventory.
- `baseline-verified/`: actual accepted415 SPA measurement/screenshot/trace/video;36px roster/header/workspace and26px clear vs candidate44. Baseline is today's source-bound accepted415, not a falsely pinned historical audit photo. Screenshot capture awaits transitions; the earlier unsettled root attempt is preserved locally as `baseline-preliminary-unsettled/`, not published as final proof.
- `independent/`: complete immutable QA bundle, all136 files including disclosed preliminary failures, original contract/source receipts/mapping, scripts/logs/evidence/report/manifest. Root reread full QA report and browser scripts and reran them separately; originals never rewritten.
- `rerun-browser-bundle.mjs`: serial root commands/input recordings. QA helpers remain in their immutable independent directory; own reruns have separate outputs.
- `candidate.patch`: immutable source diff from accepted415, preserves unpublished candidate for actual hardware acceptance.

Root visually inspected final mobile chart focus and supervisor room screenshots. Independent inspected final mobile chart/room screenshots. Raw bounds/hit tests accompany visuals; no pixel-only acceptance claim. Development harness corrections and genuine early search/hamburger/mobile focus fixes are disclosed in `implementation-receipt.md`; early root attempts retained locally. Independent preliminary failures are all included unchanged: simulator reload required explicit login, wrong PAINAD accessible-name selector, and an initial validator path argument. These are harness errors, not discarded contrary evidence or app repairs by QA.

## Release boundary and next action

Publish only artifact paths on `codex/416-qa-evidence`, pin screenshot/trace/video/HTML/hash links to its exact proof commit, comment original AC3 unverified, apply status-blocked and confirm issue OPEN. Accepted app remains415. Do not close416 or claim all issues finished. Sequential work may proceed to417 from accepted415 after this blocked evidence handoff; no repeated416 QA while external evidence is unchanged.
