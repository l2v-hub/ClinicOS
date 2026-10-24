# PR393 follow-up — independent QA

Final Decision: READY FOR CODEX QA

This is a fresh dedicated QA session, independent of implementation. The decision applies to the owner-approved fail-closed correction contract. It does not authorize Azure realtime activation, provider billing, production release, merging, or closure.

## Identity and reviewed inputs

- Worktree: `/workspace/clinicos-voice-393`; stopped base HEAD `d6bb325b1e767c9554e64da433c3f91b0217ee8a`.
- Exact working source digest: `0e239c1633a11c33397d28a1263935e7278f1ec204858246056141acf3cb38af`. SHA256 of compact JSON file entries is independently reproduced; all 17 present/deleted entries match. See `source-manifest.json`.
- Main comparison: `origin/main` = `d1324cb3dd9ac2a9eafdc7eb3d88abc399da7f55`; there is no local `main` ref. Reviewed the full main→working source diff (`full-pr-source.diff`, 22 current source/document/test paths) and base→working follow-up delta (`followup.diff`), plus relocated untracked harnesses. `full-pr-inventory.txt` includes historical artifact changes/additions relative to main.
- Actual Claude review comment **6250811630**, https://github.com/l2v-hub/ClinicOS/pull/393#issuecomment-6250811630; exact comment retained in `review-input.md`. Read all seven findings and test expectations, rather than using only the implementation summary.
- `CLAUDE.md`, `.claude/skills/qa-gate/SKILL.md`, `parallel-evidence-remediation/SKILL.md`, `run-clinicos/SKILL.md` read. Onboarding setup skill applied to reuse retained dependencies and avoid source/config/dependency changes; no reusable environment draft change was needed for this QA task.
- Validated current task contract and explicit scope amendment. Durable root reservation retains round 4, authorization and contract SHA256 `fff355216fae5877f4cfb99a31f433118d84bf91ddcc09305dcb61b77ba8013d`; no counter/state/history reset. The original seven-finding review requested a live-session cap, while the current authorized contract expressly accepts fail-closed activation when that cannot be established. The same contract requires historical proof preservation rather than trimming old duplicates.

## Phase results

| Phase | Result | Independent evidence |
|---|---|---|
| 0 Contract | PASS | `task-contract.md`, `scope-amendment-1.md`, actual review `review-input.md`, `logs/contract-validation.log` |
| 1 Full diff / follow-up review | PASS; no correctness defect or new security finding identified | `full-pr-source.diff`, `followup.diff`, `full-pr-inventory.txt`; source references below |
| 2 Build and relevant tests | PASS | Runtime 242/242; frontend voice 32/32; owned-DB backend 16/16; independent runtime boundary 3/3 and cache-boundary assertions 3/3; compiler/bundle logs below |
| 3 Real browser / persistence | PASS | 51/51 assertions against final unchanged source; `runtime-1/test-results/integrated-result.json`, 21 PNGs, video, reconstructed trace, custom `runtime-1/playwright-report/index.html` |
| 4 Security / evidence integrity | PASS within approved local synthetic scope | `privacy-scan.json`, `media-validation.json`, `author-trace-independent-inspection.json`, `integrity-before.json`, `integrity-after.json`, `cleanup.json` |
| 5 Decision | READY FOR CODEX QA | This report and final manifest/seal; root alone owns next controller/GitHub actions |

## Seven-finding / acceptance map

