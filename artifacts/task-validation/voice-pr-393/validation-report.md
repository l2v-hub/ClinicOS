# Author validation report — PR #393 reconciliation

Final Decision: IMPLEMENTED — NOT VERIFIED

Author implementation cycle 1/4. Independent QA and current-SHA Claude review have not yet
concluded; this author does not certify or close the task. Baseline main:
`299ba8ff8d048631cdb969f26656d02de981da83`. No commit/push/PR/label/remote-ledger mutation performed.

## Acceptance and actual evidence

| AC | Author result | Evidence / limitation |
|---|---|---|
| AC1 provider-neutral file STT, explicit opt-in, default OFF | PASS locally | `logs/python-full-final.log` 240/240; current `voice/stt.py` byte-identical to baseline; no environment/config activation. |
| AC2 explicit registry realtime and model, no silent fallback | PASS locally | Python config/dispatch/validator cases plus `logs/backend-client.log`; optional Azure adapter only, unsupported provider remains unavailable. Status is configuration, not remote readiness. |
| AC3 auth/ACL/rate/size/secret boundary | PASS locally | `logs/backend-voice.log` 12/12 actual owned-PG app tests; `logs/python-voice-final.log` actual ASGI auth/stream limits and adapter boundary; no live provider. |
| AC4 mic ownership and async lifecycle | PASS locally | Canonical integrated browser 33 checks, including partial cancel, late permission, permission denial, disconnect, resident change, hidden tab, unmount and old AudioContext rejection while a newer capture is pending. |
| AC5 partials/final/confirmation | PASS locally | Exact partial/final displayed, no Assistant request before explicit submission, exact preview 120/80 and zero writes, UI confirmation produces exactly one persisted `pa=120/80`; after reload/re-authentication UI readback proves persisted 120/80. Existing backend test also proves spoken confirmation and duplicate confirmation do not bypass policy/idempotency. |
| AC6 scoped regression/build/visual proof | PASS author checks; independent gate pending | Final frontend 1386/1386; voice 29/29; Python 240/240; backend 12/12; frontend production build 741 modules; backend tsc zero errors. 33 actual browser assertions and PNG/video/trace. |
| AC7 truthful real-provider boundary | NOT RUN positive transcription | `test-results/local-provider-binding-inspection.json`: cloud process presence booleans only, not remote Azure inspection. No real Azure transcription, paid provision, session activation or remote DB access claimed. |

## Actual final author commands

- `PYTHONPATH=clinicos-ai-runtime /workspace/.venvs/clinicos-ai/bin/python -m unittest discover -s clinicos-ai-runtime/tests`: final 240/240, `logs/python-full-final.log`.
- `npm --prefix frontend test`: final 1386/1386, `logs/frontend-tests-final.log`.
- `node --import tsx --test frontend/src/components/assistant/voice/__tests__/realtime.test.ts frontend/src/components/assistant/voice/__tests__/voice.test.ts`: 29/29, `logs/frontend-voice-final.log`.
- `npm --prefix frontend run build`: PASS, `logs/frontend-build-final.log`.
- `backend/node_modules/.bin/tsc -p backend/tsconfig.json --noEmit`: PASS, zero-output `logs/backend-types-final.log`.
- `flock /tmp/clinicos-browser-qa.lock node e2e/qa-voice-pr-393.mjs`: final execution PASS33 browser +12 backend; `test-results/integrated-result.json`, `logs/integrated-run.log`, media folders. The canonical run used real UI/mic/VAD/backend/policy/SQL; the provider/WebRTC transcript is a synthetic fixture.
- `node scripts/quality-gate/validate-task-contract.js voice-pr-393`, Node syntax checks, `git diff --check`: PASS.

Final author runtime execution preceded two harness-only maintenance edits: safe fresh `--out`
support and moving the text-fallback screenshot to its actual stage. No runtime behavior or
assertion was removed. The mistakenly placed author screenshot was renamed
`11b-post-unmount-dashboard.png`; it proves only that dashboard stage. Fresh independent QA must
execute the finalized runner and produce its correctly placed text-fallback screenshot.
The spoken-readback tooltip was restored verbatim from main after a read-only pre-freeze note;
existing clinical readback behavior remains unchanged. Fresh QA verifies the final source manifest.

## Independent execution and isolation

Fresh output command (must use a previously unused directory):

```bash
flock /tmp/clinicos-browser-qa.lock node e2e/qa-voice-pr-393.mjs \
  --out artifacts/task-validation/voice-pr-393/independent-qa/runtime-1
```

The wrapper refuses to overwrite an existing integrated result, creates only owned output
subdirectories, reads the verified canonical font bundle, creates a uniquely labelled disposable
PostgreSQL16 container bound to loopback55493, checks actual SQL readiness/empty tables and a
random database/container ownership marker before cleanup. It does not read the caller's DB URL.
It migrates only that owned container DB; the development5432 container is untouched. Browser,
backend, fixture runtime and teardown share the global lifecycle lock. Ports3093/5393/8093 are
prechecked free and only child PIDs created by this wrapper are terminated.

Dependencies: root `node_modules` is a directory of links to installed packages except a copied
`@prisma/client` and own generated `.prisma`; frontend links exclude shared `.tmp`. Backend's
existing workspace node_modules link resolves generated Prisma via this worktree root. Generation
used a deliberately unused loopback port1 URL, without connecting or mutating any database.
Python venv is reused read-only. No package/lockfile/dependency or root generated-client edit.

## Provenance, failures and privacy

`author-attempt-1..5` retain previous author fixture outputs. They are not independent review
rounds and do not reset/recreate any dispatched implementation or review ledger. Attempt1:
12 backendPASS; browser error was masked by an immediate Docker --rm removal assertion. Attempt2:
12 backendPASS; old accessible dialog selector and unavailable font request, no browserPASS.
Attempt3: 23 browserPASS. Attempt4: 29 browserPASS. Attempt5:27 preceding assertionsPASS; reload
readback NOT RUN because development simulator session intentionally requires re-login.
Final canonical run:33 browserPASS and12 backendPASS; all original required assertions retained.

Official font bytes and licenses are bundled with hashes, rather than using empty font responses
or suppressing network errors. Controlled provider503 is explicitly recorded in `expectedErrors`;
unexpected console/page/HTTP arrays are empty. Actual synthetic bearer strings/QA DSNs were
redacted from trace payloads and logs with a recorded transformation (`privacy-scan.json`), ZIP
CRC verified, media retained; resource identifier filenames are not promises of original payload
hashes. No real clinical records or provider credentials are used in browser artifacts.

## Remaining review targets

- Independent QA must challenge provider final arriving during the ~250ms pre-commit window;
  source accepts final only after the actual commit timer sets the marker. Author fixture emits
  normal final only after commit, so that adversarial timing is not yet independently proved.
- Real RTCPeerConnection/Azure API compatibility and actual allowed deployment transcription are
  not proved by a scripted peer or configuration status. Do not activate the feature or call it
  a successful deployed transcription on these fixtures alone.
- New optional Azure path does not replace the newer provider-neutral file STT/default provider
  or restore old direct Azure WebSocket transcription. This reconciliation is explicitly scoped.
- No native GitHub current-SHA checks, current Claude review, merge or deployment executed here.
