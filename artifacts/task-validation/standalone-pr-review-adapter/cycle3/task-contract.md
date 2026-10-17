# Task Contract

## Task
Standalone PR review adapter — implementation attempt3/4. Root authoritative CAS reserved3 before source edits. Attempts1/2 failed independent QA; old author evidence, QA1 and QA2 remain immutable.

## Impact Classification
Clinical/UI/backend/database: no. Trusted review persistence/security and GitHub durable state I/O: yes.

## Current Behaviour
QA2 F3: valid CJK report passes existing char-based validateReview and comment protocol but stored report UTF8 byte cap rejects it, stranding a reservation. F4: GitHub Contents omits base64 body above1MiB, so valid multi-subject state cannot reload; store can currently save unreadable/oversize state.

## Expected Behaviour
Keep existing compact100000UTF16-char review validator and canonical pretty JSON behavior; bounded stored raw representation accommodates legal CJK/astral and100findings, while aggregate subject guards remain. Durable state uses bounded authenticated SHA-pinned blob fallback for encoding:none/large metadata and rejects >8MiB serialized state before any save mutation. Normal batch identity/plan/security guards unchanged.

## Acceptance Criteria
- AC1: CJK50000-char and astral reports complete actual comment import; maximum four legitimate multilingual reports and pretty100finding reports pass storage/schema within explicit bound; oversize/secret content still rejects.
- AC2: Contents encoding:none metadata with valid1.124MiB state loads via git/blob SHA, bounded8MiB, strict file/size/SHA/base64/decodedlength/hash; no arbitrary URL access. CAS uses original metadataSHA.
- AC3: >8MiB state save rejects before API mutation/guard; exact boundary roundtrip works; failed/tampered/oversized blob load never authorizes save.
- AC5: A pre-existing running Codex final-QA reservation is pending, never evidence of interruption. Concurrent finalizer/pipeline must not change its phase/state, duplicate inference or merge; owning caller alone can finish its result and guarded merge. Actual owner failure remains explicitly blocked.
- AC4: Fixed trusted infrastructure policy adds exactly github.mjs and github.test.mjs, total18; no PR/env expansion. Full regression and all prior sealed proof integrity checked.

## Test Plan
Luna boundedF3 source+contracttests only; senior F4transport/security/coretests and fixedpolicy. Full bug-pipeline regression, actual QA2large-state fixture where available, UTF8/surrogate/reportpretty roundtrip, metadata/hash/base64 failures and CASconflict. No liveGitHub/model/provider/DB writes/calls by author.

## Evidence Plan
Append-only cycle3 logs/report/sourcefreeze15paths. Hash-verify previous sevenauthorproofs plus cycle2proof manifest; preserve QA1/QA2 directories. Fresh independentQA3 after sourceSTOP.

## Risks
Large state raw bytes and base64 expansion require separate caps; Git object digest verifies blob corresponds to Contents metadata. Unicode codeunits differ from bytes, preserve existing review semantics without changing normal100KBpolicy.

## Gate Status
READY FOR IMPLEMENTATION
