# Full prior failed independent QA reports
@=[id,path,originalBytes,originalSHA256,viewBytes]
@["p001","C:/w-rv/tmp/review-capacity-20261103/independent-native-runtime/report.md",8455,"c62fddd7d7f400696aa320fa7ee0b51eecb8369929cb66ecf87b6df18ff46d26",8455]
# Independent runtime QA — blocked at bb9dd8dd

Actual independent reviewer: `/root/auth_expiry_final_qa`.
Source: `bb9dd8ddb3894416d59cb4eb5c42596819f98892`.
Tree: `c9a363a2c54812a3784c59959f7e0a8a39b945f6`.
Scope: four runtime modules and four tests, not mutable root integration or post-Claude final approval.

## Findings

### R1 — P2: runtime timeout does not guarantee terminal completion

Location: `agent-team/src/bug-pipeline/native-guard-container.mjs:316` (also error/overflow rejection branches at 329, 336, 349).

The deadline callback sets failure and calls `child.kill('SIGTERM')`, but never settles `completion`, escalates the signal, or invokes bounded owned-container removal. `completion` is resolved only by `end()`, normally reached on child close/error. A Docker client/container that does not terminate on SIGTERM can leave the operation awaiting completion indefinitely beyond the advertised finite deadline. This can strand an already-owned source attempt and its controller cleanup; killing a process is not evidence that it exited. This finding does not claim a second inference was forwarded.

Actual independent repro: private test `container inspects before sending secret stdin, then timeout alone must settle completion`, in `adversarial.test.mjs:26`. Fake Docker process passes both valid inspections, then receives only the synthetic bootstrap via stdin. It records SIGTERM but emits no close/error. With timeout 20ms, the operation's completion is still pending after 70ms. Assertion fails: `configured runtime deadline must not wait forever for a child that ignores SIGTERM`. The fake child implements the documented signal-attempt interface; no real Docker/provider call was made. The test finally invokes close explicitly to avoid hanging the test runner, which illustrates the missing autonomous terminal path rather than fixing the source.

Receipt: `adversarial-frozen-bb/receipt.json`, actual exit 1; 28 cases, 27 pass, 1 fail, zero skips/cancellations. Required remediation is a bounded failure/cleanup path that does not depend indefinitely on voluntary child close, with safe escalation/removal bound only to the actually owned container identity and no refund/replay. Failure detection should not leave active source forwarding or late-success authority behind. A corrected source needs a fresh test and source-bound replay.

### R2 — P2: escape probes lack a reachable network positive control

Location: `agent-team/tests/bug-pipeline/native-guard-container.test.mjs:197`.

The Linux smoke test only checks failed connections to `192.0.2.1:443`, `2001:db8::1:443`, and failed resolution of `example.invalid`. It never establishes those exact targets were reachable in a non-isolated comparison. Its predicate treats any connection error or timeout as isolation success. Therefore a generally unreachable target, missing route, or unavailable resolver satisfies that portion of the test without demonstrating enforcement by network:none.

The separate actual-inspection validator still rejects configured NetworkMode other than none; this report does not claim the entire test would pass a normal bridge inspection. Inspection establishes configured isolation, whereas these negative attempts do not provide the requested discriminating escape regression proof. Require a controlled synthetic TCP/DNS target reachable from a non-isolated baseline, same fixture/target identity and positive-control success, then failure under the isolated policy. Unavailable IPv6 baseline must remain explicitly unqualified, not counted as a demonstrated IPv6 block.

The private local-loopback comparison case passes: this same fail-on-error predicate reports false for a live local server and true after that server closes. That test does not run Docker or prove external isolation; it demonstrates why target liveness must be established. The author has begun a later test-only RED commit `345ff73a...`; that is not part of the assigned frozen bb9 source and is not considered a verified fix here.

## Actual independent execution and source fencing

