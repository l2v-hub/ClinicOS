# Cycle4 author validation report

Status: IMPLEMENTED — NOT VERIFIED. SOURCE STOP for fresh independent QA4. This is the fourth and final implementation attempt; three independent QA failures remain counted and no fifth attempt is authorized. Pre-edit root reservation is preserved in root-reservation.json. No commit, push, publication, live state mutation, actual model inference, provider call, database operation or deployment was performed by this author.

## Changes
F5: Every durable save accounts for actual pretty UTF-8 state bytes plus512KiB per active external review, independent Codex QA and merge reservation across batches, manualBatches and standaloneReviews, capped at8MiB. Standalone compact2MiB validation includes its active allowances. Claim/QA capacity refusal precedes a durable running round or inference. Result persistence atomically replaces its allowance. Existing normal text/comment/schema limits remain unchanged.

F6: Default state saves remain strict CAS. Trusted orchestration explicitly enables at most three disjoint-entity rebases after a confirmed409. Each uses original persisted base, intended state and fresh remote state, creates a new serialized body, validates the entire merged state/capacity/ownership, and reruns original native/authentication guards. Same-entity dual changes, conflicting unknown root fields, duplicate IDs or invalid merged ownership fail closed. Recursive synchronization preserves collection arrays, entity and nested attempt references held across awaits. Capture occurs before validator/guard loads and a later load cannot promote an old body to a fresh SHA.

Owned bounded failure codes preserve recognized cause chains without raw stderr/model output/credentials. An owning thrown independent-QA execution records failed status and releases capacity; an already-running owner observed elsewhere remains pending. No inference retry or budget reset was added.

## Verification
- Full bug-pipeline regression:681 tests,678 pass,0 fail,3 existing Windows-only skips (test-results/full-suite-2.log).
- Production standalone protocol:23/23 pass (protocol-targeted-2.log), including organic24subjects/92priorvalidreports at8MiB-30000 bytes, claim refusal before durable round/report, QA refusal before inference; real shared store with two controllers where unrelated request+claim occurs while QA waits, both entities survive, owner result persists and merge occurs once; same-subject concurrent hold remains a conflict with no overwrite or duplicate inference.
- Dedicated schema bounds:11/11 pass (schema-targeted.log), including near100000compact-unit multilingual/astral/escaped maximum-finding report inside512KiB outer-state allowance, four multilingual reports, and2MiB subject reservation counterexamples. Bounded pure-test delegation completed; senior owns state/security implementation.
- GitHub store targeted55/55 pass before final diagnostic wording/format-only changes; final full regression includes those55 (github-targeted.log).
- All15 source/test/doc paths pass Prettier; git diff --check passes.
-195 unique previous author/QA1/QA2/QA3 proof files verified against sealed manifests, including QA3 final report and seal (preserved-prior-proof.json); no earlier evidence bytes modified.

Earlier same-attempt logs are preserved: protocol-targeted.log exposed an overly narrow syntheticHTTP409 matcher; full-suite.log exposed legacy compare-and-swap error-message compatibility. Both were corrected and all regressions rerun. No tests or evidence were hidden or overwritten.

## Limits and handoff
Disjoint rebasing is bounded best effort, not a guarantee that every completed model result persists. Exhausted retries or same-subject conflicts can still leave a durable running reservation whose local result was not saved; explicit operator diagnosis is required, without automatic inference repetition or budget reset. The reproduced disjoint CAS race does not establish the cause of any actual hosted clinical controller failure. Actual cloud model runtime was not verified here; synthetic callbacks are explicitly labelled in tests. Genuine Claude review, independent Codex QA, native checks and protected merge remain required. Standalone source corrections stay orchestrator-owned; clinical release holds and verified deployment boundaries remain intact. Root is sole publisher/state owner.
