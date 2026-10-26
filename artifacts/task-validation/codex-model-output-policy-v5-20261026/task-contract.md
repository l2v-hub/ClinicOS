# Task Contract

## Task
- Title: Reliable Codex execution and strict Claude review with complete bounded context
- Slug: codex-model-output-policy-v5-20261026
- Type: bugfix
- Date: 2026-10-26

## Current Behaviour

Fatal stdout limits reject valid Codex sessions; actual Claude generated approved+findings correctly rejected by strict validation. Source4 fixes those generation/diagnostic/history defects but its full source+all373evidenceinventory exceeds the existing review packet limit before inference.

## Expected Behaviour

Preserve source4 production/runtime protections and canonical audit history, and retain every original native test/assertion while splitting its large changed test file into an exact-baseline oldfile plus a small newfile so COMPLETE source/evidence remains within unchanged reviewer bounds.

## Acceptance Criteria
- AC1: Model progress exceeding2MiB can produce a valid bounded typed result; fatalstderr64KiB, ownedtails,timeout/processgroup,resultsize/path/schema guards and every legacy combinedcap remain.
- AC2: Claude generation matches strict nativeverdict semantics: approvedonlyif0+evidence, anyfinding forbidsapproval, blockedemptyallowed, no finding suppression or report normalization.
- AC3: Finite diagnostics cannot expose rawprovider/secret/clinicaltext or mask originalresult/error; nativeadoption preserves exact spenthandoff/nonces/budgets/history.
- AC4: The large oldtest file matches995 byteexact; newsmallfile retains both originalSource4test/assertion byte sequences and native behavior, with no production changes.
- AC5: The unchanged trusted reader accepts COMPLETE current source/evidence packet with realcapacity/feedback headroom, no bound increase or context/evidence deletion; old752 RED and newGREEN are real nativefixtures.
- AC6: NEWindependentQA, actualcurrenthead sixCI and immutable native/livecapacity checks plus plainauthenticated15sourcehashproof precede genuinelycorrectedpeer5; NEWfinalCodex followsactualapproval before normalprotectedmerge. Futuresequential gates are not fabricated to qualifyearlierreview.

## Test Plan

Retained realchild model RED/GREEN and fatalnegative fixtures; strictverdict/privacy/nativejournal fixtures; two mechanicallymovednative tests; full1689tests/1686PASS0FAIL3WindowsSkip; actualnativeReader realGitobject RED→GREEN with373historicalevidence+feedback+32KiBfutureproofpadding. No provider orclinicaldata replay.

## Gate Status

Implementation5 complete; NEWindependentQA and later currentheadCI/peer/final/merge are genuine sequential stages.