- Existing four suites at bb9: 18 cases, 15 PASS, 3 explicit Linux SKIP, zero failures/cancellations. Replayed again in the dedicated frozen QA checkout with the same result; repeats are not counted as additional distinct cases.
- New independent adversarial suite: 28 cases, 27 PASS, 1 FAIL (R1), zero skips/cancellations. No failure was disabled or converted into a pass.
- Both used trusted D2 `createRunner` in credential-stripped verification mode. Exact commands, timestamps, receipts and log hashes are in `execution-evidence.json`.
- All eight local source/test files in the final dedicated QA checkout are byte-equal to bb9 immutable Git blobs; exact Git and SHA-256 identities are recorded. Tracked/untracked status remains clean. `git diff --check` passed. No source edits occurred.

The initially assigned author checkout moved from bb9 to the author's intentional test-only RED 345ff73a during review. The new adversarial command failed its immutable HEAD assertion before running any tests. This was reported immediately and preserved in `stopped-source-fence.json`. Root then supplied `C:/w-rv/review-capacity-runtime-qa-bb20261103`, detached at exact bb9. All subsequent executions used that frozen checkout. No result was silently rebound to the moving author source.

## What was checked, and what was not proved

Read every line of the four runtime modules and their four tests, root plan/path claims and guarded proxy architecture, and actual author receipts/logs. The requested author Markdown report/result were absent in the private author directory at inspection time; no unavailable author conclusion is asserted. The author's retained initial RED evidence is four module-import failures before implementation, not four passing assertion-level security regressions. Its log hashes and the clean bb9 15/3 receipt hashes are verified separately from independent runs. No tracked AGENTS.md exists in this source; supplied project isolation/authority instructions were retained.

The passing private checks cover exact CONNECT authority, SSRF-style authority variants, fixed official TLS hostname/SNI/options and no caller proxy inheritance, duplicate/framing/header guards, bounded metadata header/body exfiltration rejection, capture-buffer aliases/one-use output, fixed executable/argv/environment, secret absence from Docker argv/env, bootstrap only after actual inspection fixtures, and rejection of image/executable/argument/mount/healthcheck/PID/IPC/UTS/device/bind/tmpfs drift. These are Windows pure/fake-process checks, plus one synthetic local-loopback server with no external traffic.

Actual Linux Docker namespace/escape behavior, Unix CONNECT+TLS wire parsing/SNI, genuine OpenSSL chain and private-key handling are three explicitly skipped tests. They did not run here. Source inspection shows original body buffers are captured for deferred forwarding, OAuth equality uses in-memory timing-safe comparison, official upstream options explicitly select roots instead of the interception CA, and a single proxy-wide sourceSeen plus shared data state is intended across connections. This is not an executed integrated concurrent-socket/response-equivalence proof. Root's mutable session/qualification seams were not reviewed or approved in this task.

Certificate commands use private stdin and only public CSR/CA paths. The factory zeroes its private buffers and dispose zeroes the returned TLS key. However, dispose does not remove the public temporary directory, and the container helper creates a Docker-config directory without local removal; robust caller-owned cleanup (including certificate-generation failures before a handle is returned) is still an integration responsibility to demonstrate. No actual private keys, OAuth values or native raw diagnostics were obtained or printed in this QA. No fabricated cleanup or runtime qualification is claimed.

All private files are under `C:/w-rv/tmp/review-capacity-20261103/independent-native-runtime`. No source, provider, OAuth, GitHub, canonical state, main worktree, production, merge or deployment mutation occurred. No final-qa-agent-result approval was written. Original technical/auth histories and limits remain unchanged. Genuine Max/CI/final QA, protected release and actual demo restoration remain pending; this blocked runtime QA is not an app-resolution claim.

@["p004","C:/w-rv/tmp/review-capacity-20261103/independent-native-session/report.md",7128,"1707a7a3f29705e5db8d78e57d55b5857a547f3dc7e81ed1a64c7aa082c847e9",7128]
# Independent read-only QA: root integration at2104432d

Verdict: FAIL. Four actionable items remain on this exact frozen source. This is
independent QA of the nine ROOT-AUTHORED integration files, not independent
approval of the protocol modules I authored earlier, not post-Claude/final-native
QA, and not proof of an actual Max/Linux/native qualification or online result.

