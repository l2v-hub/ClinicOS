# Independent implementation-round4 QA

Verdict: PASS for this source candidate, no actionable finding found in this
review. This is independent pre-Claude implementation QA; it is NOT a native
final Codex result, Claude approval, operation capability or online resolution.

Source SHA: a5be73fa0d6d75abe216b67f99dbc754449f6315
Source tree: ea1bbde80d13b28066dce6310e5de12a9bb61ed7
Base: bc880a6dccc40d8dbad73c718c8aa4256562d254
Reviewer: /root/auth_expiry_qa (independent, no implementation/source-write role).

## Contract, history and newly discovered operational defect

Read the immutable original task contract from the source Git object
artifacts/task-validation/demo-auth-expiry/task-contract.md (blob
df7a200ad97ab37bab28a3d676761f2fb0c37555). Its seven criteria and safety envelope
remain authoritative. The contract is sparse in the working checkout but exists
in the reviewed commit; a new packet must copy it byte-for-byte, not replace it.

The prior round3 PASS is retained as the actual result on ae9995f5, not erased
or falsely relabeled as real backend proof. A later real read-only preflight
found that deployed public status emits 2026-10-31T23:59:59.000Z while the strict
request uses 2026-10-31T23:59:59Z. The old raw-string equality would deny this
same instant before claim/mutation. The actual finite receipt was read at
C:/w-rv/tmp/auth-expiry-20261102/live-expiry-format-receipt.json. It reports no
renewal mutation or deployment; this reviewer did not repeat its network read.

The retained red87dc69d3/root0dddbafc and green74712e59/roota5be73fa history
is consistent with a compatibility defect, not permission to relax validation.
Earlier Claude changes-requested review5741807864 and all previous source,
implementation/test/QA records remain history. No review2 or final-QA claim is
created by this source review or by its passing tests.

## Fresh commands on exact a5be73fa

All five commands were freshly executed by this independent reviewer in the
dedicated checkout; none of these results is borrowed from prior revisions.

| Check | Result |
| --- | --- |
| npm run build:frontend (TypeScript + production build) | PASS |
| npm test -w frontend | 1588 PASS; zero failed/skipped/cancelled/todo |
| node --test scripts/automation/renew-demo-auth-expiry.test.mjs | 70 PASS; zero failed/skipped |
| focused availability and rendered Login tests | 9 PASS; zero failed/skipped |
| unmodified committed real-App synthetic browser runner | 32 PASS at1280/390 |

The runner writes only this new r4 packet through its bounded QA_EVIDENCE_DIR.
All browser cases report outbound0/clinicalWrites0, no page errors and no
horizontal overflow. It intercepts auth APIs with synthetic responses, refuses
other outbound requests and never creates a real session or accesses a clinical
endpoint. Independently viewed fresh expired390 and retry390 screenshots: full
truthful expiry/retry card versus all five synthetic server-owned profiles.

No failure occurred in these five current runs. Chunk-size/plugin-timing build
warnings and the Node26 module.register deprecation warning remain in raw logs.
Old failed setup/tests are not overwritten or omitted from their old packets.

## Security/diff assessment

Reviewed the complete eleven-source delta and the narrow changes from the
previous frozen round3 publication. Backend ai/auth.ts, authz/simulator.ts,
app.ts, frontend entraAuth.ts and operatorSession.ts remain unchanged from base.
No actual authentication/expiry/policy gate, role assignment, database schema,
application API target, secret, new dependency or production setting changed.

The preflight fix does NOT parse/coerce public expiry input. It first requires
a string, then accepts only either the already validated strict request's
canonical seconds spelling or the exact .000Z spelling derived from that same
trusted request instant. Snapshot/capability/expiry-chain values remain the
strict request spelling. Arbitrary equivalent offsets or normalization are not
introduced. The existing seconds-positive test and new .000Z-positive test pass;
new negative tests reject .001Z, changed instants, offset notation, shorter or
longer fractions, junk suffixes, whitespace, missing/null/numeric/object/array
values. No authorization, target, readiness or main/owner validation is bypassed.

The remaining criteria continue to be supported by fresh regressions:

- Unknown/contradictory authentication-critical status, transport/HTTP/JSON
  failure, timeout and disabled mode expose no executable login. Server mode
  remains authoritative; browser time only chooses disabled-state explanation.
- Optional unusable expiry metadata normalizes to null, preserving enabled
  Entra/legacy demo and never enabling disabled auth. Retry restores five
  profiles; initial and late legacy/simulator expiry remove stale buttons.
- Renewal is fixed to one demo expiry key/target and MAX7days, requires an
  actual trusted-host consumed action capability, owner/history binding,
  single-use CAS claim and durable write-intent. A request/workflow actor is
  not authority; no default CLI authorizer exists.
- Prior authenticated expired staged cutoffs may form an exact continuation
  chain only. Claimed/write-intent/uncertain/live/parallel/duplicate/gapped
  stages remain blocked; the later action still proves matching live previous
  expiry before claim. Staged acknowledgment alone is not backend-application
  evidence. Original owner/execution-race, revocation and replay tests remain.
- Workflow execution is explicit first-attempt trusted-main dispatch, inspect
  by default, fixed protected demo environment, pinned Actions and shared
  deployment queue. Mandatory CI adds the renewal regressions without dropping
  prior gates. A single fixed-key skipDeploys:true mutation only stages expiry;
  uncertain writes are preserved without automatic retry or implicit deployment.
- Finite output rejects raw/private errors and credential aliases. No variable
  values/secrets, patients/documents, SQL, volumes or provider calls are read.

No assertion was disabled to get green. New positive/negative public-format
tests specifically reproduce and constrain the actual observed representation
gap. The E2E change only relocates its output root to preserve frozen r3 evidence;
all32 behavioral assertions/scenarios remain present.

## Boundaries and remaining release gates

Tracked source and exact HEAD/tree remained unchanged throughout these runs.
Only generated build caches and new independent-r4 evidence were written.
Native ledger CAS is an internal execution fence, not a claimed distributed
Railway transaction. Mock preflight/transport tests do not prove actual target
access, GraphQL acceptance, a staged variable write or live deployment behavior.
Real OIDC exchange is not exercised; its code remains unchanged.

Before release: genuine subsequent Claude Max review on the exact published
SHA, exact-head required CI including Linux/Node22, a separately reserved
post-Claude final Codex gate, protected merge/current-main source proof, real
typed human operation capability, fresh read-only demo preflight, one explicit
guarded stage and verified deployment are still required. Matching live auth/
readiness and all five profiles plus sanitized synthetic online evidence must
precede issue522 closure. PR520's round6 allowance is not part of this work.

No provider invocation, native final-QA reservation, GitHub/controller write,
Railway request, mutation, SQL, merge, deployment or real clinical access was
performed by this reviewer. Previous Windows baseline harness failures are not
claimed fixed here. Source freeze may release for evidence-only publication
provided all eleven source blobs remain identical to this exact candidate.

Evidence: execution-receipt.json, command-results.json, five stdout/stderr pairs,
browser/browser.json and fresh synthetic screenshots. qa-result.json binds
the report hash and exact source/tree/eleven-source manifest. Preserve all
previous packets, original reviews, allowances and attempts unchanged.
