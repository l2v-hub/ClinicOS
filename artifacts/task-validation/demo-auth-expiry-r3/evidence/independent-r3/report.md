# Independent implementation-round3 QA

Verdict: PASS for this source candidate; no actionable finding found in this
review. This is pre-Claude implementation QA, NOT a native final Codex result,
Claude approval, an operation capability or a deployed/online resolution claim.

Source SHA: ae9995f546d0adbbaa8033b3957e2fbd943723d9
Source tree: f604405fdf7dbd76a7c788b049c126c036e746c6
Base: bc880a6dccc40d8dbad73c718c8aa4256562d254
Reviewer: /root/auth_expiry_qa (independent, no source implementation role).

## Contract and scope

Read the immutable task contract directly from the source Git object
artifacts/task-validation/demo-auth-expiry/task-contract.md (blob
df7a200ad97ab37bab28a3d676761f2fb0c37555), its implementation plan and the
current issue522 acceptance body. The old packet's tracked contract is sparse
in this checkout, not absent from the reviewed commit. The new publication
packet is to preserve its bytes, not invent a replacement contract.

Reviewed the complete eleven-source delta and the round1 correction delta.
No backend identity/expiry/simulator gate, policy, Entra implementation,
operator-session implementation, database schema or application API target
changed. Old source, real changes-requested Claude review5741807864, test-red
commits642b5002/34ac4224, the earlier independent P2 and their evidence remain
history; this report neither erases nor retrospectively approves them.

## Fresh commands on this exact candidate

All five commands were freshly executed by this reviewer in the dedicated
isolated checkout. No result below is borrowed from a prior source revision:

| Check | Result |
| --- | --- |
| npm run build:frontend (TypeScript + production build) | PASS |
| npm test -w frontend | 1588 PASS; zero failed/skipped/cancelled/todo |
| node --test scripts/automation/renew-demo-auth-expiry.test.mjs | 57 PASS; zero failed/skipped |
| focused authAvailability + rendered Login tests | 9 PASS; zero failed/skipped |
| unmodified e2e/auth-expiry.mjs on real built App | 32 PASS,1280/390 widths |

The browser was isolated to loopback; external auth APIs were intercepted with
synthetic responses and all other outbound requests refused. No real auth
session, identity-provider call, patient endpoint or clinical write occurred.
All browser cases report outbound0/clinicalWrites0, no page errors and no
horizontal overflow. The only simulated session POST is the known local
simulator-disabled regression response; it never reaches Railway.

No failure occurred in these five current runs. Build logs retain chunk-size
and plugin-timing warnings; frontend test logs retain the Node26 deprecated
module.register warning. No assertion was weakened or hidden to obtain green.
The earlier CJS adapter setup failure is historical and retained separately;
this run used the committed runner without adaptation, with only the supported
QA_EVIDENCE_DIR set inside the new r3 packet. No old evidence was overwritten.

## Acceptance/security assessment

1. Authentication-critical unknown/malformed/contradictory status still fails
   closed. Checking, transport failure, bad JSON, HTTP503,15second timeout and
   disabled mode expose no executable profile cards or false demo promise.
2. Server mode remains authoritative. An expired disabled synthetic demo gets
   explicit expiry copy; malformed optional expiry metadata normalizes to null
   and cannot disable an enabled Entra/legacy-demo mode or enable disabled auth.
   Dedicated unit cases and three new browser scenarios prove this distinction.
   The old incompatible “throw for malformed expiry metadata” expectations were
   replaced by stronger authority-preserving assertions, not silently skipped.
3. Retry clears stale state and restores all five server-owned synthetic profiles.
   Both legacy auth_disabled and actual simulator_disabled session404 paths
   invalidate status and remove stale cards before the refreshed expiry screen.
   The previous independently reproduced late-simulator P2 remains corrected.
4. Genuine demo/Entra ready-state paths remain available and Entra footer no
   longer promises credential-free demo access. Selected cards do not grant
   identity/role; unchanged server verification still decides them. Real OIDC
   exchange was not exercised by these synthetic tests.
5. Renewal is limited to the one fixed DEMO_AUTH_EXPIRES_AT key, known demo
   project/environment/service/domain, canonical finite dates and MAX7days.
   Native trusted-host action consumption, owner/reservation/history binding,
   single-use CAS claim and durable write-intent remain required. No default
   authorizer, generic variables surface, credential export or SQL action exists.
6. The corrected prior-stage policy preserves completed history. Only authenticated,
   expired staged cutoffs forming one exact expiry chain can precede a separately
   authorized later renewal. Claimed, write-intent, uncertain, live, duplicate,
   parallel or gapped stages remain blocked. A later stage still must prove its
   exact previous expiry from the live public status in preflight; an old staged
   acknowledgment alone never proves backend application. The dedicated negative
   regression fails before a second claim/write when the public old expiry did
   not change. Actual operations in this review remain fully mocked.
7. The workflow remains explicit first-attempt trusted-main dispatch, inspect by
   default, commit-pinned Actions, fixed protected demo environment and shared
   deployment concurrency. Mandatory CI adds the renewal suite without removing
   previous gates. One expiry-only mutation stages with skipDeploys:true; no
   deployment or implicit replay. Native owner/execution replacement across the
   final permission await is re-observed and rejected before writing. Ledger CAS
   is an internal fencing mechanism, not a claimed distributed Railway transaction.

Independently viewed the current expired390 and retry390 screenshots. They show
the full truthful expiry card/retry action versus five complete synthetic server
profiles; screenshots are actual capture outputs, not edited or reconstructed.
No secrets/PHI are present in the reviewed source, fixtures or captured evidence.
All writes by this reviewer were generated caches and this new independent QA
evidence. Tracked source and exact HEAD/tree stayed unchanged through execution.

## Remaining gates

This candidate must receive a genuine subsequent Claude Max review on its exact
published SHA, required exact-head CI (including Linux/Node22), then a separately
reserved post-Claude final Codex gate. Only after protected merge and fresh
current-main/source proof may the trusted human action capability be consumed
for a read-only operational preflight and the single authorized expiry stage.
Verified deployment, live auth/readiness, all five profiles and a sanitized
synthetic online proof remain necessary before closing issue522.

No native final QA was claimed/reserved by this reviewer. PR520's round6 grant
was not used. No actual provider call, controller/GitHub write, Railway request,
configuration mutation, SQL cleanup, merge, deploy or real clinical access was
performed. Prior windows-baseline harness failures are not claimed fixed by
this focused run. Source freeze may release for evidence-only publication if
all eleven source blobs remain identical to this candidate.

Evidence in this directory: execution-receipt.json, command-results.json,
five stdout/stderr pairs and browser/browser.json plus synthetic screenshots.
qa-result.json binds the report hash, exact source/tree and eleven-source
manifest. Preserve the earlier implementation packets and reports unchanged.
