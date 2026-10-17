# Candidate 3 stable implementation handoff

Status: local implementation cycle3 complete, pending NEW independent QA3. Baseline remains a516d42e31f6674c39c1d130c9706cd80a7ab4c6. No actual GitHub/Railway mutation, credential access/export, model/Claude call, commit, push, deployment, Docker operation, clinical data/schema edit or ledger reset was performed by this implementer.

## Final behavior

- Current durable hold and exact verified release/PR/source/approval identity are rechecked through one guard after issue view and inside the actual GitHub request adapter. Label creation, lifecycle POST/DELETE and PATCHclosed cannot cross an avoidable prior API await without fresh authorization. Cache hits validate the guard; partial operations invalidate old cached state and only full success is cached. An already in-flight irreversible GitHub request cannot be atomically coupled to the separate durable state store; the regression matrix distinguishes that unavoidable boundary from earlier avoidable awaits.
- Publication comments contain verified deployment/review facts without a premature already-closed claim. Real HTTP503 failure keeps retry markers and avoids duplicated facts.
- All terminal completion publication is deferred to protected confirm-demo. Deployed/pending batches are automatically eligible for recovery after the next successful controller poll; no model/review attempt, remerge or redeploy occurs. Recovery retains full exact review/evidence/merged-SHA checks, permits already-closed source issues for idempotence, and checks fresh durable identity. Published completion is recorded only after all issue operations and successful state CAS. A CAS conflict leaves recovery pending. Matching published identity ends the loop. The actual controller path is tested with the real GitHub adapter over synthetic transport and an injected close503.
- The trusted browser cache is explicit in both installation and consuming workflow steps and forwarded only to verification children after absolute-path validation. Existing native Codex sandbox readiness now requires an actual Chromium DOM/save/reload proof, alongside all prior actual database/egress/filesystem/exit checks. No credential, egress, HOME or TLS relaxation was added.
- Existing candidate2 fixes remain: exact valueless no-store parsing, unique active deployment/convergence, fixed demo source/target/native provenance and artifact digest/live proof, six Actions15368 required checks, preserved human/strict/bypass/default controls and idempotent settings updates.

## Actual local validation

- Full existing CI unit command including Claude review contract tests:334total,331PASS,0FAIL,3native-Windows skips — bug-pipeline-tests.log.
- Runtime/publication/real-adapter/workspace focused command:135PASS,0FAIL — runtime-publication-tests.log.
- Original independent QA1 cache regressions and QA2 publication/close regressions, unchanged:6PASS,0FAIL — independent-regressions.log.
- Actual local readiness HTTP test:1PASS,0FAIL with synthetic configuration and injected dependencies, no PostgreSQL connection — readiness-tests.log.
- Backend TypeScript noEmit:PASS; frontend TypeScript noEmit:PASS; frontend production build:PASS,50.50s — corresponding logs.
- All four workflow YAML documents parse; structural credential/cache/job guards pass. Native actionlint remains unavailable, so no native-actionlint pass is claimed.
- GraphQL AST validation:3/3 actual helper documents valid against official Railway CLIv5.66.0 schema with GraphQL16.11.0, exact schema/source/document hashes saved — railway-graphql-schema-validation.json. No actual Railway API request.
- Contract validator, formatting and git diff --check pass.

Early superseded diagnostic logs (github-boundary-tests.log and focused-publication-tests.log) reflect intermediate fixture iterations; final current-source validation is the full334test and focused135test runs above.

The final19source hashes are in source-hashes.json. Historical candidate1/2 and both QA directories remain unchanged and are recorded in historical-evidence-hashes.json, with original recorded QA hash manifests verified. Source is stable after this handoff.

## Required next gates

Root must start a new dedicated independent QA3 against all19source hashes, rerun acceptance/security/build/test checks and obtain fresh synthetic browser screenshot/trace/video evidence. Historical failed browser evidence is not proof of the fixes. The actual native GitHub job must launch Chromium inside the Codex verification sandbox successfully after publication; no such native pass is claimed locally. Infrastructure bootstrap/main activation, real target-source preflight, actual repository settings application, feature exact-SHA Claude Max review and actual deployed-demo/frontend binding remain later root gates. No issue completion or operational activation is claimed by this handoff.