Source:2104432d52388c612c7dc8355f7d394367e50f47.
Tree:e408631855dd48d630c682f6a0cd6276eced352e.
Integration parent:72016415066b7bef9b63cc89293102ee13624022.
Dedicated detached checkout:C:/w-rv/review-capacity-session-qa-20261103.
Clean status checked before and after; no tracked or untracked source edits.
Reports, runner and added reproduction tests exist only in this private QA folder.

## Reproduced findings

### P1: policy can become invalid during the asynchronous claim fence yet source forwards

File:agent-team/src/bug-pipeline/native-guard-session.mjs, line111.

The state validator checks policy.ready before awaiting the supplied claim
validator, but not again after that await. onDiagnostic poisons the policy barrier
without poisoning the state gate. A policy change received while claim validation
is suspended therefore leaves the state RELEASED and permits its captured
upstream forward. The final session policy check rejects the outcome only after
the source has already crossed the forbidden boundary.

Private test1 supplies a real staged request through validateNativeRequest and
the actual state module. Its asynchronous claim validator yields, emits the late
policy-change diagnostic, then returns true. Expected synthetic forwards:0;
actual:1. The release eventually fails, but that does not undo the forward.

Required repair: recheck policy/liveness immediately after each awaited claim
fence and before forwarding, and synchronously poison/cancel the source gate on
late invalid policy. Preserve the one-attempt/no-refund behavior. Root reported a
later fix elsewhere; this QA has NOT verified that newer source.

### P2: session deadline does not bound startup

File:agent-team/src/bug-pipeline/native-guard-session.mjs, line141.

runtime=await startRuntime is outside any expired race. If startup never resolves,
the timer rejects the internal ready/expired promises, but the outer session
remains suspended forever awaiting startup. Private test2 sets timeout20ms and a
never-resolving synthetic startRuntime. After80ms the session is still pending,
not rejected. No real runtime/container/provider was started.

Required repair: bound startup itself with the same lifetime, cancel/close any
late-arriving runtime, and make cleanup idempotent/awaited without discarding its
failure. The claim/forward must remain unavailable after expiry.

### P2: guarded optional selection repeats the original capacity regression

File:agent-team/src/bug-pipeline/native-guard-session.mjs, line384.

The new stager selects optional evidence against a budget that reserves prompt,
schema, native margin and32k output, but no measured native wrapper context. Its
subsequent complete native request can therefore exceed the gate solely because
optional reports filled that unreserved space, blocking an otherwise fitting
required review instead of recording bounded omissions.

Private test3 uses the actual source reader with215,000-byte before/after bodies
for two files, required documents, a25,000-byte optional report, and a bounded
16KiB synthetic native system wrapper. Required-only staging succeeds and is
closed with zero claims/forwards. Adding the deferred optional completion makes
the same stager reject. The fixture is synthetic; the defect is the calculator,
not a claim about actual native wrapper size.

Required repair: use source-bound qualified/measured wrapper accounting when
selecting optional reports, retain every required source/context byte, and keep
the final exact native gate. No fake fit, default128k relabel, or guard weakening.

### P2: expanded workflow leaves an existing required regression red

Files:.github/workflows/claude-cloud-review.yml, line14;
agent-team/tests/bug-pipeline/cloud-recovery-transport.test.mjs, line221.

The actual all18-suite replay fails the existing exact option-list assertion
because the workflow now adds qualify-native/native-review. The additional modes
are intentional, but the old assertion was not reconciled. Preserve its original
trusted-main/manual-recovery/permission/concurrency fences while adding stronger
assertions that native modes remain explicit and exact-PR/SHA bounded; do not
delete or disable the assertion merely to make the suite green.

## Actual independent execution

Trusted D2 createRunner in verification mode, credential-stripped. Every requested
test file was verified present in this exact checkout. All source/controller/
model/request interactions are synthetic. The legacy isolation test launches a
fake local CLI script, not native Claude. No real OAuth/credential read, Max,
provider, Docker, OpenSSL, GitHub/canonical mutation, deploy or patient access.

- independent-all18:156 total,152 PASS,1 FAIL,3 SKIP. The three skipped tests
  require Linux: actual certificate chain generation, Docker isolation/escape,
  and real CONNECT/TLS transport. Windows cannot establish these proofs.