| Finding / AC | Verified result and source | Fresh evidence |
|---|---|---|
| F1 / AC1 transport pin | PASS. `backend/src/skills/http.ts:393` checks explicit server pin locally despite a warmed enabled runtime cache; incompatible/unavailable real runtime status rejects 409 before negotiation, with `voice:session` audit. The awaited status path checks disconnected request/response at line 397. | `runtime-1/logs/backend-voice.log`: pinned-server test warms enabled status, then expects exact 409 `transport_unsupported`, zero `/v1/voice/realtime-call` requests, and persisted session audit. Deferred-status cancellation proves zero negotiation. |
| F2 / AC2 hard limits / admission | PASS for the approved **fail-closed** alternative. Azure declares `SERVER_SESSION_DURATION_ENFORCED=False` (`azure_realtime.py:22`); actual status is unavailable and real dispatcher refuses before provider HTTP (`realtime.py:31,59`). Existing hard token budget is checked first (`realtime.py:55`). A hypothetical supported test adapter must declare a 1–60-second ceiling before admission accounting (`realtime.py:70`); admitted estimates/calls include uncertain provider failures and unpriced calls remain explicit. 60-second grant expiry is requested (`azure_realtime.py:95`). `http.ts:358,407,462` guards pending same-operator negotiations and releases after completion/failure. | Full runtime242 includes realtime tests, real ASGI auth/body/budget boundaries and supported-fixture accounting/expiry shape. `logs/independent-runtime-probe.log` additionally consumes the actual TokenBudget (no mocked `check`), verifies 503 `budget_exceeded` and zero adapter HTTP, then directly verifies authenticated status + actual route return unavailable/503 on opt-in. Backend16 proves concurrent same operator 409, different operator independent, failure cleanup. **No live-session cap or authoritative Azure termination is claimed.** |
| F3 / AC3 visible mic lifecycle | PASS. Pending granted stream sets active (`useVoiceCapture.ts:136`); release resets indicator even without AudioContext (`:75–80`); visible dot consumes `voice.micActive` (`VoicePanel.tsx:74`). Listening controls remain disabled during negotiation. | Exact-final browser assertions verify live media + visible indicator while REQUESTING_PERMISSION, no Finish/voice-send action; cancel ends every track and clears the indicator. Screenshots `05a-pending-negotiation-microphone-live.png` and `05b-pending-negotiation-cancelled.png`; repeat/hidden/unmount/stale-resume/provider-failure coverage also passed. |
| F4 / AC4 audit action | PASS. Gate factory takes route action (`http.ts:326`); realtime uses `voice:session` (`:362`), upload remains `voice:transcribe` (`:472`). Audit metadata contains code/outcome/ids, no SDP/audio/transcript. | Backend16 independently asserts actual persisted denied-role and disabled realtime audit rows with `voice:session`, plus pin refusal; current file-transcribe audit regression remains passing. |
| F5 / AC5 truthful provider capability | PASS. Registry Azure realtime false (`provider_registry.py:89`), generated JSON semantically matches generator; batch STT stays true. Runbook line137 explicitly blocks activation pending supported authoritative 60-second termination/live ownership and authorized synthetic provider smoke. | Independent generator equality test in `qa-runtime-probe.py`, full runtime registry/provider tests, manual source review. Real Azure compatibility/transcription smoke intentionally UNRUN; no certification from synthetic success. |
| F6 / AC6 bounded partitioned TTL | PASS. 60s TTL and max64 entries (`stt.ts:305–327`), normalized URL + credential SHA256 partition, pending-probe dedupe and cloned cached results. Runtime status cache cannot defeat fresh local server pin. | Existing client suite independently rerun with deterministic hit/expiry/URL/token/malformed tests. New external `qa-cache-probe.mjs`: 65 partitions→oldest eviction; newest hit; deterministic expired refresh (67 loopback requests, 3 assertions). Pinned-server warmed-cache backend regression passed. |
| F7 / AC7 scope / history / fresh proof | PASS under explicit preservation amendment. Current executable harnesses removed from shared `e2e/` and relocated together into follow-up-owned `harness/`. Historical duplicate proofs deliberately retained byte-identical. New QA outputs stay outside source and author packets. | 423 historical proof hashes match before/after; all 13,207 tracked/follow-up snapshot file hashes unchanged and git status byte-identical. Relocated harness syntax checks and exact-final external copy execute successfully. `integrity-after.json`, current trace/media audits and new report. |

## Browser result and owned stack

The final-source run used the real UI, browser fake-device MediaStream and local VAD, authenticated Express app/policy, and owned disposable PostgreSQL16. Only the WebRTC peer/provider transcript and runtime provider transport were synthetic fixtures. No real Azure/provider endpoint was called. Browser result distinguishes that explicitly (`realProviderProof=false`).

Assertions prove partial text has its expected visible value and no submit action; final transcript is exactly `Registra pressione 120 su 80 per questo ospite.`; no assistant request or clinical write occurs before explicit submission; preview retains `Pressione=120/80` and writes zero rows; UI confirmation creates exactly one reading with SQL JSON `pa=120/80`; reload and authorized `vitals.recent` readback display `120/80`, without a second write. Cancel, denial, synthetic provider failure, early empty/buffer errors, retry, disconnect, stale AudioContext, resident change, hidden tab and unmount release media and preserve write/upload invariants.

All 51 browser assertions passed. Unexpected page/console errors: **0**; unexpected HTTP errors: **0**. The deliberate provider503 and its console resource error are separately labelled in `expectedErrors`, not hidden. Negative API tests intentionally exercise 401/403/409/413/429/503.

`flock -n /tmp/clinicos-browser-qa.lock` covered database creation through verified teardown. Docker used `--pull=never` and existing image `sha256:275447c94b11b151decd1f29877965301d5a77032037c46de93d990f739f00a9`. Ownership label/database marker checked before cleanup. Owned container removed, all four ports free, no node servers remained; only immutable baseline `clinicos-postgres postgres:16-alpine` remained. `cleanup.json` records lock release. Root and PR483 author notified before claim and after release. No installs, unknown-image cleanup, shared Prisma regeneration or baseline database access occurred. Disk was observed near90MiB during owned DB lifetime; heavy trace processing waited until cleanup reclaimed ~900MiB.

