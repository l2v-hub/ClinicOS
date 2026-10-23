# Route #486 implementation handoff — amendment 1

Continuation: same reserved round 5, nonce `b9c47bef-ce58-4251-b08d-9a75c3bfd8ea`. Root's append-only authorization receipt is `447-scope-amendment1-receipt.json`; amendment SHA-256: `55c1eda62ffec6f4d4266ada1b8a81564bc49560098528f9a2c6313a321f6f4e`.

Candidate remains `/workspace/ClinicOS/agent-team/.worktrees/bug-batch-447` at HEAD `e14ee2f22c18f1026c63e53b5ce0f5744fb0cfe1`. No commit or parent integration was performed. The first handoff remains unchanged; its SHA-256 is `d32b941449075e95a0141886d3b82ab8a480c246c699b54ef65fece00a970183`.

## Replay compatibility change

A new narrow diary preparation path validates a potential route-less replay while returning the route as absent. Compatibility is limited to `undefined`, `null`, and the empty string, the only values that passed the old scalar validator and then used its oral fallback. Whitespace remains a strict route error; numeric, boolean, object and array values remain invalid. The historical oral value is used only in the existing replay comparison; the request then looks up the composite same-patient/requestId pair inside the existing transaction. Exact prior pairs return unchanged. Changed payloads retain the existing replay-conflict behavior. A missing pair proceeds to the shared create helper, which still rejects the missing route before any create/write. Lookup errors propagate and cannot fall through to create. Existing operator and patient-scope gates, authoritative author lookup, transaction boundary, audit behavior, and the strict shared create validator remain in place.

Added pure coverage confirms route-less replay preparation does not weaken the strict new-create preparer, still validates schedule errors, preserves explicit route values, and rejects whitespace/numeric/boolean/object/array routes. Direct replay comparison tests confirm malformed values cannot match an oral legacy record; only the old-compatible absent/null/empty cases retain oral comparison. The real-Postgres suite now covers no-route and blank-route new requests with no writes, exact route-less replay with no writes, changed-content conflict, cross-patient separation, and explicit `IM` persistence. That DB suite is intentionally deferred until root acquires the coordinated runtime lock.

Root review identified and closed an overly broad missing-route check: only absent/null/empty values now enter the replay-only preparation path. Numeric, boolean, object, array and whitespace values remain invalid or fail exact comparison; they are never rewritten as missing.

Only the three appended production/test paths were added by this amendment: `backend/src/patients/diary-therapy-service.ts`, `backend/src/patients/diary-write-service.ts`, and `backend/src/routes/__tests__/patient-diary-therapy-db.test.ts`. The already authorized pure contract test was extended. All three newly authorized files had hardlink count 1 before editing.

## Verification after amendment

- `patient-diary-therapy-contract.test.ts` with `AUTH_MODE=demo NODE_ENV=test`: **19 passed**.
- `therapy-create.test.ts` pure missing/blank/explicit route case with an unreachable dummy `DATABASE_URL`: **1 passed**; no DB connection attempted.
- `confirm-therapy-validation.test.ts`: **6 passed**.
- Backend `tsc --noEmit -p tsconfig.json`: **passed**.
- Frontend `tsc --noEmit -p tsconfig.app.json` using existing TypeScript 6.0.3: **passed**; both the candidate and workspace lockfiles pin 6.0.3, satisfying the declared `~6.0.2` range. No dependencies were installed.
- `git diff --check`: **passed**.
- Real-Postgres `patient-diary-therapy-db.test.ts`, DB-backed tool test, Prisma build/generation, browser/E2E and full eight-issue QA: **not run**; preserve for root-coordinated integration/QA.

## Frozen source manifest

The current `git diff --binary` SHA-256 is `924346e63d80d1e207751faadc01a120f95f7697432d132f7c02f58347bc9bea`. Per-file working-tree SHA-256 values and the complete twelve-file source allowlist are in `route486-followup-2-manifest.json`. The worktree remains uncommitted for root-owned serial parent integration and fresh independent QA.