- independent-session-repros:3 total,0 PASS,3 FAIL. These are deliberately
  failing regression assertions corresponding to the three behavioral findings
  above, not harness/import failures. Full logs/receipts retained unmodified.
- Reproduction file SHA256:
  2d9eb3c7482501c3567144804a7e18efa34fd97bf073c56a8ebaf41a2ada2f7b.

## Positive inspected properties (not an approval)

Normal guarded source is staged before canonical claim; the actual returned claim
transition is checked again before release. The native-required marker prevents
legacy normal and explicit recovery fallback. Source completion validates fixed
context and tracked-set identity. Final CLI JSON uses duplicate-aware parsing;
successful result type/subtype and upstream StructuredOutput equality are checked.
Final state requires RELEASED/one attempt/forwarded and genuine128k default
metadata is not renamed32k. Qualification uses synthetic current-size+40KiB input,
explicit trusted-main dispatch, reviewed source/binary/image fingerprints and
genuine transport proofs in its real caller. Unit receipts remain fixtures.
Workflow native activation is explicit/manual; scheduled/default review is still
the old path. These positive properties do not cancel the reproduced defects.

## Remaining limits

Runtime modules in210 are the original dependency blobs listed in qa-result.json.
Parent reported two separately owned runtime findings under correction; no claim
that those are fixed is made here. No real native/header/body/policy eligibility
or Linux escape qualification was authorized/executed. New frozen combined source,
all real CI files, independent rerun, actual old-worker Claude review and protected
final gates remain mandatory. Preserve this failed210 QA history rather than
relabel it when later fixes pass. No counters, history or allowances changed.

@["p006","C:/w-rv/tmp/review-capacity-20261103/independent-native-combined/report.md",8896,"5886eebd7edacc0989bde3c8e3ac9abd26b178e4f4d7baa483ae9d36bdd8d8c3",8896]
# Independent combined QA — blocked at 10000045

Reviewer: actual independent agent `/root/auth_expiry_final_qa`.
Source: `10000045b9a7884ea970acba204459c5e2c4d889`.
Tree: `1a2ba4aaa9d12efe110e75083a79f377c6d61f12`.
Dedicated checkout: `C:/w-rv/review-capacity-combined-qa-20261103`.

## Remaining P1 finding: late policy invalidation still crosses the forwarding boundary

Location: `agent-team/src/bug-pipeline/native-guard-session.mjs:151`; related claim wrapper at 116–117 and state await/send at `native-guard-state.mjs:54`.

The original straightforward asynchronous-claim regression is repaired: the session rechecks policy/liveness after awaiting its supplied claim validator. However, that asynchronous wrapper itself resolves a Promise which the state module then awaits. A queued policy diagnostic can invalidate the barrier after the wrapper's true result is computed but before the state continuation resumes. `onDiagnostic` only pushes into the policy barrier and calls maybeReady; it does not synchronously poison the data state. State therefore still sees RELEASED and forwards even though policy became invalid before the write.

Actual private reproducer: `policy-microtask-repro.test.mjs`, test `late invalid policy queued after awaited claim result still prevents forwarding`. It uses the real request validator, actual stage/session/state modules, valid synthetic body and isolation fixtures, and no provider. The claim validator queues two nested microtasks to deliver the late invalid-policy diagnostic and returns true. The session's post-await check runs first, the diagnostic invalidates policy next, and then the state await continuation sends. Expected forwards 0; actual forwards 1. The eventual release rejection does not undo that forbidden forward. This is a stronger interleaving of the prior policy finding, not an allowance to waive its original assertion.

Receipt `policy-after-await-microtask/receipt.json`: actual exit 1, one test, zero pass/one fail, zero skip/cancellation, source/index stable. Required repair: synchronous data-gate cancellation when an already-authorized policy state becomes invalid/pending, plus any necessary final immediately-before-forward fence; retain irreversible spend and no replay/refund. Another post-inference outcome check is insufficient. Author/integration owner was notified before any QA-pass or Max handoff. No source was changed by this reviewer.

## Actual independent executions