## Exact commands and logs

All checks ran from the selected stopped worktree with retained dependencies and sanitized child environment. Recorded exit codes are 0. Build macro was expanded to direct compiler/bundler commands so all output stays external and the shared unchanged-schema Prisma client is not regenerated.

- `backend-build`: cwd `/workspace/clinicos-voice-393`; `node node_modules/typescript/bin/tsc -p backend/tsconfig.json --outDir /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/build/backend` — exit 0 (17.71 s). Log: `logs/backend-build.log`.
- `diff-check`: cwd `/workspace/clinicos-voice-393`; `git diff --check` — exit 0 (0.03 s). Log: `logs/diff-check.log`.
- `frontend-app-types`: cwd `/workspace/clinicos-voice-393`; `node node_modules/typescript/bin/tsc -p frontend/tsconfig.app.json --noEmit --tsBuildInfoFile /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/frontend-app.tsbuildinfo` — exit 0 (20.86 s). Log: `logs/frontend-app-types.log`.
- `frontend-build`: cwd `/workspace/clinicos-voice-393/frontend`; `node ../node_modules/vite/bin/vite.js build --outDir /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/build/frontend` — exit 0 (51.66 s). Log: `logs/frontend-build.log`.
- `frontend-focused`: cwd `/workspace/clinicos-voice-393`; `node --import tsx --test frontend/src/components/assistant/voice/__tests__/voice.test.ts frontend/src/components/assistant/voice/__tests__/realtime.test.ts frontend/src/components/assistant/voice/__tests__/readback.test.ts` — exit 0 (0.53 s). Log: `logs/frontend-focused.log`.
- `frontend-node-types`: cwd `/workspace/clinicos-voice-393`; `node node_modules/typescript/bin/tsc -p frontend/tsconfig.node.json --noEmit --tsBuildInfoFile /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/frontend-node.tsbuildinfo` — exit 0 (1.5 s). Log: `logs/frontend-node-types.log`.
- `frontend-security`: cwd `/workspace/clinicos-voice-393`; `node scripts/security/scan-frontend-secrets.mjs frontend/src frontend/index.html` — exit 0 (0.26 s). Log: `logs/frontend-security.log`.
- `runtime-full`: cwd `/workspace/clinicos-voice-393/clinicos-ai-runtime`; `/workspace/.venvs/clinicos-ai/bin/python -m unittest discover -s tests -v` — exit 0 (13.23 s). Log: `logs/runtime-full.log`.
- `node scripts/quality-gate/validate-task-contract.js artifacts/task-validation/standalone-pr-393/codex-followup-1` — exit0, `logs/contract-validation.log`.
- Both external relocated harness files: `node --check <file>` — exit0.
- `flock -n /tmp/clinicos-browser-qa.lock node /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/harness/qa-voice-pr-393.mjs --out /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/runtime-1` — exit0; `logs/integrated-run.log`. Its nested backend command is `node --import tsx --test --test-concurrency=1 backend/src/voice/__tests__/voice-e2e.test.ts backend/src/voice/__tests__/realtime-client.test.ts`; all16 ran, none skipped. Nested migration and seed commands/logs retained in `runtime-1/logs/`.
- `PYTHONDONTWRITEBYTECODE=1 /workspace/.venvs/clinicos-ai/bin/python /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/qa-runtime-probe.py` — exit0, 3 tests, `logs/independent-runtime-probe.log`.
- `node --import tsx /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/qa-cache-probe.mjs` — exit0, 3 boundary assertions, `logs/independent-cache-probe.log`.
- Backend assessment font/license assets copied and SHA256-verified into external compiler output, equivalent to repository asset-copy build step with external destination: `logs/backend-assets.json`. `npm run build:backend` was intentionally expanded to avoid its unconditional shared-client `prisma generate`; backend compilation is fully executed, not inherited.
- `python3 /workspace/.clinicos-cloud/pr393-followup-independent-qa-20261018/validate-evidence.py` — exit0, one-shot postprocessor; `logs/evidence-validation.log`. It scans every decompressed member, verifies original and published ZIP CRC, writes sanitized parts, reconstructs byte equality, and decodes every JPEG member plus all screenshots/videos using `ffmpeg -nostdin -v error -i <file> -f null -` (ZIP JPEG stream uses `-f mjpeg -i pipe:0`).

The external harness copy changes only its output-boundary constant, pg/Playwright dependency resolution and ffmpeg cache path. App/tests/assertions/provider fixture behavior are unchanged. Exact copy is retained in `harness/`; source harness hashes are in the source manifest. No historical packet was rerun or overwritten.

