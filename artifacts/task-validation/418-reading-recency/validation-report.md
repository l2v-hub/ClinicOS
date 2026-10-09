# Issue 418 — historical reading recency

Application candidate: `d028e1ee4c5c44d96b5005362b28f54e5c05fee1`, based on accepted main `02b4ba89af291186a72e040b868da024bb865164`. Root is the sole application writer and independently authorized release owner. Primary dirty checkout, unrelated launchers, and blocked 405/408/410/416 candidates remain untouched and excluded. No real patient write or original patient audit photograph is used in public evidence.

## Original acceptance criteria

| Original criterion | Source-bound verification |
| --- | --- |
| Valore e data/ora restano visivamente associati e leggibili. | Full Europe/Rome date/year/time beside its historical value, 14px wrapping captions on overview, chart and ward; expanded comparison identifies its own reading source. Root24 browser groups and independently authored21 rerun pass. |
| Nessuna misura precedente viene descritta come attuale. | Explicit measured/previous language; eleven new controls remain blank, invalid/future/unrepresentable dates explicit. Display clock changes text only, without refetch or draft mutation. Historical NEWS2 remains derived from its original complete reading. |
| Eventuali indicatori di recenza usano testo, non solo colore. | Neutral textual minutes/hours/days/weeks. No new clinical recency threshold or age-dependent color; existing NEWS2/scoring/staleness unchanged. |
| Confrontare sul dispositivo misure di minuti, giorni e settimane, senza inventare soglie cliniche. | Genuine normal Windows Chrome desktop2133×1145, scale1, no viewport override: original overview pixels show9minutes/3days/2weeks plus full dates. Source d028, original image SHA256 `71629d0cd4831b209c9783789d113ff58eee683b54dd3e910c49fc9e58cadc68`. Actual ward AX/DOM confirms matching ranges and blank controls; its pixel capture timed out, not substituted. Independent visual/source assessment required for release. No physical ward/tablet, glare, gloves or real AT certification claimed. |

## Implementation and risk boundaries

Twelve frontend paths only: shared strict zoned-date recency presentation, a minute display clock, historical provenance metadata, readable wrapping captions and focused tests. Existing clinical validation, bounded history loading, drafts/session ownership, keypad/keyboard order, API/backend/Prisma, dependencies and tablet-scale policy unchanged. Candidate ae2a failed independent QA because valid ISO years below1000 could throw in the existing facility formatter; d028 adds fail-safe representation validation with direct year-boundary regressions, not a clinical age cutoff. Initial RED, implementation and harness failures remain documented.

## Verification

Root commands: frontend/backend types, emitted type build, Vite build and secret scan PASS. Focused65/65 PASS. Full suite1226/1214PASS/12FAIL, exactly the same identities as pinned417 baseline proof `2e9c3233ac9e897d3fee1061c51c5f6bda8a6799`; zero new failures. Existing three MEDIUM source scan findings are outside the twelve changed paths; no global security-green assertion.

Root ordinary browser24 groups PASS. Root independent-authored final rerun21/21 PASS, zero skipped/flaky/unexpected. Earlier root reruns19PASS2FAIL (incorrect simulator persistence assumption), then21FAIL (local HMR socket allow-list mismatch) are retained locally, never relabeled PASS. Final checks cover three surfaces, historical ages, idle clock/draft isolation, blank values, full keyboard order, expanded NEWS2 provenance, invalid/future/unzoned/year guards, tablet/mobile geometry, DST and reload after normal reauthentication. Synthetic clinical API fixtures intercept before network and deny unexpected writes; no production clinical mutations.

## Independent QA chronology and retention incident