All runs use trusted D2 createRunner verification mode and explicit existing test-file checks, with clean HEAD/index before and after. Commands, timestamps, source identities and exact log/receipt hashes are retained in `execution-evidence.json`.

- `all-proper-eighteen`: 171 cases, 168 PASS, 3 explicit Linux SKIP, zero failures/cancellations. All eighteen requested suite files exist and are listed individually in the receipt. No old helper's silently omitted-file count is reused. Historical root-helper evidence described as 80 rather than 99 is not treated as a current 99-case execution; the author's separate actual evidence remains separate.
- `prior-behavioral-reproofs`: 31 cases, 30 PASS/1 FAIL. The 28 unchanged runtime adversarial assertions all pass, including the original SIGTERM-ignoring-child deadline assertion. The first two session repro assertions also pass. The optional case failed because my first new-API fixture adapter incorrectly shared one isLive flag across separate fresh runtime invocations. That failure is preserved; it is not reported as a candidate defect.
- `corrected-original-session-reproofs`: all 3 original session assertions PASS, zero failure/skip/cancellation. The only correction gives each startRuntime invocation its own live=true until that runtime's close. Every original assertion is unchanged; reverse transforms are checked and hashed. The original policy-during-await, startup-deadline, and optional-wrapper tests are genuinely green under this correct fixture.
- `policy-after-await-microtask`: 1 FAIL, the genuine remaining finding above. No assertion was disabled or weakened to produce a pass.

Fixture source hashes, original reproduction hashes, transformations and correction rationale are retained. The adapter failure and the genuine policy failure remain distinct logs/receipts. Repeated assertions are not summed into a misleading aggregate pass count.

## Prior six findings: verified disposition at this exact source

1. Runtime SIGTERM timeout: original private assertion now passes; source has bounded signal escalation, failed completion, immediate isLive=false on failure, and deduplicated observed-ID removal. This is synthetic Windows process testing, not real Docker termination qualification.
2. Positive escape control: source now creates controlled host TCP and UDP DNS services, establishes an observed bridge gateway, checks a reachable bridge baseline, and compares identical script/target hashes against network:none with no host service hits. The pure comparison test passes. Actual Linux smoke remains skipped here; no actual semantic IPv6 escape proof is claimed.
3. Policy after awaited claim: original repro passes, but the stronger adjacent await interleaving still fails. This finding is NOT closed.
4. Startup deadline: original private never-resolving-startRuntime assertion passes. Startup is now raced against expiry, with late-return cleanup. That positive test is not proof every possible caller cleanup failure is resolved.
5. Optional native wrappers: original private source215000/optional25000/system16000 fixture passes. The mandatory body stays live while an optional request is staged separately; final actual capacity remains enforced. Typed capacity is privately minted only after full request validation; public/forged/replayed errors and malformed bodies cannot mint fallback authority. Policy/auth/unknown failure does not authorize mandatory fallback. These properties are also covered by the actual eighteen-suite replay.
6. Workflow exact-list assertion: the previously red regression now passes in the real cloud-recovery-transport suite. The expanded list retains main-only trusted checkout, constant recovery entrypoint, same concurrency and contents:read. Native qualification/review modes require explicit workflow_dispatch and exact workflow/main identity; native-review selects exact PR/SHA. Scheduled/default review does not activate the native profile.

## Scope and source evidence

Read both prior independent blocked reports, the current session/qualification orchestration, typed capacity classifier, current runtime deadline/escape changes, workflow fences and relevant worker/recovery source. Reviewed previous protocol/runtime inspections are retained rather than relabeled. All changed Git blobs are hashed in the manifest; present local source/test files are byte-compared. Historical packet artifacts intentionally omitted by sparse checkout are identified by their tracked skip-worktree flag and bound directly to immutable Git, not claimed present on disk. An initial collector ENOENT on the omitted analysis.md is retained as an evidence-collection correction, not a test or candidate failure. Hash binding is not a claim that old frozen round-one packet reports describe this new implementation. The current clean candidate is not a post-Claude approved or published source.

