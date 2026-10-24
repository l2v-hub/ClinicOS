# Author cycle2/4 — early realtime empty-buffer recovery

Final Decision: IMPLEMENTED — NOT VERIFIED

Root reserved cycle2 after independent QA1's actual P2 failure. This report supersedes the
cycle1 author's feature-level outcome; it does not rewrite the preserved FAILED QA1 report.
Fresh independent QA and current-SHA Claude review remain required before publication.

## Bounded change

Exactly two of the frozen25 source paths changed:

- `frontend/src/components/assistant/voice/useVoiceChannel.ts`: snapshot actual audio state,
  capture identity and nonzero real commit marker **before** stopAll invalidates transport.
  Only matching committed TRANSCRIBING may produce benign empty-transcript recovery.
  LISTENING/PARTIAL empty-buffer errors dispatch the existing recoverable error after media
  shutdown, exposing retry/text fallback. Reducer restrictions and stale/session fences remain.
- `e2e/qa-voice-pr-393-browser.mjs`: actual production component/hook regression for both
  empty-buffer codes in both LISTENING and PARTIAL; committed-empty recovery and successful
  next capture; preserve all original33 checks. Result screenshots07/12 scroll the actual
  asserted values into view as identified during independent QA1.

All other23 source hashes and all3 original contracts are unchanged; original source manifest
and independent-qa evidence remain preserved. No backend/Python/provider/default/env/schema
or clinical policy change. No remote mutation, commit/push, paid inference or activation.

## Executed validation

| Check | Result | Proof |
|---|---|---|
| Focused frontend voice regressions |29/29 PASS,0FAIL/skip | `frontend-voice.log` |
| Frontend typecheck + production build |PASS,741 modules | `frontend-build.log` |
| Existing focused actual backend/PG cases |12/12 PASS,0FAIL/skip | `runtime-1/logs/backend-voice.log` |
| Existing33 + new15 actual browser assertions |48/48 PASS | `runtime-1/test-results/integrated-result.json` |
| Four early-code/state combinations |PASS: ERROR, peerclosed, alltracksended, retry/textfallback, no submission/upload/write | four screenshots13 and machine checks |
| Actual postcommit-empty and successful next capture |PASS: IDLE/no invented final then exact new transcript | screenshots14/15 and machine checks |
| Exact clinical confirmation/persistence/reload readback |PASS: only explicit confirmation writes one `pa=120/80`; after reload/re-auth visible120/80 | screenshots03/04/12 and actualSQL assertions |
| Owned stack/database cleanup |PASS | integrated result `databaseOwnershipVerified` and `ownedContainerRemoved` |
| Unexpected console/page/HTTP errors |0 | integrated result; controlled provider503 recorded separately |
| PNG/video/trace integrity |19 PNG fully decoded;1 completevideo decoded;ZIP CRC valid | direct Pillow/ffmpeg checks and `privacy-scan.json` transformation receipt |
| Contract validation + whitespace/syntax |PASS | original valid contract, Node syntax checks, `git diff --check` |

Actual commands:

```bash
node --import tsx --test frontend/src/components/assistant/voice/__tests__/realtime.test.ts frontend/src/components/assistant/voice/__tests__/voice.test.ts
npm --prefix frontend run build
flock /tmp/clinicos-browser-qa.lock node e2e/qa-voice-pr-393.mjs --out artifacts/task-validation/voice-pr-393/cycle2/runtime-1
```

The wrapper again uses real UI/mic/VAD/backend/auth/policy and uniquely owned isolated
PostgreSQL16. WebRTC/provider transcript remains explicitly synthetic. Local development5432,
Railway, real provider resources and environment activation remain untouched.

## Inherited evidence and limits

`inherited-proof-identity.json` records exact unchanged runtime/backend source identity.
Python240PASS and backend typecheckPASS are inherited from the sealed QA1 candidate because
those domains/config/tests are byte-identical; they are not claimed rerun here. The wrapper
nevertheless reruns all12 focused backend cases against a new owned container. Earlier broad
frontend1386PASS remains predecessor evidence; changed hook is validated by focused tests,
actual48-case browser run and build, with fresh independent gate to assess the final candidate.
Positive Azure transcription and real peer/provider compatibility remain NOT RUN; no successful
provider/deploy/release claim follows from these fixtures or labels.

Transient synthetic bearer strings/QA DSNs are sanitized only inside new cycle2 evidence;
old independent-qa files are not transformed. Trace event identities retained, ZIP CRC verified;
resource filenames remain identifiers, not unchanged payload-hash assertions. Manual image
inspection confirms the recoverable error with text fallback and actual visible reload120/80.

## Fresh QA handoff

Source STOP after candidate2 manifest creation. Run the finalized wrapper with another fresh
`--out` beneath this packet, e.g. `independent-qa2/runtime-1`, under the same lifecycle flock.
Fresh QA should repeat the formerly failing early-buffer probe and both valid committed and
precommit-final invariants. No mutable old ledger or fifth cycle is introduced; current source
budget2/4 and Claude review0/4 remain recorded.