## Evidence inventory and privacy

- `runtime-1/screenshots/`: 21 fresh decoded PNGs. Result screenshot: `12-reload-persisted-readback.png`; pending-live/cancel: `05a-*` / `05b-*`.
- `runtime-1/video/page@4747a33d3f44ed68517c8e6533f0020f.webm`: fully decoded fresh recording.
- `runtime-1/trace/trace.zip.part-01` and `part-02`: lossless <=16MiB parts of sanitized ZIP; SHA256 `781d544110d334aef3abecbe8e7a8fb1f5f6a74c7776fbafe1ea2aa03435a74c`. Concatenate in order per `trace/README.md`. Manifest lists all704 decompressed member hashes, CRC PASS, scan counts and part digests. 637 embedded JPEG frames decoded; 98 synthetic demo-session occurrences redacted from publication bytes. Operational credentials were not used. Original raw ZIP is private-only.
- Author publication parts independently reconstructed from read-only source packet; exact stated SHA256 `2b4be01235d80796ba8d4f1455a44cef2eab7049b790bf5610ed73c4b247f7e7`, all737 member hashes match, CRC PASS, every decompressed member scanned and JPEG frames decoded. These earlier author results are inspected for hygiene only and are not substituted for current-source execution.
- `media-validation.json`: all44 independent+author PNG/WebM files decoded. `privacy-scan.json`: zero private-key, operational API-key-shaped, PostgreSQL DSN, JWT or unredacted synthetic-session findings in sanitized trace/decompressed members and QA logs. Synthetic fixture provenance is the owned seed; visual screenshots contain only that synthetic context. Source/fixture placeholder strings are not operational credentials.
- `runtime-1/playwright-report/index.html`: custom Playwright assertion report generated from the actual raw51 result; this harness uses Playwright APIs directly rather than Playwright Test, so this is not misrepresented as a Playwright Test runner report.
- `evidence-manifest.json` and `final-seal.json`: publication inventory and final integrity seal. Do not publish `private/`, `build/` or compiler cache files. Every listed public artifact is <=25MiB. No archive member or copied publication part was exempted from scanning.

## Security checklist

| Check | Result |
|---|---|
| Secrets | PASS: source/diff inspection and frontend scan0; bounded allowlisted SDP metadata; API key + grant stay runtime-side; sanitized public proof scanned decompressed. |
| PHI | PASS: self-owned disposable synthetic seed only; no production/development DB; synthetic recording/provider transcript; no real PHI source. |
| Logging | PASS: new runtime warnings use fixed outcome kinds; audit fields contain route/action/code/outcome and IDs, no SDP/audio/transcript. |
| Input validation | PASS: authenticated bounded64k SDP and actual ASGI streamed JSON limit; invalid MIME/unicode/size covered; browser event text lengths bounded. |
| AuthZ | PASS: existing identity + voice.plan capability + AI/channel gates; unauthorized/denied/disabled tests and persisted audits passed; demo auth confined to QA child env. |
| Injection/XSS | PASS: clinical persistence uses existing policy/Prisma; no newly interpolated raw application SQL or dangerouslySetInnerHTML. QA SQL uses synthetic IDs/parameter binding. |
| Dependencies | PASS: no changed dependency declarations, lockfile, Prisma schema or migrations. Retained SDK/browser reused. |
| Configuration | PASS: default voice/runtime flags remain off, real Azure unavailable even on opt-in; no VITE_API_URL/CORS/CSP/production or deployment changes. Test-only capability patching never alters source. |

## Limits and next ownership

Real Azure protocol paths/session schema, provider compatibility, actual Italian transcription, provider billing, authoritative termination after browser disconnect, live-session ownership across workers and production activation remain **UNVERIFIED / ACTIVATION BLOCKED**. Grant TTL is not media duration. Admission locks/counters are per process; USD limits remain soft alerts, not hard billing enforcement. Tests that patch supported-adapter capability prove only the synthetic test path. This is the accepted fail-closed resolution of F2; it is not evidence of a functioning live-session cap.

The author's earlier global-Python missing-openai failure remains historical and unchanged. This QA used the retained SDK-equipped interpreter and independently ran the entire242 runtime suite successfully; no earlier counts or browser results were inherited. Existing Pydantic/FastAPI deprecation warnings and Vite plugin timing diagnostics did not fail checks. No unexplained failed current check remains.

Source and historical evidence were read-only throughout. No app/source/test edits, commits, pushes, GitHub/controller mutations, provider calls or deployment actions occurred. No environment draft was changed because no reusable setup change was required. Root owns publication/review/controller progression; this session stops writing after the seal.