No provider/OAuth/real Docker/OpenSSL invocation, credential access, GitHub/controller/canonical write, source edit, main-worktree modification, merge, deployment, issue closure or clinical access occurred. Tests use synthetic process/model/controller fixtures and a bounded local-loopback socket only. Linux certificate-chain, Unix CONNECT/TLS and controlled Docker escape tests are the three skipped cases and remain mandatory in actual Linux CI. Runtime namespaces, raw CONNECT/SNI/TLS, genuine account/policy/request/response equivalence and final current-packet qualification are not inferred from Windows fixture success.

Canonical nativeRequiredEvidence remains frozen/mandatory before qualification; classic/native-required and legacy recovery fallback are blocked by source and passing tests. Parent-owned integration/release policy remains unchanged. This blocked QA cannot authorize publishing a passed packet, real Max round two, self-qualification, app-review claims, automatic merge/deploy, production or new allowances. Existing auth/technical history and all retained failures remain intact. The eighteen-suite result is not a full-controller green claim: root reports remaining failures in both its source and D2 full runs, whose precise identity comparison was not independently replayed here. Further exact-source repair and independent replay are required before a scoped pass; genuine Max review, exact CI, final QA, protected release and actual demo restoration are still separate pending gates.

@["p009","C:/w-rv/tmp/review-capacity-20261103/independent-native-combined2/report.md",7920,"61f27e501a92482eda6b144ed74c9ef2e00221585b27fccd3525a6896916d529",7920]
# Independent combined repair QA — blocked at 4c8beb83

Actual reviewer: `/root/auth_expiry_final_qa`.
Source: `4c8beb83c6ea11ba286f33372bf76ba1814c3770`.
Tree: `31861014940e9bde315e3fe6a3a8bfcf3ecc8f11`.
Checkout: `C:/w-rv/review-capacity-combined-qa2-20261103` (read-only and clean).

## Finding — P2: liveness can become false before the actual forward after the claim wrapper already returned true

Location: `agent-team/src/bug-pipeline/native-guard-session.mjs:118`, with the state await/send seam in `native-guard-state.mjs:54`.

The prior policy race is repaired. A parallel process-liveness edge remains: the session claim wrapper checks runtime.isLive after awaiting its supplied validator, then its own Promise resolves. The state module awaits that result before calling the stored forward. If runtime liveness becomes false between those steps, no synchronous liveness-failure linkage poisons the data gate and the previously computed true result still permits the write. The actual container stop marks isLive false immediately, but its completion/cleanup can lag while the finite signal grace runs; waiting for completion alone does not establish a final pre-write liveness check.

Actual private test `runtime liveness lost after claim wrapper result must prevent actual forward`, `extra-edges.test.mjs:19`, queues loss of liveness after the wrapper's boolean calculation but before the state's await continuation. It uses the real request/session/state modules, valid immutable synthetic body and isolation fixtures. Expected forwards 0, actual forwards 1. The eventual release fails, so this is not a false approval. It does not demonstrate an unauthorized claim/body, OAuth bypass, invalid policy, second inference, replay or refund. The narrower harm is spending the finite source inference after its source process became unusable, when a valid native result can no longer follow. Treat this as P2, not the previously fixed policy P1.

`extra-adversarial-edges/receipt.json`: actual exit 1; 14 tests, 13 PASS/1 FAIL, zero skip/cancellation, exact source/index stable. Required repair is a synchronous immediately-before-send liveness fence (or equivalently immediate data-gate poisoning on runtime failure) across the final asynchronous claim seam, retaining one-attempt/no-replay behavior. Root was notified with the concrete fixture before any pass handoff. No source fix was made by this reviewer.

## Actual independent runs

- All eighteen explicitly existing suites: 173 cases, 170 PASS, 3 explicit Linux SKIP, zero failures/cancellations.
- Unchanged private prior reproductions: 32/32 PASS, no skips/cancellations. This includes the original timeout, three session findings and the stronger nested-microtask policy assertion that failed at source10000045. Only assigned paths/SHA/output directories changed; original per-runtime isLive adapter is retained. Reverse transforms prove the assertion text is unchanged.
- New adversarial edges: 13 PASS/1 FAIL. All nine invalid-policy/pending-diagnostic/invalid-UTF8 cases at microtask depths0/1/2 stop with zero forwards. Four OpenSSL argv/env/stdin/failure/overflow edge cases pass; the sole failure is the distinct liveness finding above.