1. Original ae2a independent gate FAILED VALIDATION: representation crash. Sealed original bundle retained without reinterpretation.
2. d028 preliminary gate technically passed65 focused tests, source/types/build/security checks and21 browser cases. Its final21 harness accidentally reused the named standalone screenshot path of preliminary19, overwriting some direct PNGs and one JSON. Their earlier bytes cannot be recovered or declared preserved. Original per-run automatic screenshots, traces, videos, reports, logs and all negative attempts remain. That sealed gate stays BLOCKED for retention; detailed inventory is in `independent-qa418-final/validation-report.md`.
3. A NEW independent full21 cycle uses an isolated output directory, frozen pre-run recipe/config, all distinct screenshots/reporters/traces/videos and fresh source-before/after. Previous types/full-regression/device evidence is referenced by immutable hash on identical d028 inputs, not falsely called newly executed. Its first collection accidentally discovered the archived recipe as another suite (42 cases) and was interrupted before duplicate-group execution; all partial raw outputs remain, incomplete reporters/traces are not claimed complete. The sole recipe repair excludes the archive and saves further snapshots as `.source`. Fresh21b then passes21/21; pre-run snapshot precedes execution, while `--list`21 was captured later and is not falsely dated before it. All2,128 remaining new-gate files, including partial attempt, are sealed under SHA256 `53ba13ed123037041878f9da736765526df2176264466008e6406ee910d0a499`. Root verifies every byte across all3,235 files in the three independent gates and all1,590 immutable QA inputs; root1,464 source inputs have physical SHA `ba09c4cec75640ebad93bbdeeb41f45c687a411be5944424207dd2daee23274e`, canonical SHA `1d889924d2e205fbe568b4914efbd1bfc7088b9b05c38ef1966ce62348dd7195`. Only LF/CRLF normalization differences are accepted. New gate READY, previous gates remain FAILED/BLOCKED.

The retention incident is an evidence-workflow defect, not hidden or rewritten history. Root release authority requires a complete fresh immutable gate, a separate root rerun and exact-source online acceptance; it does not convert the prior BLOCKED gate into READY.

## Publication and deployment

Root independently authorized exact d028 promotion after all original issue criteria and the fresh immutable gate passed. Main remotely verified as d028. Vercel `dpl_27WZBWrSYVVf9rZZMVgok7YkYyxu` READY: both Git SHA fields exact, production alias/static assets HTTP200, entry bundle SHA `7ce28c3ac8795ab8acc8a235354a5d1a6e0403c96d9b1057d951643951301ce5`. After-run inspection retains identical source/entry hash. Backend unchanged at409 `47a4b16c111d9b9bfd0b138991958a8ca8f6c351`, Railway `ed539cb2-224c-4221-8e7a-0f0901039987`, health200.

Compiled production SPA24/24 acceptance groups PASS with original screenshots/traces/video/request guards. Only production root/static GETs reach the network; all clinical APIs are intercepted before network with synthetic fixtures, zero production patient writes. Root visually inspected compiled ward screenshot and fresh independent overview. Initial canonical publication scan3,598 files,153,669 configured-credential checks and47,625 expanded ZIP entries PASS; final staged source-bound manifest must include later final report/CI metadata before proof commit.

Frontend Secret Scan workflow `37960955878` success. AI Import E2E Gate `37960955879` completed with the same single backend failure as baseline417 `37949387210`: `therapy reads and writes apply patient scope before loading clinical data`. Both failure identity sets are equal, zero new; downstream import/browser stages skipped, not claimed passing. Backend and pipeline source unchanged. This is a scoped frontend release with declared pre-existing failures, never global CI green.

All original issue418 criteria, fresh independent QA, root rerun, exact-source deployment, compiled online acceptance and baseline-delta review have passed. Final canonical artifact credential/hash scan gates the proof-only commit. GitHub comment and issue closure are authorized only after that proof branch is remotely verified and all3 pinned raw screenshot URLs return HTTP200 with exact local SHA256; `publish-proof.mjs` enforces these conditions and records actual GitHub state afterward. This report does not falsely assert that the issue was already closed before that operation.

## Final Decision

CLOSED — VERIFIED
