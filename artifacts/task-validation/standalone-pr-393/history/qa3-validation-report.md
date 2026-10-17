# Fresh independent QA3 — PR #393

**Final Decision: READY FOR CODEX QA**

17 October2026. Dedicated independent QA, cycle3/4 frozen candidate based on publishedHEAD `49e65822c168682f2f262d186357ce3c7f94ec9c`. This report binds the uncommitted cycle3 test correction by source-manifestSHA256 `313aa08cc7e327e706d2e36344f20f2738496e9f83824f59b3bf14b1574c32d5`; it does not claim the old49e test passed. No source, contract, prior evidence, git history, GitHub/controller/provider/model or environment-activation mutation by QA. Root remains sole publisher.

| Mandatory phase | Result | Evidence |
| --- | --- | --- |
|0 Contract | PASS | Own task-contract.md established before execution; originalAC1–AC7 and cycle3 plan read,25source/3contracts/4supplements checked. CurrentPR body/comments/reviews read through read-onlyGitHub; metadata receipt test-results/live-pr393-contract-reference.json. |
|1 Diff review | PASS, zero findings | diff-security-review.md and exact test-only/full-source patch snapshots. New stdlib driver calls actual FastAPI ASGI app, preserves authorization/validation/stream-limit/safe-answer/awaited-provider assertions.24other frozen source paths unchanged. |
|2 Build/tests | PASS | Fresh240/240 Python tests,0FAIL/skip with httpx import explicitly unavailable; compile55 modules PASS;12/12 real backend cases on ownedPG PASS. Frontend1386/build/backendtypes inherited from sealedQA2 only after exact input identity, not rerun. |
|3 Playwright | PASS | Fresh original failing probe4/4PASS on owned realapp/backend/PG under full-lifecycle globalflock; screenshot/video/trace. ActualERROR, peerclosed/alltracksended,0commits/sendcontrols/assistantrequests,partialnull;0console/HTTPerrors. QA2 full52case browser is separately inherited, not claimed rerun or added to4 as56 new cases. |
|4 Security/privacy | PASS | Explicit diff-security checklist; synthetic-only fixtures.2standalonePNG +149embeddedimages decoded;1fullvideo decoded; traceCRC PASS with151frame references resolved,728events.0credential-pattern findings. True pristine digest receipt agrees with trace redaction beforehash; final trace3,937,515bytes <25MiB. |

## Acceptance criteria

- AC1/AC2 PASS locally: provider/model/defaultOFF contracts retained; actual240suite includes defaultOFF/unsupported/no-network and separate explicit realtime model dispatch. Existing fileSTT behavior unchanged. No feature flags enabled.
- AC3 PASS locally: real ASGI401/400/413/200 and exactSDP/exactly-one awaited offer preserved and freshly executed without httpx. Oversize is actual40001+40000 streamedbytes without Content-Length, exceeding the bounded body before JSON/provider access.12owned-PG backend regressions rerun authorization, capability, rate, byte limits and safe response. Broader unchanged runtime6adversarial probes are inherited, not rerun.
- AC4 PASS locally: fresh oldfailure probe reachesERROR after early emptybuffer event, releases peer/tracks and removes partial/send controls. Screenshot manually confirms failure notice, textfallback and availableParla retry gesture. Actual retry-click, permission/cancel/resident/hidden/unmount/stale-event scenarios remain verified by the inherited52case QA2 flow; this4case probe does not claim a new retry-click assertion.
- AC5 PASS locally: exact partial display-only and0assistantrequests freshly asserted; terminal observation0commits/voiceSendControls. Committed-final/operator submit, separate clinical confirmation, exactly-one120/80write and visible persistedreadback after reload are inherited only from byte-verified52case proof.
- AC6 PASS: fresh Python/compile/backend/probe with independent media audit plus exact inheritance of unchanged frontend/build/fullbrowser proof. Generated playwright-report/index.html is labelled as an index of actual Playwright API artifacts, not a native Test-runner report.
- AC7 boundary PASS: actual authorized Azure positive transcription and real provider/RTCPeerConnection compatibility **NOT RUN**, never PASS. Feature remains defaultOFF; no paid resources/provisioning/deploy/providercalls. Optional local implementation validation does not establish provider availability or release readiness.

## Provenance and inheritance

source-identity-before.json verifies manifest and all32bound inputs before execution, QA2seal `e49b3bc94be6fa208ce72cb9b7ccc69939b7adb8722628acb5a6b18fbc4dc8b8`, all78QA2proofs and all107QA1immutablefiles. In total367prior author/QA artifacts remain byte-identical before/after. Original QA1 FAILED VALIDATION history remains intact.

Only tests/test_voice_realtime.py differs sinceQA2. All106QA2 inherited trackedinputs match. test-results/full-inherited-input-identity.json additionally verifies every one of1674tracked frontend/backend/schema/e2e/workflow/package/lock inputs against either the sealedQA2 source hash or original baseline299ba8 unchanged blob, and the current published candidate. This is why unchanged1386frontend/build/backendtypes/full52browser proof can be inherited under the authorized bounded QA3 scope. Counts are not represented as fresh execution.

Own copied original-probe runner/browser assertions are unchanged fromQA2. Actual full-lifecycleflock covers unique labelledPG16containercreation, migrations,12backendtests, synthetic seed, app/browser and owner-verified teardown. Development5432, callerDATABASE_URL, Railway and production were not used. No actual clinical write is attempted by the4case probe; the synthetic seed/backendtests deliberately precede its baseline.

Own pre-sanitize-manifest.json was captured before first sanitizer execution. privacy-media-validation.json records the one actual transformation, synthetic-session/QA-DSN sanitation of the trace, including archive/member before/afterSHA256; every beforehash matches the pristine receipt. All modifiedZIPmembers retain existing resource identifiers, without claiming payloadhashes unchanged. No provenance reconstruction, failed sanitizer attempt or trace size normalization was needed. test-results/privacy-provenance-verification.json resolves all151finalframe references and verifies receipt/CRC/size.

## Commands and actual outcomes

```bash
/workspace/.venvs/clinicos-ai/bin/python artifacts/task-validation/voice-pr-393/independent-qa3/verify_without_httpx.py
# 240tests,0failures,0skips; explicit builtin import denial of httpx
# py_compile.compile of all54 clinicos_ai modules plus changed test, output outside source:55PASS
flock /tmp/clinicos-browser-qa.lock node artifacts/task-validation/voice-pr-393/independent-qa3/early-buffer-runner.mjs --out artifacts/task-validation/voice-pr-393/independent-qa3/early-buffer-probe
# 4browser assertions +12backend cases PASS, owned container removed
node scripts/quality-gate/validate-task-contract.js voice-pr-393
git diff --check
/opt/codex/runtimes/codex-primary-runtime/dependencies/python/bin/python artifacts/task-validation/voice-pr-393/independent-qa3/verify_artifacts.py
```

Logs and machine results are under logs/,test-results/,early-buffer-probe/. Own screenshots are early-buffer-probe/screenshots/01-partial-display-only.png and independent-early-empty-buffer-error.png; fullvideo under early-buffer-probe/video/, trace under early-buffer-probe/trace/trace.zip. Both screenshots manually inspected. No selected tests skipped or assertions weakened.

Root must bind the eventual publishedSHA to these frozen source hashes and complete required nativeCI/currentSHA review before any release decision. Historical49e nativefailure is preserved; passing local cycle3 checks do not retroactively change it.

**Codex must now re-run the QA Gate.**
