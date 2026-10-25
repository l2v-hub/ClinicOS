# Scope amendment1, before source edits

User requested actual autonomous GitHub flow. Bounded analysis seals13147ff5239a2d05a6a2f6118a119217e1f57c210192adb13f3406c2e5ccb0cb (controller) and sync/source analysis establish two real source gaps. Root accepts exact eightpath allowlist:

- agent-team/src/bug-pipeline/operator-ownership.mjs (new pure shared helper)
- agent-team/src/bug-pipeline/pipeline.mjs
- agent-team/src/bug-pipeline/external-review.mjs
- agent-team/src/bug-pipeline/release.mjs (automatic selection guard only; no provider/gate policy alteration)
- agent-team/tests/bug-pipeline/operator-ownership.test.mjs (new)
- agent-team/tests/bug-pipeline/pipeline.test.mjs
- agent-team/tests/bug-pipeline/external-review.test.mjs
- agent-team/tests/bug-pipeline/release.test.mjs

Ownership contract: active operatorTakeover WITHOUT explicit recognized automation handback remains globally paused. New automatic intake/mutations are permitted only after root separately records operatorTakeover.automation.enabled===true and mode==='new-unclaimed-only'; root will bind all current retained subject identities in automation.protectedSubjects [{collection,id}] on that real source revision. ProtectedSubjects, existing takeover.subjects, active subject.operatorCoordination and non-finished operatorReleaseCoordination are protected independently. Key by collection+id, not mutable SHA; never remove old entries or zero history. Explicit pending Claude review request/claim remains supported by existing handoff: do not change read-only local cron selection to prohibit real root-requested reviews. No rewrite of Max worker or new supervisor. Release automatic selection shares helper to skip root-owned subjects/globalpause; explicit supported maintainer release retains existing real guards and authority, with no bypass added.

Pipeline loads canonical ownership before intake mutation. Skip automatic oldsubject diagnostics/status/finalization/recovery and reapply ownership after any CAS reload. Claimed issue numbers derive all collections, including terminal claims to avoid implicit budget restart. Occupied file scopes derive nonterminal subjects across collections with exact frozen scopes/source manifests. Preserve old objects byteforbyte. No role switch for authenticated read-only Claude reviewer; baseline stays adaptive Codex implementation plus actual Max independent review. Claude implementation adapter is explicitly absent, not falsely claimed.

FinalQA all channels: reserve and save current SHA/Claude round/feedback fingerprint before actual fresh session. Wait without inference on pending nativechecks; reject changed PR identity/unresolved/changesRequested and stale QA; never relaunch existing running reservation; verify identity/fingerprint/checks after execution before ready. QA findings enter existing correction flow with genuine consumed history. Every actual prior failure retained; default budget4 and existing typed authorized continuations unchanged.

Author6.1-Sol chosen because ownership/CAS/review gates are highrisk; optional Luna inappropriate for this coupled state change. No broad audit/refactor, provider/model live calls, credentials, Git/canonical mutations or live application execution by author. Tests use synthetic injected dependencies and isolated temp paths only. Root owns source integration/publication/actualreviews/activation.