Every run used trusted D2 createRunner verification mode, stripped child credentials, exact test-file existence checks and clean HEAD/index checks before and after. Full receipts/log hashes and private test hashes are bound in `execution-evidence.json`. No npm/browser/app test was needed for this internal pipeline scope. All retained earlier failed QA reports remain unchanged; no failing assertion was removed, skipped or relaxed.

## Inspected repair

Reviewed the entire five-file delta from source10000045, full current certificate helper and relevant unchanged protocol/runtime/workflow composition already inspected in preceding source-bound QA.

The policy barrier now exposes poisoned state. onDiagnostic synchronously fails the data gate on poison or on a settled barrier becoming unready; reject invokes runtime.close immediately rather than deferring it. The real runtime factory closes proxy requests/sockets before awaiting container cleanup. The original policy defect is independently closed at this source, including its previously failing exact private reproducer and the nine stronger variations. Startup/owned-forward deadlines and bounded container termination repros remain green.

The certificate repair changes key input from an OpenSSL filename '-' to /dev/stdin behind a fixed Bash pipeline `/bin/cat | /usr/bin/openssl "$@"`. All command arguments remain positional and quoted, with a constant script, no profile/rc loading, pipefail, detached isolated process group, explicit finite environment and private stdin. Key values are absent from argv/env/public evidence. Failure destroys stdin, kills the isolated group/process and clears captured chunks; private errors remain fixed constants. Independent mock tests checked literal shell metacharacters, stdin-only synthetic key transport and bounded/sanitized failure paths. No Bash/OpenSSL process or private key generation actually ran in this Windows QA. Real FIFO/OpenSSL/TLS behavior for this SHA still requires actual Linux CI; pure tests are not substituted for it.

nativeGuardBuildIdentity additionally requires the complete tracked tree clean before qualification fingerprinting. Full model-visible input/schema/wrapper byte accounting, private minted capacity classification, live mandatory holding during optional staging, canonical required evidence and explicit trusted-main/manual exact PR/SHA activation remain in place. No default or scheduled native activation, alternate provider, new app allowance or no-tools weakening is introduced by this five-file delta.

## Retained external evidence and remaining gates

The parent-supplied source-s-ci-failures.json describes actual older Linux run41667635035 attempt1 at source10000045: 2010 tests, 2005 pass, 2 certificate-related failures and 3 expected platform skips; controlled positive TCP/DNS Docker isolation passed there. The current container and escape-test blobs are unchanged, but that is not a current-SHA full Linux pass. This reviewer did not fetch GitHub or independently retrieve that raw cloud log; the supplied summary is hashed as reported evidence, not a new execution or independent live-CI verification. The two historical Linux failures are preserved, not relabeled green because a candidate fix exists.

Independently checked the retained Windows baseline/source10000045 full-run log hashes and compared their actual failed-name sets. Their failures match, and neither full run is green. These were root executions, not independently executed full suites, and they are not bound to current4c8 as fresh full-run evidence. Baseline equality is not a failure waiver or proof that every failure is platform-only.

All changed Git blobs against trusted D2 are individually hashed; present source/test files are byte-equal to Git. Historical packet artifacts omitted by sparse checkout are explicitly marked and bound to immutable Git rather than claimed present. HEAD/index remain stable; no files were written in the QA checkout. Reports/tests/results exist only in this private combined2 directory.

No real provider/OAuth/credentials, native Claude, Docker/OpenSSL, GitHub/controller/canonical mutation, source edit, main-worktree write, merge/deploy, production action, clinical access or issue closure occurred. This is before-own-Max QA, not post-Claude approval. Exact current CI, full Linux proof, genuine old-worker Max review, subsequent final independent QA, authentic native qualification and protected release remain pending. Original auth/technical counters and histories, app source31 and no-automatic-release hold remain unchanged. This blocked result does not restore demo authentication or authorize a budget extension.

