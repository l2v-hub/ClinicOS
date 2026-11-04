# Independent QA2 — #506 follow-up

Verdict: **READY FOR CODEX QA** (local source gate only).

Source `9b420754687273a95f03bc05f39728a6b9f9186f`; baseline `59f0a9ea60bd56d1823305da9b18fa0bca8db213`; reservation `2dcf76fc-dd94-429c-93fd-f9c62fc26498`.

| Phase | Result | Evidence |
|---|---|---|
| Contract / issue and comments | PASS | Frozen task-contract and manifest |
| Full diff / previous failure | PASS | Two production components + four regression files; only fixture correction since QA1 |
| TypeScript app/node, production build | PASS | Fresh commands; existing warnings retained |
| Frontend unit | PASS | 1581/1581; 0 fail, 0 skipped |
| Actual PatientList import / handoff / resume | PASS | 1440,1024,768,390; same saved draft and one job/one draft |
| Unchanged legacy navigation/failure regressions | PASS | Four widths; pending/failure paths retained |
| Default modal + stable focus | PASS | Four browser widths plus six exact callback probes |
| Baseline red | PASS as negative control | Both unit tests fail; browser detects missing page workspace during actual lazy loading |
| Security / privacy / evidence | PASS within stated scope | Source/dist scanner 0 findings;45PNG decoded,9traces fully read,9videos fully decoded |

[Desktop resumed result](../direct/screenshots/actual-resume-1440.png) · [Mobile direct import](../direct/screenshots/direct-import-390.png) · [Direct browser JSON](../direct/test-results/browser.json) · [Direct HTML companion](../direct/playwright-report/index.html) · [Mobile trace](../direct/trace/direct506-390.zip) · [Mobile video](../direct/video/direct506-390.webm).

Legacy artifacts: [browser JSON](../../../../bug-batch-506/evidence/independent-followup-qa2/test-results/browser.json) · [mobile trace](../../../../bug-batch-506/evidence/independent-followup-qa2/trace/issue506-390.zip).

[Baseline failure](../baseline-red/test-results/failure.json) · [baseline screenshot](../baseline-red/screenshots/failure-1440.png) · [summary and caveats](qa-summary.json) · [exact media hashes / public paths](evidence-manifest.json).

The baseline produced the expected missing-workspace assertion before an additional Windows Node26 UV_HANDLE_CLOSING shutdown abort; both are retained. Initial bundled-FFmpeg null-muxer rejection is retained separately; subsequent supported full video decode passed. No assertion was removed or disabled. Prior QA1 failure and its report hash are unchanged.

All tests use synthetic local fixtures. No backend/OCR/provider reliability or authenticated-online success is claimed. The current source still needs the authorized genuine Claude Max round5, exact-head CI, final Codex, protected merge/deploy and authenticated online acceptance before issue closure. No such action was performed by this QA session. Owned ports5297/5298 are released.

Codex must now re-run the QA Gate.
