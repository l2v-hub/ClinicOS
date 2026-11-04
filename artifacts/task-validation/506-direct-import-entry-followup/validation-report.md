# #506 direct-import follow-up — pre-release validation

Source: `9b420754687273a95f03bc05f39728a6b9f9186f`, baseline `59f0a9ea60bd56d1823305da9b18fa0bca8db213`.
Independent QA2 report SHA256: `b1f96c243a827d1fac5884b1c9477a2b4d930fdc7c0c36519bca1595b7551f02`.

The actual PatientList import entry now explicitly requests page presentation. AIImportStatus forwards it to both lazy loading and the import/review/draft component; other callers retain dialog by default. A stable trigger restores focus only when connected and focus would otherwise be on the body/trigger. Existing navigation/save guards are unchanged.

| Criterion | Pre-release result | Evidence |
|---|---|---|
| AC1 actual button/loading/import within main; shell/mobile drawer available | PASS at1440/1024/768/390 | [Direct assertions](evidence/independent-qa2/direct/test-results/browser.json) |
| AC2 actual review→draft→close/reload→PatientList resume; same identity/value, no duplicate creation | PASS at all four widths | [QA summary](evidence/independent-qa2/public/qa-summary.json) |
| AC3 pending-save shell navigation, existing failure/notice/navigation paths | PASS, legacy runner unchanged | [Legacy assertions](../bug-batch-506/evidence/independent-followup-qa2/test-results/browser.json) |
| AC4 default genuine modal/Escape/focus; no auth/API/config changes | PASS four widths plus six exact callback probes | [Independent validation](evidence/independent-qa2/public/validation-report.md) |
| AC5 negative baseline, independent gate, CI, real Max5, final Codex, protected release and online acceptance | Baseline/QA PASS; later release gates pending | [Manifest](evidence/independent-qa2/public/evidence-manifest.json), future exact-head PR receipts |

Fresh independent execution: TypeScript app/node, TypeScript project build, production Vite build,1581 frontend tests (0fail/0skip), direct four-width browser run and unchanged legacy four-width browser run, source/dist secret scanner0findings. Forty-five PNGs decoded, nine trace ZIPs fully read and nine videos fully decoded. Existing build warnings were retained. No assertion disabled or force-click introduced.

## Retained failures, not converted into passes

- Original merged PR508 at59 failed actual authenticated online verification. It remains documented in [issue506](https://github.com/l2v-hub/ClinicOS/issues/506#issuecomment-6510526493); its deployment is not relabelled as successful acceptance.
- Independent QA1 at`ddafebc55232098ead4bbcd227ded315af62d729` failed because the fixture tried a covered hamburger to close the settled mobile drawer. Report SHA256`97b4cd8d51fd1f548aeb0125023fb295a6b28824334315e0eebec7947655aa0c` is retained. Revision2 changes only fixture/runner to use the real App-style scrim, with explicit settled geometry/hit assertions; app source remains identical to revision1. [Failure screenshot](evidence/retained-qa1/failure-768.png), [trace](evidence/retained-qa1/direct506-768.zip), [video](evidence/retained-qa1/direct506-768.webm).
- The final regression overlaid byte-for-byte on baseline59 produces two expected unit failures and the first actual lazy-workspace assertion fails, with no browser/HTTP errors or job creation. Afterwards Windows Node26 also aborted in libuv shutdown (`UV_HANDLE_CLOSING`); preserved as an additional runtime failure, not a passing result. [Negative control](evidence/independent-qa2/baseline-red/test-results/failure.json).
- Initial bundled-FFmpeg null-muxer rejection was retained privately; subsequent supported full decoding passed. Development attempts, raw command outputs and both independent private reports remain intact in dedicated local checkouts/receipt storage; only the independently audited publication allowlist is committed.

## Boundaries

Synthetic localhost API fixtures only; no patient confirmation, real patient write, OCR/provider/backend reliability or authenticated-online success claimed by this local gate. No backend/schema/config/dependency/workflow changes, SQL cleanup or user-file edits. Six source blob/hash identities are in the QA summary and unchanged by this evidence-only commit. Original four Claude reviews remain immutable; exactly one additional genuine Max review was explicitly authorized and durably recorded, not yet claimed here.

## Final Decision

IMPLEMENTED — NOT VERIFIED

Local independent verdict: READY FOR CODEX QA. Issue remains open until exact-head CI, actual Claude Max5, final Codex, protected merge/deploy and authenticated online acceptance are demonstrated.
