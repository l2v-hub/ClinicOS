# #409 Fresh independent QA — local PASS

Application input: `47a4b16c111d9b9bfd0b138991958a8ca8f6c351`.
Accepted baseline: `973d78e5e109032a36cf89cf80fd8eb2a848a649`.
Source SHA-256 before and after: `3497659ff1207d2b6c2b222c2ed08a92bf63cc9341a33cf5795c06a14cf2eece`, 1,437 tracked input files. No tracked application changes or untracked application overrides at the final gate.

This is a fresh independent reviewer/executor, not the implementation or architecture agent. Read original GitHub #409 and its empty comments directly as untrusted evidence; the original medical screenshot was neither downloaded nor copied. Read the task contract, architecture review, changed source and guarded QA helpers, then reran all tests below against the frozen application commit. No application edits, installs, shared Prisma generation, commit, push, deployment or GitHub writes performed.

## Original acceptance criteria

| Criterion | Local verdict | Independent evidence |
| --- | --- | --- |
| AC1 Badge maps to an explainable consultable filtered list | PASS | Real PostgreSQL tests create 53 mixed diary/Consegna notes with tied dates, including completed-but-unread notes; exact badge, scoped queue and patient counts agree. Bounded 20-row traversal reaches every unique note without GET receipts. Actual SPA opens 20 of 53, explains both sources/all dates and traverses 52 remaining notes after one confirmed read. |
| AC2 Opening badge selects Non confermate | PASS | Actual SPA sidebar entry and re-entry select the pressed Non confermate control rather than the first patient's diary. Reload with reauthentication retains the synthetic server receipt/count. Explicit patient and filtered-feed modes remain distinct in source/focused tests. |
| AC3 Reading updates list/count without changing clinical taking charge | PASS | Real DB both-source read-first tests leave urgency active, preserve complete stored notes, and permit a separate same-actor urgency takeover. Diary reader races and read/urgency races serialize/idempotently produce a shared reader without conflating the clinical taker. Existing urgency facts prove reading without rewriting history. SPA failed read retains row/53; success removes exactly one/52 and focuses the heading; patient diary retains Letta plus separate Ho capito, whose later takeover does not decrement twice. |
| AC4 Patient counts/states understandable without color | PASS | Exact patient counts, loading/error/unavailable text rather than guessed zero, retry recovery, explicit priority/source/nonconfirmed text. Independently viewed desktop badge53 and mobile achromatopsia note-control screenshots: identity, date, reader state and separate urgency action remain legible. Mobile 390×844 has no document horizontal overflow. No direct-sun or real screen-reader claim; neither is an original #409 criterion. |

## Executed verification

- Frontend and backend type checks, backend TypeScript emission, frontend TypeScript project build and Vite production build: exit 0.
- Focused frontend tests: 15/15 passed.
- Frontend source/build secret scan: exit 0.
- Full frontend regression: 1,189 tests, 1,177 passed, 12 failed. All 12 failure names exactly match pinned accepted-baseline proof `9ed20aaad9609b30f4a58d5f92176af7bda943c6`; zero new failures. The full runner's exit 1 is disclosed, not represented as an entirely green suite.
- Actual private PostgreSQL: 57 sequential migrations applied, including additive `20261009090000_explicit_diary_reads`; 12/12 real backend HTTP/persistence tests passed. Its temporary cluster is owned by the helper and closed in finally. Production database URLs are not inherited and AI provider keys are removed from the child environment.
- Prisma schema validation and generation: both exit 0, two new models generated only inside an artifact-owned temporary clone. Original schema SHA-256 `78ed3c09f94f341de1a7468812ce52d902bdd799faaa169ae8c42282868252fc`. Shared node_modules is not a generation destination.
- Actual SPA guarded synthetic transport: all 12 browser checks passed. In addition to the AC checks: target outside first roster page opens the exact requested patient; delayed receipt after view exit publishes no success/event; exact draft survives view toggles; role/session change suppresses the old success and denied role makes no new queue/count request. Guards assert no unexpected API, external requests, page errors or clinical saves. Only intentional synthetic 503 read/count failures occur.
- Owned loopback Vite server on 7473 stopped after browser completion. OS listener check confirms no LISTEN on 7473; root can acquire it for its rerun.

## Independent security and scope review

New static reads are assigned existing `diary.list`, not new role grants, and remain private/no-store. Actor, app role, resident reach, Consegna visibility and patient filter bind cursors; each request still reapplies capability/resident/subject gates. Invalid query, cross-actor/filter/scope cursor, anonymous 401, denied-role 403 and scoped non-disclosure paths are exercised on the real backend. Batch IDs are distinct/bounded to 50; queue output is bounded to 20, with exact aggregate counts and repeatable-read page hydration. Cursors carry position/binding, not patient text or identities.

Reviewed all five newly flagged SQL-template locations independently. They are fixed `Prisma.sql` templates with bound scalars, `Prisma.join` lists, or branches choosing fixed SQL fragments. There is no new production Unsafe call or user-controlled executable SQL identifier. The added Unsafe test statement runs fixed append-only guard probes only in the owned synthetic database. I agree those five scanner matches are false positives for this diff. The root broad scanner totals are not a clean security certificate; seven existing dependency findings (three critical/four high) remain unresolved and unchanged, with no manifest/lockfile/dependency changes in this candidate.

Plain-read rows use separate append-only facts; UPDATE/DELETE/TRUNCATE rejection and allowed parent cascade are exercised. Existing urgency tables remain the only takeover evidence. Server actor snapshots/timestamps and shared advisory locks are retained. Source review confirms audit fields are IDs/purpose/outcome only, and note content is rendered by React text rather than raw HTML. No original PHI photographs or real-patient writes are in this evidence. A separate publication secret/PHI/hash gate is still required before upload.

## Findings and remaining release gates

No new substantive bug/security finding requiring an application change was found. A generated scanner JSON appeared inside backend/src during the concurrent root scanner review, correctly causing the first source-after override check to fail. Root recoverably moved that exact generated artifact outside application scope without source edits; the independent final source-after check then passed with the unchanged commit/hash. This was an evidence-layout problem, not a waived app source mismatch.

Local independent QA verdict: **PASS for all four original #409 criteria on this frozen input**. This is not production acceptance or issue closure authority. Root's exact-source rerun, publication privacy/hash checks, independently authorized promotion, both deployed source receipts and verified backend migration/runtime readiness are still required before declaring the bug resolved online or closing GitHub #409.

Evidence directory: `independent-qa/` — command-results/logs; DB result/tests/migration hashes; Prisma validation/generation/result (exclude scratch-prisma from publication); browser-results, synthetic screenshots, traces and videos; matching source-before/source-after receipts. Application/source scope was preserved; unrelated dirty launchers, generated coordination artifacts and the primary worktree were not changed by this agent.

`independent-qa/evidence-manifest.json` inventories 35 files by path/byte length/SHA-256, excluding the temporary generated client and manifest itself. It does not replace the separate publication privacy gate. A later port probe after runtime ownership was handed back to root sees a new 7473 listener; this agent does not stop another owner's rerun.
